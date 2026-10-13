package FCAJ.SecureLearn.Service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class PlaybackTokenServiceTests {
    @Test
    void issuedTokenIsScopedToItsLesson() {
        PlaybackTokenService tokenService = new PlaybackTokenService("test-secret", 60);
        UUID lessonId = UUID.randomUUID();
        String token = tokenService.issue(lessonId).value();

        assertTrue(tokenService.isValid(lessonId, token));
        assertFalse(tokenService.isValid(UUID.randomUUID(), token));
    }

    @Test
    void tamperedTokenIsRejected() {
        PlaybackTokenService tokenService = new PlaybackTokenService("test-secret", 60);
        UUID lessonId = UUID.randomUUID();
        String token = tokenService.issue(lessonId).value();
        String tamperedToken = token.substring(0, token.length() - 1)
                + (token.endsWith("a") ? "b" : "a");

        assertFalse(tokenService.isValid(lessonId, tamperedToken));
    }

    @Test
    void expiredTokenIsRejected() {
        PlaybackTokenService tokenService = new PlaybackTokenService("test-secret", -1);
        UUID lessonId = UUID.randomUUID();
        String token = tokenService.issue(lessonId).value();

        assertFalse(tokenService.isValid(lessonId, token));
    }
}