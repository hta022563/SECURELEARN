package FCAJ.SecureLearn.Service;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import FCAJ.SecureLearn.Model.Lesson;
import FCAJ.SecureLearn.Repositories.LessonRepo;
import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Manifest rewriting and segment lookup for both HLS layouts the upload pipeline produces:
 * FFmpeg (one playlist, segment_000.ts) and MediaConvert (master -> rendition playlist,
 * master_video_00001.ts). No Spring context, S3 or database: S3 is a map, the repo a proxy.
 */
class PlaybackServiceManifestTest {

    private static final String BASE = "https://api.example.com";
    private final UUID lessonId = UUID.randomUUID();
    private final Map<String, byte[]> s3 = new HashMap<>();
    private final PlaybackTokenService tokens = new PlaybackTokenService("test-secret", 3600);

    @Test
    void ffmpegPlaylistIsRewrittenAndSegmentsFoundByPosition() throws Exception {
        String dir = "hls/course/1_lecture/";
        put(dir + "master.m3u8", """
                #EXTM3U
                #EXT-X-VERSION:3
                #EXT-X-TARGETDURATION:6
                #EXT-X-KEY:METHOD=AES-128,URI="securelearn-key"
                #EXTINF:6.0,
                segment_000.ts
                #EXTINF:6.0,
                segment_001.ts
                #EXT-X-ENDLIST
                """);
        s3.put(dir + "segment_001.ts", new byte[] {1, 2, 3});
        PlaybackService service = service(dir + "master.m3u8");
        String token = tokens.issue(lessonId, "alice").value();

        String manifest = service.getSignedManifest(lessonId, token, BASE, "alice");

        assertTrue(manifest.contains(BASE + "/api/v1/lesson/" + lessonId + "/key?token="), manifest);
        assertTrue(manifest.contains("/segment/0?token="), manifest);
        assertTrue(manifest.contains("/segment/1?token="), manifest);
        assertFalse(manifest.contains("segment_000.ts"), manifest);
        assertArrayEquals(new byte[] {1, 2, 3}, service.getSegmentBytes(1, lessonId, token, "alice"));
    }

    @Test
    void mediaConvertMasterIsFollowedToItsRenditionPlaylist() throws Exception {
        String dir = "hls/course/2_lecture/";
        put(dir + "master.m3u8", """
                #EXTM3U
                #EXT-X-VERSION:3
                #EXT-X-INDEPENDENT-SEGMENTS
                #EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"
                master_video.m3u8
                """);
        put(dir + "master_video.m3u8", """
                #EXTM3U
                #EXT-X-VERSION:3
                #EXT-X-TARGETDURATION:6
                #EXT-X-KEY:METHOD=AES-128,URI="securelearn-key",IV=0x00000000000000000000000000000001
                #EXTINF:6.006,
                master_video_00001.ts
                #EXTINF:6.006,
                master_video_00002.ts
                #EXTINF:3.003,
                master_video_00003.ts
                #EXT-X-ENDLIST
                """);
        s3.put(dir + "master_video_00003.ts", new byte[] {9});
        PlaybackService service = service(dir + "master.m3u8");
        String token = tokens.issue(lessonId, "alice").value();

        String manifest = service.getSignedManifest(lessonId, token, BASE, "alice");

        assertFalse(manifest.contains("#EXT-X-STREAM-INF"), "player should get the rendition playlist, not the master");
        assertTrue(manifest.contains("IV=0x00000000000000000000000000000001"), "IV must be kept");
        assertTrue(manifest.contains("/key?token="), manifest);
        assertTrue(manifest.contains("/segment/2?token="), manifest);
        assertFalse(manifest.contains("master_video_0000"), manifest);
        // Position 2 = the third segment, whatever its file is called
        assertArrayEquals(new byte[] {9}, service.getSegmentBytes(2, lessonId, token, "alice"));
    }

    // ── fakes ────────────────────────────────────────────────────────────────

    private void put(String key, String text) {
        s3.put(key, text.getBytes(StandardCharsets.UTF_8));
    }

    private PlaybackService service(String playlistKey) throws Exception {
        Lesson lesson = new Lesson(null, "t", "d", playlistKey);
        lesson.setId(lessonId);
        LessonRepo repo = (LessonRepo) Proxy.newProxyInstance(
                LessonRepo.class.getClassLoader(), new Class<?>[] {LessonRepo.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "findById" -> Optional.of(lesson);
                    case "save" -> args[0];
                    default -> throw new UnsupportedOperationException(method.getName());
                });
        R2Service r2 = new R2Service(null, null) {
            @Override
            public String readObjectAsString(String bucket, String key) {
                return new String(readObjectAsBytes(bucket, key), StandardCharsets.UTF_8);
            }

            @Override
            public byte[] readObjectAsBytes(String bucket, String key) {
                byte[] value = s3.get(key);
                if (value == null) {
                    throw new IllegalStateException("missing " + key);
                }
                return value;
            }

            @Override
            public String objectKeyFromPublicUrl(String value) {
                return null;
            }
        };
        PlaybackService service = new PlaybackService(repo, r2, tokens);
        setField(service, "bucketName", "bucket");
        return service;
    }

    private static void setField(Object target, String name, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(name);
        field.setAccessible(true);
        field.set(target, value);
    }
}
