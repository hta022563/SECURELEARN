package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Lesson;
import FCAJ.SecureLearn.Model.VideoStatus;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Turns an uploaded raw video into a lesson's HLS video, with one of two processors
 * (video.processor):
 *
 *  - ffmpeg       (default, local docker-compose): runs FFmpeg inside the request, as before.
 *                 The lesson is READY when the request returns.
 *  - mediaconvert (Lambda): submits a MediaConvert job and returns at once with the lesson
 *                 PROCESSING. Nothing is notified when the job ends; instead refresh() asks
 *                 MediaConvert whenever someone checks the status (GET /upload/status/{id}).
 */
@Service
@Profile("upload")
public class LessonVideoService {
    private static final Logger log = LoggerFactory.getLogger(LessonVideoService.class);

    private final LessonService lessonService;
    private final R2Service r2Service;
    private final VideoProcessingService ffmpeg;
    private final MediaConvertService mediaConvert;

    @Value("${video.processor:ffmpeg}")
    private String processor;

    @Value("${s3.bucket-name}")
    private String bucketName;

    public LessonVideoService(LessonService lessonService, R2Service r2Service,
            VideoProcessingService ffmpeg, MediaConvertService mediaConvert) {
        this.lessonService = lessonService;
        this.r2Service = r2Service;
        this.ffmpeg = ffmpeg;
        this.mediaConvert = mediaConvert;
    }

    /**
     * Starts processing objectKey into a new lesson (lessonIdToReplace == null) or into an
     * existing one. The caller has already validated the course/chapter/lesson and the key.
     */
    public Started start(String objectKey, String title, String description,
            UUID chapterId, UUID courseId, UUID lessonIdToReplace) throws Exception {
        if ("mediaconvert".equalsIgnoreCase(processor)) {
            String label = lessonIdToReplace == null ? "new" : lessonIdToReplace.toString();
            MediaConvertService.SubmittedJob job = mediaConvert.submit(objectKey, label);
            UUID lessonId;
            if (lessonIdToReplace != null) {
                lessonId = lessonIdToReplace;
                lessonService.markReplacementProcessing(courseId, lessonId, title, description,
                        job.jobId(), job.playlistKey(), objectKey);
            } else {
                lessonId = lessonService.addProcessingLesson(chapterId, title, description, courseId,
                        job.jobId(), job.playlistKey(), objectKey);
            }
            return new Started(lessonId, VideoStatus.PROCESSING);
        }

        // FFmpeg: blocking, same behaviour as before the MediaConvert switch
        String playlistKey = ffmpeg.processToHls(objectKey);
        UUID lessonId;
        if (lessonIdToReplace != null) {
            lessonId = lessonIdToReplace;
            lessonService.replaceLessonVideo(courseId, lessonId, title, description, playlistKey);
        } else {
            lessonId = lessonService.addLessonReturningId(chapterId, title, description, playlistKey, courseId);
        }
        deleteRawUpload(objectKey);
        return new Started(lessonId, VideoStatus.READY);
    }

    /**
     * Returns the lesson's video status, first asking MediaConvert about a running job and
     * recording the result. Safe to call repeatedly (the frontend polls it).
     */
    public Status refresh(UUID lessonId) {
        Lesson lesson = lessonService.getLessonInfo(lessonId);
        if (lesson.getVideoStatus() != VideoStatus.PROCESSING || lesson.getProcessingJobId() == null) {
            return Status.of(lesson);
        }
        // Checked whatever video.processor is, so a job started on Lambda can also finish
        // from a local backend that has AWS credentials.
        MediaConvertService.JobState state = mediaConvert.checkJob(lesson.getProcessingJobId());
        switch (state.outcome()) {
            case COMPLETE -> deleteRawUpload(lessonService.completeProcessing(lessonId));
            case FAILED -> lessonService.failProcessing(lessonId, state.error());
            case RUNNING -> { }
        }
        return Status.of(lessonService.getLessonInfo(lessonId));
    }

    private void deleteRawUpload(String objectKey) {
        if (objectKey == null) {
            return;
        }
        try {
            r2Service.deleteObject(bucketName, objectKey);
        } catch (RuntimeException e) {
            log.warn("Processed video source could not be deleted: {}", objectKey, e);
        }
    }

    public record Started(UUID lessonId, VideoStatus status) {
    }

    public record Status(UUID lessonId, VideoStatus status, String error) {
        static Status of(Lesson lesson) {
            return new Status(lesson.getId(), lesson.getVideoStatus(), lesson.getProcessingError());
        }
    }
}
