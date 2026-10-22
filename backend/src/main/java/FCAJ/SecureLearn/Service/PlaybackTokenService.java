package FCAJ.SecureLearn.Service;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class PlaybackTokenService {
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final byte[] secret;
    private final long ttlSeconds;

    public PlaybackTokenService(
            @Value("${playback.token-secret:${r2.secret-key}}") String secret,
            @Value("${playback.token-ttl-seconds:7200}") long ttlSeconds) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.ttlSeconds = ttlSeconds;
    }

    public IssuedToken issue(UUID lessonId, String username) {
        long expiresAt = Instant.now().getEpochSecond() + ttlSeconds;
        String payload = lessonId + ":" + username + ":" + expiresAt;
        String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        return new IssuedToken(encodedPayload + "." + sign(encodedPayload), expiresAt);
    }

    public boolean isValid(UUID lessonId, String token, String username) {
        if (token == null) {
            return false;
        }
        String[] parts = token.split("\\.", 2);
        if (parts.length != 2 || !MessageDigest.isEqual(
                sign(parts[0]).getBytes(StandardCharsets.US_ASCII),
                parts[1].getBytes(StandardCharsets.US_ASCII))) {
            return false;
        }
        try {
            String payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            String[] claims = payload.split(":", 3);
            return claims.length == 3
                    && claims[1].equals(username)
                    && lessonId.equals(UUID.fromString(claims[0]))
                    && Instant.now().getEpochSecond() < Long.parseLong(claims[2]);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret, HMAC_ALGORITHM));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Could not sign playback token", e);
        }
    }

    public record IssuedToken(String value, long expiresAt) {
    }
}