package FCAJ.SecureLearn.Service;

import io.awspring.cloud.s3.S3Template;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.stream.Stream;

/**
 * Downloads a raw video from R2, transcodes it to HLS with FFmpeg,
 * uploads the resulting segments + playlist back to R2, then cleans up.
 *
 * Prerequisites: ffmpeg must be available on the system PATH (added to Dockerfile).
 *
 * HLS output layout in R2:
 *   hls/{baseKey}/master.m3u8        ← the playlist URL returned to the caller
 *   hls/{baseKey}/segment_000.ts
 *   hls/{baseKey}/segment_001.ts
 *   ...
 */
@Service
public class VideoProcessingService {

    private final S3Template s3Template;
    private final R2UploadService r2UploadService;

    @Value("${r2.bucket-name}")
    private String bucketName;

    @Value("${app.s3.public-base-url}")
    private String publicBaseUrl;

    public VideoProcessingService(S3Template s3Template, R2UploadService r2UploadService) {
        this.s3Template = s3Template;
        this.r2UploadService = r2UploadService;
    }

    /**
     * Full pipeline: download raw video → transcode to HLS → upload segments → return playlist URL.
     *
     * @param rawObjectKey  the R2 object key of the uploaded raw video,
     *                      e.g. "videos/courseId/1234567890_lecture1.mp4"
     * @return the public URL of the HLS master playlist,
     *         e.g. "https://pub.r2.dev/hls/courseId/1234567890_lecture1/master.m3u8"
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

            // ── 4. Rewrite the playlist to use absolute R2 public URLs ───────
            //
            // FFmpeg writes relative segment filenames (segment_000.ts).
            // The player needs absolute URLs so rewrite them before uploading.
            String playlistContent = Files.readString(playlistFile);
            String absolutePlaylist = rewritePlaylistUrls(playlistContent, baseKey);
            Path rewrittenPlaylist = workDir.resolve("master_final.m3u8");
            Files.writeString(rewrittenPlaylist, absolutePlaylist);

            // ── 5. Upload the rewritten playlist to R2 ───────────────────────
            String playlistKey = baseKey + "/master.m3u8";
            uploadFile(rewrittenPlaylist, playlistKey, "application/vnd.apple.mpegurl");

            // ── 6. Delete the raw source file from R2 (no longer needed) ────
            r2UploadService.deleteObject(bucketName, rawObjectKey);

            return r2UploadService.getPublicUrl(playlistKey);

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

    /**
     * Replaces relative segment filenames in the M3U8 playlist with absolute public R2 URLs.
     *
     * e.g. "segment_000.ts" → "https://pub.r2.dev/hls/courseId/timestamp/segment_000.ts"
     */
    private String rewritePlaylistUrls(String playlist, String baseKey) {
        String[] lines = playlist.split("\n");
        StringBuilder sb = new StringBuilder();
        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty() && !trimmed.startsWith("#")) {
                // This is a segment filename line — make it absolute
                sb.append(publicBaseUrl).append("/").append(baseKey).append("/").append(trimmed);
            } else {
                sb.append(line);
            }
            sb.append("\n");
        }
        return sb.toString();
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
