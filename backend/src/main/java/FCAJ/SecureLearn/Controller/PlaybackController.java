package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Service.AuthService;
import FCAJ.SecureLearn.Service.LogService;
import FCAJ.SecureLearn.Service.PlaybackService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
public class PlaybackController {
    private final PlaybackService playbackService;
    private final LogService logService;
    private final AuthService authService;

    public PlaybackController(PlaybackService playbackService, LogService logService, AuthService authService) {
        this.playbackService = playbackService;
        this.logService = logService;
        this.authService = authService;
    }

    @GetMapping("/api/v1/lesson/{id}/playback")
    public ResponseEntity<?> createPlayback(
            @PathVariable UUID id,
            HttpServletRequest servletRequest,
            @AuthenticationPrincipal Jwt jwt) {
        String contextUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                .build()
                .toUriString();
        PlaybackService.PlaybackDetails details = playbackService.createPlayback(id, contextUrl,jwt.getClaimAsString("username"));
        logService.createLog(jwt.getClaimAsString("username"), "Playback", LocalDateTime.now(), servletRequest.getRemoteAddr());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(Map.of("playbackUrl", details.playbackUrl(), "expiresAt", details.expiresAt()));
    }

    @GetMapping(value = "/api/v1/lesson/{id}/manifest", produces = "application/vnd.apple.mpegurl")
    public ResponseEntity<String> getManifest(
            @PathVariable UUID id,
            @RequestParam String token,
            @AuthenticationPrincipal Jwt jwt) {
        String contextUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
            .build()
            .toUriString();
        String manifest = playbackService.getSignedManifest(id, token, contextUrl, jwt.getClaimAsString("username"));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.apple.mpegurl"))
                .cacheControl(CacheControl.noStore())
                .body(manifest);
    }

    @GetMapping(value = "/api/v1/lesson/{id}/key", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<byte[]> getContentKey(
            @PathVariable UUID id,
            @RequestParam String token,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(playbackService.getContentKey(id, token, jwt.getClaimAsString("username")));
    }
}