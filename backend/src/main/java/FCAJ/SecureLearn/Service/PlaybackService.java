package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Lesson;
import FCAJ.SecureLearn.repositories.LessonRepo;
import jakarta.persistence.EntityNotFoundException;
import java.net.URI;
import java.net.URL;
import java.time.Duration;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class PlaybackService {
    private final LessonRepo lessonRepo;
    private final R2Service r2Service;
    private final CourseEntitlementService entitlementService;
    private final PlaybackTokenService tokenService;

    @Value("${r2.bucket-name}")
    private String bucketName;

    @Value("${playback.segment-url-ttl-seconds:7200}")
    private long segmentUrlTtlSeconds;

    public PlaybackService(
            LessonRepo lessonRepo,
            R2Service r2Service,
            CourseEntitlementService entitlementService,
            PlaybackTokenService tokenService) {
        this.lessonRepo = lessonRepo;
        this.r2Service = r2Service;
        this.entitlementService = entitlementService;
        this.tokenService = tokenService;
    }

    @Transactional
    public PlaybackDetails createPlayback(UUID lessonId, Jwt jwt, String contextUrl) {
        Lesson lesson = getLesson(lessonId);
        UUID courseId = lesson.getChapter().getCourse().getId();
        if (!hasPrivilegedRole(jwt) && !entitlementService.hasAccess(jwt.getSubject(), courseId)) {
            throw new AccessDeniedException("You are not entitled to play this course");
        }

        String location = normalizeLocation(lesson);
        if (isHttpsUrl(location)) {
            return new PlaybackDetails(location, System.currentTimeMillis() + Duration.ofHours(2).toMillis());
        }

        String objectKey = validateObjectKey(location);
        if (!objectKey.endsWith(".m3u8")) {
            URL signedUrl = r2Service.generatePresignedGetUrl(
                    bucketName, objectKey, Duration.ofSeconds(segmentUrlTtlSeconds));
            return new PlaybackDetails(signedUrl.toString(),
                    System.currentTimeMillis() + Duration.ofSeconds(segmentUrlTtlSeconds).toMillis());
        }

        PlaybackTokenService.IssuedToken token = tokenService.issue(lessonId);
        String manifestUrl = UriComponentsBuilder.fromUriString(contextUrl)
                .path("/api/v1/lesson/{lessonId}/manifest")
                .queryParam("token", token.value())
                .buildAndExpand(lessonId)
                .encode()
                .toUriString();
        return new PlaybackDetails(manifestUrl, token.expiresAt() * 1000);
    }

    @Transactional
    public String getSignedManifest(UUID lessonId, String token) {
        if (!tokenService.isValid(lessonId, token)) {
            throw new AccessDeniedException("Playback token is invalid or expired");
        }
        Lesson lesson = getLesson(lessonId);
        String playlistKey = validateObjectKey(normalizeLocation(lesson));
        if (!playlistKey.endsWith(".m3u8")) {
            throw new EntityNotFoundException("HLS playlist not found");
        }

        String playlist = r2Service.readObjectAsString(bucketName, playlistKey);
        String parentKey = playlistKey.substring(0, playlistKey.lastIndexOf('/') + 1);
        StringBuilder rewritten = new StringBuilder();
        for (String line : playlist.split("\\R", -1)) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty() && !trimmed.startsWith("#")) {
                String segmentKey = resolveSegmentKey(trimmed, parentKey);
                URL signedSegment = r2Service.generatePresignedGetUrl(
                        bucketName, segmentKey, Duration.ofSeconds(segmentUrlTtlSeconds));
                rewritten.append(signedSegment);
            } else {
                rewritten.append(line);
            }
            rewritten.append('\n');
        }
        return rewritten.toString();
    }

    private Lesson getLesson(UUID lessonId) {
        return lessonRepo.findById(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Lesson not found"));
    }

    private String normalizeLocation(Lesson lesson) {
        String location = lesson.getUrl();
        String oldObjectKey = r2Service.objectKeyFromPublicUrl(location);
        if (oldObjectKey != null) {
            lesson.setUrl(oldObjectKey);
            lessonRepo.save(lesson);
            return oldObjectKey;
        }
        if (location == null || location.isBlank()) {
            throw new EntityNotFoundException("Lesson has no video location");
        }
        return location;
    }

    private String validateObjectKey(String value) {
        String objectKey = r2Service.objectKeyFromPublicUrl(value);
        if (objectKey == null) {
            objectKey = value;
        }
        if (objectKey.startsWith("/") || objectKey.contains("\\")
                || !objectKey.startsWith("hls/") && !objectKey.startsWith("videos/")) {
            throw new IllegalArgumentException("Lesson does not reference a supported R2 object");
        }
        for (String part : objectKey.split("/")) {
            if (part.equals("..") || part.equals(".")) {
                throw new IllegalArgumentException("Invalid R2 object key");
            }
        }
        return objectKey;
    }

    private String resolveSegmentKey(String reference, String parentKey) {
        String fromPublicUrl = r2Service.objectKeyFromPublicUrl(reference);
        if (fromPublicUrl != null) {
            if (!fromPublicUrl.startsWith(parentKey)) {
                throw new IllegalArgumentException("HLS segment is outside its playlist directory");
            }
            return validateObjectKey(fromPublicUrl);
        }
        if (URI.create(reference).isAbsolute()) {
            throw new IllegalArgumentException("HLS playlist contains an unsupported external segment URL");
        }
        String normalized = reference.startsWith("/") ? reference.substring(1) : parentKey + reference;
        String segmentKey = validateObjectKey(normalized);
        if (!segmentKey.startsWith(parentKey)) {
            throw new IllegalArgumentException("HLS segment is outside its playlist directory");
        }
        return segmentKey;
    }

    private boolean isHttpsUrl(String value) {
        return value.startsWith("https://") && r2Service.objectKeyFromPublicUrl(value) == null;
    }

    private boolean hasPrivilegedRole(Jwt jwt) {
        var groups = jwt.getClaimAsStringList("cognito:groups");
        return groups != null && groups.stream()
                .map(String::toLowerCase)
                .anyMatch(role -> role.equals("admin") || role.equals("instructor"));
    }

    public record PlaybackDetails(String playbackUrl, long expiresAt) {
    }
}