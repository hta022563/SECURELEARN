package FCAJ.SecureLearn.Service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * Unit tests for MomoService.encode (HMAC-SHA256, lowercase hex).
 * No Spring context needed: the service is created directly.
 */
class MomoServiceTest {

    private final MomoService momoService = new MomoService(
            "http://localhost:4242/momo", "MOMOSBX00001", "paysandboxmomoaccess", "paysandboxmomosecretkey000000001");

    @Test
    void encodeMatchesStandardHmacSha256TestVector() throws Exception {
        // Well-known HMAC-SHA256 example (e.g. Wikipedia "HMAC" article)
        assertEquals("f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
                momoService.encode("key", "The quick brown fox jumps over the lazy dog"));
    }

    @Test
    void encodeReturns64LowercaseHexCharacters() throws Exception {
        String signature = momoService.encode("secret", "anything");
        assertTrue(signature.matches("[0-9a-f]{64}"), "MoMo expects lowercase hex, got: " + signature);
    }

    @Test
    void encodeUsesUtf8ForVietnameseText() throws Exception {
        // orderInfo is often Vietnamese; reference value computed independently (Python hmac)
        String vietnamese = "Thanh toán khóa học";
        assertEquals("fbbadd54a65b64f38b937737f9c0b81070d666a3356e59002c6f589eb4b05636",
                momoService.encode("paysandboxmomosecretkey000000001", vietnamese));
    }
}
