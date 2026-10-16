package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Service.PlaybackService;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
public class PlaybackController {
    private final PlaybackService playbackService;

    public PlaybackController(PlaybackService playbackService) {
        this.playbackService = playbackService;
    }

    @GetMapping("/api/v1/lesson/{id}/playback")
    public ResponseEntity<?> createPlayback(
            @PathVariable UUID id) {
        String contextUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                .build()
                .toUriString();
        PlaybackService.PlaybackDetails details = playbackService.createPlayback(id, contextUrl);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(Map.of("playbackUrl", details.playbackUrl(), "expiresAt", details.expiresAt()));
    }

    @GetMapping(value = "/api/v1/lesson/{id}/manifest", produces = "application/vnd.apple.mpegurl")
    public ResponseEntity<String> getManifest(
            @PathVariable UUID id,
            @RequestParam String token) {
        String contextUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
            .build()
            .toUriString();
        String manifest = playbackService.getSignedManifest(id, token, contextUrl);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.apple.mpegurl"))
                .cacheControl(CacheControl.noStore())
                .body(manifest);
    }

    @GetMapping(value = "/api/v1/lesson/{id}/key", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<byte[]> getContentKey(
            @PathVariable UUID id,
            @RequestParam String token) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(playbackService.getContentKey(id, token));
    }
}