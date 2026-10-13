package FCAJ.SecureLearn.Service;

import io.awspring.cloud.s3.S3Template;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Comparator;
import java.util.stream.Stream;

/**
 * Downloads a raw video from R2, transcodes it to HLS with FFmpeg,
 * uploads the resulting segments + playlist back to R2, then cleans up.
 *
 * Prerequisites: ffmpeg must be available on the system PATH (added to Dockerfile).
 *
 * HLS output layout in R2:
 *   hls/{baseKey}/master.m3u8        <- the playlist key stored on the lesson
 *   hls/{baseKey}/content.key
 *   hls/{baseKey}/segment_000.ts
 *   hls/{baseKey}/segment_001.ts
 *   ...
 */
@Service
public class VideoProcessingService {

    private final S3Template s3Template;

    @Value("${r2.bucket-name}")
    private String bucketName;

    public VideoProcessingService(
            @Qualifier("r2S3Template") S3Template s3Template) {
        this.s3Template = s3Template;
    }

    /**
    * Full pipeline: download raw video, encrypt HLS output, and return its playlist key.
     *
     * @param rawObjectKey  the R2 object key of the uploaded raw video,
     *                      e.g. "videos/courseId/1234567890_lecture1.mp4"
    * @return the R2 object key of the HLS playlist.
     */
    public String processToHls(String rawObjectKey) throws IOException, InterruptedException {
        // Derive a base key for the HLS output from the raw object key
        // e.g. "videos/courseId/1234567890_lecture1.mp4" → "hls/courseId/1234567890_lecture1"
        String baseKey = rawObjectKey
                .replaceFirst("^videos/", "hls/")
                .replaceAll("\\.[^.]+$", ""); // strip extension

        Path workDir = Files.createTempDirectory("hls-");
        try {
            // ── 1. Download raw file from R2 ────────────────────────────────
            Path rawFile = workDir.resolve("input.mp4");
            try (InputStream in = s3Template.download(bucketName, rawObjectKey).getInputStream()) {
                Files.copy(in, rawFile);
            }

            // ── 2. Run FFmpeg to produce HLS segments ────────────────────────
            //
            // -hls_time 6         : 6-second segments (standard for streaming)
            // -hls_list_size 0    : keep all segments in the playlist (VOD)
            // -hls_segment_type mpegts : standard .ts segments
            // -c:v libx264        : re-encode video to H.264 for broad compatibility
            // -crf 23             : constant quality (lower = better, 18-28 is typical)
            // -preset fast        : encoding speed/quality tradeoff
            // -c:a aac            : re-encode audio to AAC
            // -b:a 128k           : audio bitrate
            // -f hls              : output format
            //
            Path playlistFile = workDir.resolve("master.m3u8");
            Path segmentPattern = workDir.resolve("segment_%03d.ts");
            Path keyFile = workDir.resolve("content.key");
            Path keyInfoFile = workDir.resolve("key-info.txt");
            byte[] contentKey = new byte[16];
            new SecureRandom().nextBytes(contentKey);
            Files.write(keyFile, contentKey);
            Files.writeString(keyInfoFile, "securelearn-key\n" + keyFile.toAbsolutePath() + "\n");

            ProcessBuilder pb = new ProcessBuilder(
                    "ffmpeg", "-y",
                    "-i", rawFile.toAbsolutePath().toString(),
                    "-c:v", "libx264",
                    "-crf", "23",
                    "-preset", "fast",
                    "-c:a", "aac",
                    "-b:a", "128k",
                    "-hls_time", "6",
                    "-hls_list_size", "0",
                    "-hls_segment_type", "mpegts",
                    "-hls_key_info_file", keyInfoFile.toAbsolutePath().toString(),
                    "-hls_segment_filename", segmentPattern.toAbsolutePath().toString(),
                    "-f", "hls",
                    playlistFile.toAbsolutePath().toString()
            );
            pb.redirectErrorStream(true);
            pb.redirectOutput(workDir.resolve("ffmpeg.log").toFile());

            Process process = pb.start();
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                String log = Files.readString(workDir.resolve("ffmpeg.log"));
                throw new RuntimeException("FFmpeg failed (exit " + exitCode + "):\n" + log);
            }

            // ── 3. Upload all .ts segments to R2 ────────────────────────────
            try (Stream<Path> files = Files.list(workDir)) {
                files.filter(p -> p.toString().endsWith(".ts"))
                     .forEach(segment -> {
                         String segKey = baseKey + "/" + segment.getFileName().toString();
                         uploadFile(segment, segKey, "video/MP2T");
                     });
            }

            String keyObjectKey = baseKey + "/content.key";
            uploadBytes(contentKey, keyObjectKey, "application/octet-stream");
            Arrays.fill(contentKey, (byte) 0);

            // Keep segment references relative; playback signs each segment URL.
            String playlistKey = baseKey + "/master.m3u8";
            uploadFile(playlistFile, playlistKey, "application/vnd.apple.mpegurl");

            return playlistKey;

        } finally {
            // Clean up the local temp directory regardless of success or failure
            deleteDirectory(workDir);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void uploadFile(Path file, String objectKey, String contentType) {
        try (InputStream in = Files.newInputStream(file)) {
            s3Template.upload(bucketName, objectKey, in,
                    io.awspring.cloud.s3.ObjectMetadata.builder()
                            .contentType(contentType)
                            .build());
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload " + objectKey + " to R2", e);
        }
    }

    private void uploadBytes(byte[] data, String objectKey, String contentType) {
        try (InputStream in = new java.io.ByteArrayInputStream(data)) {
            s3Template.upload(bucketName, objectKey, in,
                    io.awspring.cloud.s3.ObjectMetadata.builder()
                            .contentType(contentType)
                            .build());
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload " + objectKey + " to R2", e);
        }
    }

    private void deleteDirectory(Path dir) {
        try (Stream<Path> walk = Files.walk(dir)) {
            walk.sorted(Comparator.reverseOrder())
                .forEach(p -> {
                    try { Files.deleteIfExists(p); }
                    catch (IOException ignored) {}
                });
        } catch (IOException ignored) {}
    }
}
