package FCAJ.SecureLearn.Controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import FCAJ.SecureLearn.Model.MomoCreateRequest;
import FCAJ.SecureLearn.Service.MomoService;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/**
 * End-to-end check: takes the body PaymentController builds and sends it to a running pay-sandbox.
 * The sandbox verifies the signature byte-for-byte like MoMo does, and its error message shows the
 * exact raw string it expected when the signature is wrong.
 *
 * Skipped automatically when no sandbox answers. Start one first, e.g. `docker compose up -d paySandbox`.
 * Override the address with the PAY_SANDBOX_URL environment variable (default http://localhost:4242).
 */
@Tag("integration")
class MomoSandboxIntegrationTest {

    private static final String SANDBOX = System.getenv().getOrDefault("PAY_SANDBOX_URL", "http://localhost:4242");
    private static final String PARTNER_CODE = "MOMOSBX00001";
    private static final String ACCESS_KEY = "paysandboxmomoaccess";
    private static final String SECRET_KEY = "paysandboxmomosecretkey000000001";

    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @BeforeAll
    static void requireRunningSandbox() {
        assumeTrue(sandboxIsUp(), "pay-sandbox is not running at " + SANDBOX + ", skipping");
    }

    @Test
    void sandboxAcceptsTheCreatePaymentBody() throws Exception {
        String endpoint = SANDBOX + "/momo";
        MomoService momoService = new MomoService(endpoint, PARTNER_CODE, ACCESS_KEY, SECRET_KEY);
        PaymentController paymentController =
                new PaymentController(momoService, endpoint, PARTNER_CODE, ACCESS_KEY, SECRET_KEY);

        // The sandbox rejects reused order ids (resultCode 41), so use a fresh one each run
        String orderId = "TEST" + UUID.randomUUID().toString().replace("-", "");
        Object body = paymentController.createPayment(
                new MomoCreateRequest(orderId, "Thanh toan khoa hoc", 150000)).getBody();

        HttpResponse<String> response = HTTP.send(
                HttpRequest.newBuilder(URI.create(endpoint + "/v2/gateway/api/create"))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body)))
                        .build(),
                HttpResponse.BodyHandlers.ofString());

        Map<?, ?> reply = JSON.readValue(response.body(), Map.class);
        // On failure the sandbox's message says what was wrong (e.g. the raw string it signed)
        assertEquals(0, reply.get("resultCode"),
                "Sandbox rejected the request (HTTP " + response.statusCode() + "): " + reply.get("message")
                        + "\nSent: " + JSON.writeValueAsString(body));
        assertNotNull(reply.get("payUrl"), "No payUrl in reply: " + response.body());
    }

    private static boolean sandboxIsUp() {
        try {
            HttpResponse<Void> health = HTTP.send(
                    HttpRequest.newBuilder(URI.create(SANDBOX + "/__sandbox/health")).timeout(Duration.ofSeconds(2)).build(),
                    HttpResponse.BodyHandlers.discarding());
            return health.statusCode() == 200;
        } catch (Exception e) {
            return false;
        }
    }
}
