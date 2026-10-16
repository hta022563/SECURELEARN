package FCAJ.SecureLearn.Controller;

import java.net.URL;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import FCAJ.SecureLearn.Request.VideoUploadRequest;
import FCAJ.SecureLearn.Service.LessonService;
import FCAJ.SecureLearn.Service.R2Service;
import FCAJ.SecureLearn.Service.VideoProcessingService;

/**
 * Handles the video upload pipeline:
 *
 *  Step 1 — POST /api/v1/upload/presign
 *    Browser asks for a presigned PUT URL so it can upload the raw file
 *    directly to Cloudflare R2 without routing through the backend.
 *    Returns: { uploadUrl, objectKey }
 *
 *  Step 2 — browser PUTs the file to R2 using the uploadUrl (no backend call)
 *
 *  Step 3 — POST /api/v1/upload/process
 *    Browser tells the backend the upload is done.
 *    Backend downloads the raw file from R2, runs FFmpeg → HLS, uploads
 *    the segments + playlist back to R2, creates the Lesson record, and
 *    stores the private playlist object key on the lesson and returns its ID.
 *    Returns: { lessonId }
 */
@RestController
@RequestMapping("/api/v1/upload")
public class UploadController {
    private static final Logger log = LoggerFactory.getLogger(UploadController.class);

    private final R2Service r2Service;
    private final VideoProcessingService processingService;
    private final LessonService lessonService;

    @Value("${r2.bucket-name}")
    private String bucketName;

    public UploadController(R2Service r2Service,
                            VideoProcessingService processingService,
                            LessonService lessonService) {
        this.r2Service = r2Service;
        this.processingService = processingService;
        this.lessonService = lessonService;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 1: generate a presigned PUT URL for direct browser → R2 upload
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/upload/presign
     *
     * Request body:
     * {
     *   "fileName":    "lecture1.mp4",
     *   "contentType": "video/mp4",
     *   "courseId":    "uuid"
     * }
     *
     * Response:
     * {
     *   "uploadUrl":  "https://r2.presigned...",   ← browser PUTs the file here
     *   "objectKey":  "videos/courseId/ts_lecture1.mp4"  ← pass this to /process
     * }
     */
    @PostMapping("/presign")
    public ResponseEntity<?> presign(@RequestBody VideoUploadRequest request) {
        if (request.getFileName() == null || request.getFileName().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "fileName is required"));
        }
        if (request.getContentType() == null || request.getContentType().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "contentType is required"));
        }
        if (request.getCourseId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "courseId is required"));
        }
        if (!request.getContentType().toLowerCase().startsWith("video/")) {
            return ResponseEntity.badRequest().body(Map.of("error", "contentType must be a video MIME type"));
        }

        // Namespace the object key so files from different courses don't collide
        String sanitized = request.getFileName()
                .replaceAll("[^a-zA-Z0-9._-]", "_")
                .toLowerCase();
        String objectKey = "videos/" + request.getCourseId() + "/"
            + System.currentTimeMillis() + "_" + sanitized;

        try {
            URL presignedUrl = r2Service.generatePresignedPutUrl(
                    bucketName,
                    objectKey,
                    Duration.ofMinutes(15),   // 15 minutes to complete the upload
                    request.getContentType()
            );

            return ResponseEntity.ok(Map.of(
                    "uploadUrl", presignedUrl.toString(),
                    "objectKey", objectKey
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to generate upload URL: " + e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 3: transcode to HLS, upload segments to R2, create the lesson
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/upload/process
     *
     * Called by the browser after the raw file has been PUT to R2.
     *
     * Request body:
     * {
     *   "objectKey":   "videos/courseId/ts_lecture1.mp4",  ← from presign response
     *   "title":       "Lecture 1 - Introduction",
     *   "description": "Overview of the course",
     *   "chapterId":   "uuid",
     *   "courseId":    "uuid"
     * }
     *
    * Response: { "lessonId": "uuid" }
     *
     * This call blocks while FFmpeg runs — for long videos consider making
     * this async and polling a status endpoint instead.
     */
    @PostMapping("/process")
    public ResponseEntity<?> process(@RequestBody Map<String, String> body) {
        String objectKey   = body.get("objectKey");
        String title       = body.get("title");
        String description = body.get("description");
        String chapterIdStr = body.get("chapterId");
        String courseIdStr  = body.get("courseId");
        String existingLessonId = body.get("lessonId");
        boolean replacingLesson = existingLessonId != null && !existingLessonId.isBlank();

        // ── Validate required fields ──────────────────────────────────────
        if (objectKey == null || objectKey.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "objectKey is required"));
        if (title == null || title.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "title is required"));
        if (description == null || description.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "description is required"));
        if (!replacingLesson && (chapterIdStr == null || chapterIdStr.isBlank()))
            return ResponseEntity.badRequest().body(Map.of("error", "chapterId is required"));
        if (courseIdStr == null || courseIdStr.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "courseId is required"));

        UUID chapterId = null;
        UUID courseId;
        UUID lessonIdToReplace = null;
        try {
            courseId  = UUID.fromString(courseIdStr);
            if (chapterIdStr != null && !chapterIdStr.isBlank()) {
                chapterId = UUID.fromString(chapterIdStr);
            }
            if (replacingLesson) {
                lessonIdToReplace = UUID.fromString(existingLessonId);
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid UUID format in upload request"));
        }

        if (!isCourseUploadKey(objectKey, courseId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "objectKey must belong to the supplied course"));
        }

        try {
            lessonService.validateUploadTarget(chapterId, courseId, lessonIdToReplace);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }

        try {
            String playlistKey = processingService.processToHls(objectKey);
            UUID lessonId;
            if (replacingLesson) {
                lessonId = lessonIdToReplace;
                lessonService.updateLesson(courseId, lessonId, title, description, playlistKey);
            } else {
                lessonId = lessonService.addLessonReturningId(
                    chapterId, title, description, playlistKey, courseId);
            }

            try {
                r2Service.deleteObject(bucketName, objectKey);
            } catch (RuntimeException cleanupError) {
                log.warn("Processed video source could not be deleted from R2: {}", objectKey, cleanupError);
            }

            return ResponseEntity.ok(Map.of(
                    "lessonId", lessonId.toString()
            ));

        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Processing failed: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Unexpected error during processing"));
        }
    }

    private boolean isCourseUploadKey(String objectKey, UUID courseId) {
        String prefix = "videos/" + courseId + "/";
        if (!objectKey.startsWith(prefix) || objectKey.contains("\\")) {
            return false;
        }
        for (String part : objectKey.substring(prefix.length()).split("/")) {
            if (part.isBlank() || part.equals(".") || part.equals("..")) {
                return false;
            }
        }
        return true;
    }
}
