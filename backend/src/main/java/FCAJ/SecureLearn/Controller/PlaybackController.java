package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Configuration.LogAnnotationClass;
import FCAJ.SecureLearn.Model.ActionType;
import FCAJ.SecureLearn.Service.AuthService;
import FCAJ.SecureLearn.Service.CourseService;
import FCAJ.SecureLearn.Service.EnrollmentService;
import FCAJ.SecureLearn.Service.PlaybackService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

// {id} in the base path is the lesson id; LogInterceptor reads it under the name "id"
@RestController
@RequestMapping("/api/v1/lesson/{id}")
public class PlaybackController {
    // FFmpeg writes HLS segments as MPEG-TS (segment_%03d.ts)
    private static final MediaType MPEG_TS = MediaType.parseMediaType("video/mp2t");

    private final PlaybackService playbackService;
    private final AuthService authService;
    private final EnrollmentService enrollmentService;
    private final CourseService courseService;

    public PlaybackController(PlaybackService playbackService, AuthService authService,
            EnrollmentService enrollmentService, CourseService courseService) {
        this.playbackService = playbackService;
        this.authService = authService;
        this.enrollmentService = enrollmentService;
        this.courseService = courseService;
    }

    @GetMapping("/playback")
    @LogAnnotationClass(ActionType.PLAYBACK)
    public ResponseEntity<?> createPlayback(
            @PathVariable("id") UUID lessonId,
            HttpServletRequest servletRequest,
            @AuthenticationPrincipal Jwt jwt) {
        String contextUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                .build()
                .toUriString();
        String username = jwt.getClaimAsString("username");
        List<String> userGroups = jwt.getClaimAsStringList("cognito:groups");
        boolean isStudent = userGroups != null
                && userGroups.stream().anyMatch(group -> group.equalsIgnoreCase("Student"));
        if (isStudent) {
            String studentEmail = authService.getEmailByUsername(username);
            UUID courseId = courseService.getCourseByLessonId(lessonId).getId();
            if (!enrollmentService.isEnrolledInCourse(studentEmail, courseId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "error", "Student " + studentEmail + " is not enrolled in course " + courseId
                                + " (requested lesson " + lessonId + ")"));
            }
        }

        PlaybackService.PlaybackDetails playbackDetails = playbackService.createPlayback(lessonId, contextUrl, username);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(Map.of("playbackUrl", playbackDetails.playbackUrl(), "expiresAt", playbackDetails.expiresAt()));
    }

    @GetMapping(value = "/manifest", produces = "application/vnd.apple.mpegurl")
    @LogAnnotationClass(ActionType.MANIFEST_REQUEST)
    public ResponseEntity<String> getManifest(
            @PathVariable("id") UUID lessonId,
            @RequestParam String token,
            @AuthenticationPrincipal Jwt jwt,
            HttpServletRequest servletRequest) {
        String contextUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                .build()
                .toUriString();
        String signedManifest = playbackService.getSignedManifest(lessonId, token, contextUrl, jwt.getClaimAsString("username"));

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.apple.mpegurl"))
                .cacheControl(CacheControl.noStore())
                .body(signedManifest);
    }

    @GetMapping(value = "/key", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    @LogAnnotationClass(ActionType.KEY_REQUEST)
    public ResponseEntity<byte[]> getContentKey(
            @PathVariable("id") UUID lessonId,
            @RequestParam String token,
            @AuthenticationPrincipal Jwt jwt,
            HttpServletRequest servletRequest) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(playbackService.getContentKey(lessonId, token, jwt.getClaimAsString("username")));
    }

    @GetMapping("/segment/{segmentId}")
    @LogAnnotationClass(ActionType.SEGMENT_REQUEST)
    public ResponseEntity<?> getSegment(
            @PathVariable("id") UUID lessonId,
            @PathVariable int segmentId,
            @RequestParam String token,
            @AuthenticationPrincipal Jwt jwt,
            HttpServletRequest servletRequest) {
        // AccessDeniedException (bad/expired token) is left to propagate so Spring Security returns 403
        try {
            byte[] segment = playbackService.getSegmentBytes(segmentId, lessonId, token, jwt.getClaimAsString("username"));
            return ResponseEntity.ok()
                    .contentType(MPEG_TS)
                    .contentLength(segment.length)
                    .cacheControl(CacheControl.noStore())
                    .body(segment);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Could not load segment " + segmentId + " from storage"));
        }
    }
}
