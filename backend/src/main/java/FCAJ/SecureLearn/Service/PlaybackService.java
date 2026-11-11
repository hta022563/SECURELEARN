package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Lesson;
import FCAJ.SecureLearn.Repositories.LessonRepo;
import jakarta.persistence.EntityNotFoundException;
import java.net.URI;
import java.net.URL;
import java.time.Duration;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

@Service
public class PlaybackService {

    private final LessonRepo lessonRepo;
    private final R2Service r2Service;
    private final PlaybackTokenService tokenService;

    @Value("${r2.bucket-name}")
    private String bucketName;

    @Value("${playback.segment-url-ttl-seconds:7200}")
    private long segmentUrlTtlSeconds;

    @Value("${playback.allow-external-https-urls:false}")
    private boolean allowExternalHttpsUrls;

    public PlaybackService(
            LessonRepo lessonRepo,
            R2Service r2Service,
            PlaybackTokenService tokenService) {
        this.lessonRepo = lessonRepo;
        this.r2Service = r2Service;
        this.tokenService = tokenService;
    }

    @Transactional
    public PlaybackDetails createPlayback(UUID lessonId, String contextUrl, String username) {
        Lesson lesson = getLesson(lessonId);

        String location = normalizeLocation(lesson);
        if (isHttpsUrl(location)) {
            if (!allowExternalHttpsUrls) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "External video URLs are disabled for private playback");
            }
            return new PlaybackDetails(location, System.currentTimeMillis() + Duration.ofHours(2).toMillis());
        }

        String objectKey = validateObjectKey(location);
        if (!objectKey.endsWith(".m3u8")) {
            URL signedUrl = r2Service.generatePresignedGetUrl(
                    bucketName, objectKey, Duration.ofSeconds(segmentUrlTtlSeconds));
            return new PlaybackDetails(signedUrl.toString(),
                    System.currentTimeMillis() + Duration.ofSeconds(segmentUrlTtlSeconds).toMillis());
        }

        PlaybackTokenService.IssuedToken token = tokenService.issue(lessonId, username);
        String manifestUrl = UriComponentsBuilder.fromUriString(contextUrl)
                .path("/api/v1/lesson/{lessonId}/manifest")
                .queryParam("token", token.value())
                .buildAndExpand(lessonId)
                .encode()
                .toUriString();
        return new PlaybackDetails(manifestUrl, token.expiresAt() * 1000);
    }

    @Transactional
    public String getSignedManifest(UUID lessonId, String token, String contextUrl, String username) {
        if (!tokenService.isValid(lessonId, token, username)) {
            throw new AccessDeniedException("Playback token for lesson " + lessonId + " is invalid, expired, or belongs to another user");
        }
        Lesson lesson = getLesson(lessonId);
        String playlistKey = validateObjectKey(normalizeLocation(lesson));
        if (!playlistKey.endsWith(".m3u8")) {
            throw new EntityNotFoundException("Lesson " + lessonId + " has no HLS playlist (expected .m3u8, got \"" + playlistKey + "\")");
        }

        String playlist = r2Service.readObjectAsString(bucketName, playlistKey);
        String parentKey = playlistKey.substring(0, playlistKey.lastIndexOf('/') + 1);
        StringBuilder rewritten = new StringBuilder();
        for (String line : playlist.split("\\R", -1)) {
            String trimmed = line.trim();
            if (trimmed.startsWith("#EXT-X-KEY:")) {
                rewritten.append(rewriteKeyUri(line, lessonId, token, contextUrl));
            } else if (!trimmed.isEmpty() && !trimmed.startsWith("#")) {
                String segmentKey = resolveSegmentKey(trimmed, parentKey);
                int numberStart = segmentKey.lastIndexOf("segment_");
                int numberEnd = segmentKey.lastIndexOf(".ts");
                if (numberStart == -1 || numberEnd == -1) {
                    throw new IllegalArgumentException("HLS segment \"" + segmentKey + "\" does not match the expected segment_NNN.ts naming");
                }
                numberStart += "segment_".length();
                int segmentIndex = Integer.parseInt(segmentKey.substring(numberStart, numberEnd));
                String signedSegment = UriComponentsBuilder.fromUriString(contextUrl)
                        .path("/api/v1/lesson/{lessonId}/segment/{segmentIndex}")
                        .queryParam("token", token)
                        .buildAndExpand(lessonId, segmentIndex)
                        .encode()
                        .toUriString();
                rewritten.append(signedSegment);
            } else {
                rewritten.append(line);
            }
            rewritten.append('\n');
        }
        return rewritten.toString();
    }

    // Proxies the segment through the backend (instead of redirecting to a presigned R2 URL)
    // so the browser never talks to R2 directly: no R2 CORS issues, and every segment hit is logged here.
    public byte[] getSegmentBytes(int segmentIndex, UUID lessonId, String token, String username) {
        if (!tokenService.isValid(lessonId, token, username)) {
            throw new AccessDeniedException("Playback token for lesson " + lessonId + " is invalid, expired, or belongs to another user");
        }
        Lesson lesson = getLesson(lessonId);
        String playlistKey = validateObjectKey(normalizeLocation(lesson));
        if (!playlistKey.endsWith(".m3u8")) {
            throw new EntityNotFoundException("Lesson " + lessonId + " has no HLS playlist (expected .m3u8, got \"" + playlistKey + "\")");
        }
        if (segmentIndex < 0) {
            throw new IllegalArgumentException("Segment index must be 0 or greater, got " + segmentIndex);
        }
        String parentKey = playlistKey.substring(0, playlistKey.lastIndexOf('/') + 1);
        String r2Key = parentKey + String.format("segment_%03d.ts", segmentIndex);
        try {
            return r2Service.readObjectAsBytes(bucketName, r2Key);
        } catch (IllegalStateException e) {
            if (e.getCause() instanceof NoSuchKeyException) {
                throw new EntityNotFoundException("Segment " + segmentIndex + " not found for lesson " + lessonId);
            }
            throw e;
        }
    }

    public byte[] getContentKey(UUID lessonId, String token, String username) {
        if (!tokenService.isValid(lessonId, token, username)) {
            throw new AccessDeniedException("Playback token for lesson " + lessonId + " is invalid, expired, or belongs to another user");
        }
        Lesson lesson = getLesson(lessonId);
        String playlistKey = validateObjectKey(normalizeLocation(lesson));
        if (!playlistKey.endsWith(".m3u8")) {
            throw new EntityNotFoundException("Lesson " + lessonId + " has no HLS playlist (expected .m3u8, got \"" + playlistKey + "\")");
        }
        String keyObjectKey = playlistKey.substring(0, playlistKey.lastIndexOf('/') + 1) + "content.key";
        byte[] contentKey = r2Service.readObjectAsBytes(bucketName, keyObjectKey);
        if (contentKey.length != 16) {
            throw new IllegalStateException("Stored HLS AES-128 key for lesson " + lessonId + " must be 16 bytes, got " + contentKey.length);
        }
        return contentKey;
    }

    private String rewriteKeyUri(String line, UUID lessonId, String token, String contextUrl) {
        String trimmed = line.trim();
        if (!trimmed.startsWith("#EXT-X-KEY:METHOD=AES-128,")) {
            throw new IllegalArgumentException("Unsupported HLS encryption method");
        }
        int uriStart = line.indexOf("URI=\"");
        if (uriStart < 0) {
            throw new IllegalArgumentException("Encrypted HLS playlist has no key URI");
        }
        int valueStart = uriStart + 5;
        int valueEnd = line.indexOf('"', valueStart);
        if (valueEnd < 0 || !"securelearn-key".equals(line.substring(valueStart, valueEnd))) {
            throw new IllegalArgumentException("Encrypted HLS playlist references an unsupported key");
        }
        String keyUrl = UriComponentsBuilder.fromUriString(contextUrl)
                .path("/api/v1/lesson/{lessonId}/key")
                .queryParam("token", token)
                .buildAndExpand(lessonId)
                .encode()
                .toUriString();
        return line.substring(0, valueStart) + keyUrl + line.substring(valueEnd);
    }

    private Lesson getLesson(UUID lessonId) {
        return lessonRepo.findById(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("No lesson found with id " + lessonId));
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
            throw new EntityNotFoundException("Lesson " + lesson.getId() + " has no video location set");
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Lesson video key \"" + objectKey + "\" is not under hls/ or videos/");
        }
        for (String part : objectKey.split("/")) {
            if (part.equals("..") || part.equals(".")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "R2 object key \"" + objectKey + "\" contains a . or .. path segment");
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

    public record PlaybackDetails(String playbackUrl, long expiresAt) {

    }
}
