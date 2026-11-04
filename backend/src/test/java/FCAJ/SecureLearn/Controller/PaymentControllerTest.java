package FCAJ.SecureLearn.Controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import FCAJ.SecureLearn.Model.MomoCreateRequest;
import FCAJ.SecureLearn.Service.MomoService;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.json.JsonMapper;

/**
 * Tests the MoMo create-payment path in PaymentController against the request format in
 * pay-sandbox's docs/momo.md ("1. Create a payment").
 * Uses the pay-sandbox default keys and builds the controller by hand, so no Spring context,
 * database or running sandbox is needed.
 */
class PaymentControllerTest {

    private static final String ENDPOINT = "http://localhost:4242/momo";
    private static final String PARTNER_CODE = "MOMOSBX00001";
    private static final String ACCESS_KEY = "paysandboxmomoaccess";
    private static final String SECRET_KEY = "paysandboxmomosecretkey000000001";

    /** Every field MoMo's create request requires, spelled exactly as MoMo expects. */
    private static final Set<String> MOMO_CREATE_FIELDS = Set.of(
            "partnerCode", "requestId", "amount", "orderId", "orderInfo",
            "redirectUrl", "ipnUrl", "requestType", "extraData", "lang", "signature");

    private PaymentController paymentController;

    @BeforeEach
    void setUp() {
        MomoService momoService = new MomoService(ENDPOINT, PARTNER_CODE, ACCESS_KEY, SECRET_KEY);
        paymentController = new PaymentController(momoService, ENDPOINT, PARTNER_CODE, ACCESS_KEY, SECRET_KEY);
    }

    @Test
    void createPaymentReturns200() {
        ResponseEntity<?> response = paymentController.createPayment(sampleRequest());
        assertEquals(200, response.getStatusCode().value(), "body was: " + response.getBody());
    }

    @Test
    void createPaymentBodyHasExactlyTheMomoFieldNames() {
        Map<String, String> body = createBody();
        assertEquals(MOMO_CREATE_FIELDS, body.keySet(),
                "Field names must match MoMo exactly (no extra characters, none missing)");
    }

    @Test
    void createPaymentSendsAmountAsWholeNumber() {
        // MoMo amounts are whole VND; "150000.0" is a different string from "150000" and breaks the signature
        assertEquals("150000", createBody().get("amount"));
    }

    @Test
    void createPaymentCopiesOrderDetailsFromRequest() {
        Map<String, String> body = createBody();
        assertEquals("ORDER123", body.get("orderId"));
        assertEquals("Thanh toan khoa hoc", body.get("orderInfo"));
        assertEquals(PARTNER_CODE, body.get("partnerCode"));
        assertEquals("captureWallet", body.get("requestType"));
    }

    @Test
    void createPaymentSignatureMatchesMomoRawSignatureFormat() throws Exception {
        Map<String, String> body = createBody();
        // Format from docs/momo.md: alphabetical fields, joined with &, no URL-encoding
        String expectedRaw = "accessKey=" + ACCESS_KEY
                + "&amount=150000"
                + "&extraData=" + body.get("extraData")
                + "&ipnUrl=" + body.get("ipnUrl")
                + "&orderId=ORDER123"
                + "&orderInfo=Thanh toan khoa hoc"
                + "&partnerCode=" + PARTNER_CODE
                + "&redirectUrl=" + body.get("redirectUrl")
                + "&requestId=" + body.get("requestId")
                + "&requestType=" + body.get("requestType");

        assertEquals(hmacSha256(SECRET_KEY, expectedRaw), body.get("signature"),
                "Signature does not match MoMo's format. Expected raw string:\n" + expectedRaw);
    }

    @Test
    void createPaymentPathAcceptsJsonOverHttp() throws Exception {
        // Exercises the real URL mapping and JSON binding of MomoCreateRequest
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(paymentController).build();
        String json = "{\"orderId\":\"ORDER123\",\"orderInfo\":\"Thanh toan khoa hoc\",\"amount\":150000}";

        String responseJson = mockMvc.perform(post("/momo/v2/gateway/api/create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        Map<?, ?> body = JsonMapper.builder().build().readValue(responseJson, Map.class);
        assertEquals("ORDER123", body.get("orderId"), "response was: " + responseJson);
        assertTrue(body.containsKey("signature"), "response was: " + responseJson);
    }

    private MomoCreateRequest sampleRequest() {
        return new MomoCreateRequest("ORDER123", "Thanh toan khoa hoc", 150000);
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> createBody() {
        Object body = paymentController.createPayment(sampleRequest()).getBody();
        assertInstanceOf(Map.class, body, "createPayment did not return a field map, it returned: " + body);
        return (Map<String, String>) body;
    }

    /** Independent HMAC-SHA256 so the test does not rely on MomoService.encode being right. */
    private static String hmacSha256(String key, String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }
}
