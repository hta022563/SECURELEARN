package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Configuration.LogAnnotationClass;
import FCAJ.SecureLearn.Model.ActionType;
import FCAJ.SecureLearn.Service.AuthService;
import FCAJ.SecureLearn.Service.LogService;
import FCAJ.SecureLearn.Service.PlaybackService;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.time.LocalDateTime;
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

@RestController
@RequestMapping("/api/v1/lesson/{id}")
public class PlaybackController {
    private final PlaybackService playbackService;
    private final LogService logService;
    private final AuthService authService;

    public PlaybackController(PlaybackService playbackService, LogService logService, AuthService authService) {
        this.playbackService = playbackService;
        this.logService = logService;
        this.authService = authService;
    }

    @GetMapping("/playback")
    @LogAnnotationClass(ActionType.PLAYBACK)
    public ResponseEntity<?> createPlayback(
            @PathVariable UUID id,
            HttpServletRequest servletRequest,
            @AuthenticationPrincipal Jwt jwt) {
        String contextUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                .build()
                .toUriString();
        PlaybackService.PlaybackDetails details = playbackService.createPlayback(id, contextUrl,jwt.getClaimAsString("username"));
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(Map.of("playbackUrl", details.playbackUrl(), "expiresAt", details.expiresAt()));
    }

    @GetMapping(value = "/manifest", produces = "application/vnd.apple.mpegurl")
    @LogAnnotationClass(ActionType.MANIFEST_REQUEST)
    public ResponseEntity<String> getManifest(
            @PathVariable UUID id,
            @RequestParam String token,
            @AuthenticationPrincipal Jwt jwt,
            HttpServletRequest servletRequest) {
        String contextUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
            .build()
            .toUriString();
        String manifest = playbackService.getSignedManifest(id, token, contextUrl, jwt.getClaimAsString("username"));
       
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.apple.mpegurl"))
                .cacheControl(CacheControl.noStore())
                .body(manifest);
    }

    @GetMapping(value = "/key", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    @LogAnnotationClass(ActionType.KEY_REQUEST)
    public ResponseEntity<byte[]> getContentKey(
            @PathVariable UUID id,
            @RequestParam String token,
            @AuthenticationPrincipal Jwt jwt,
            HttpServletRequest servletRequest) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(playbackService.getContentKey(id, token, jwt.getClaimAsString("username")));
    }
    
    @GetMapping("/segment/{segmentId}")
    @LogAnnotationClass(ActionType.SEGMENT_REQUEST)
    public ResponseEntity<?> segmentRequest(@PathVariable UUID id,@PathVariable int segmentId, @RequestParam String token, @AuthenticationPrincipal Jwt jwt, HttpServletRequest servletRequest){
        String segmentUrl = playbackService.getSegmentURL(segmentId, id, token, jwt.getClaimAsString("username"));
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(segmentUrl)).build();
    }
}