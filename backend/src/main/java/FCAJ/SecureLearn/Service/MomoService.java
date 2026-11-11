package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Course;
import FCAJ.SecureLearn.Repositories.CourseRepo;
import FCAJ.SecureLearn.Request.Ipn;
import FCAJ.SecureLearn.Request.MomoCreatePaymentRequest;
import FCAJ.SecureLearn.Response.MomoPaymentCreationResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 *
 * @author ngoct
 */
@Service
public class MomoService {

    private final CourseRepo courseRepo;
    private final EnrollmentService enrollmentService;
    private final String partnerCode;
    private final String accessKey;
    private final String secretKey;
    private final RestClient momoClient;

    public MomoService(
            @Value("${momo.endpoint}") String endpoint,
            @Value("${momo.partnerCode}") String partnerCode,
            @Value("${momo.accessKey}") String accessKey,
            @Value("${momo.secretKey}") String secretKey,
            CourseRepo courseRepo,
            EnrollmentService enrollmentService) {
        this.partnerCode = partnerCode;
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.courseRepo = courseRepo;
        this.enrollmentService = enrollmentService;
        this.momoClient = RestClient.builder().baseUrl(endpoint).build();
    }

    public ResponseEntity<MomoPaymentCreationResponse> createPaymentRequest(UUID courseId,
            Map<String, String> pendingOrderEmails, Map<String, UUID> pendingOrderCourseIds, String studentEmail) {
        Course enrollingCourse = courseRepo.findById(courseId)
                .orElseThrow(() -> new NoSuchElementException(
                        "Cannot create payment: no course found with id " + courseId));
        String orderId = UUID.randomUUID().toString();
        String requestType = "captureWallet";
        String orderInfo = "Enrolling in " + enrollingCourse.getTitle() + " by " + enrollingCourse.getInstructor();
        String extraData = "";
        String redirectUrl = "http://localhost:3000";
        String ipnUrl = "http://backend:8080/api/momo/ipn";
        if (enrollmentService.isEnrolledInCourse(studentEmail, courseId)) {
            throw new IllegalArgumentException(
                    "Student " + studentEmail + " is already enrolled in course " + courseId);
        }
        pendingOrderEmails.put(orderId, studentEmail);
        pendingOrderCourseIds.put(orderId, courseId);
        try {
            // MoMo requires the request id and order id; we use the same UUID for both
            String rawSignature = "accessKey=" + accessKey
                    + "&amount=" + enrollingCourse.getPrice()
                    + "&extraData=" + extraData
                    + "&ipnUrl=" + ipnUrl
                    + "&orderId=" + orderId
                    + "&orderInfo=" + orderInfo
                    + "&partnerCode=" + partnerCode
                    + "&redirectUrl=" + redirectUrl
                    + "&requestId=" + orderId
                    + "&requestType=" + requestType;
            MomoCreatePaymentRequest paymentRequest = new MomoCreatePaymentRequest(partnerCode, orderId,
                    enrollingCourse.getPrice(), orderId, orderInfo, redirectUrl, ipnUrl, requestType, extraData, "vi",
                    hmacSha256Hex(secretKey, rawSignature));

            return momoClient.post()
                    .uri("/v2/gateway/api/create")
                    .body(paymentRequest)
                    .retrieve()
                    .toEntity(MomoPaymentCreationResponse.class);
        } catch (Exception e) {
            pendingOrderEmails.remove(orderId);
            pendingOrderCourseIds.remove(orderId);
            throw new IllegalStateException("MoMo create-payment call failed for order " + orderId
                    + " (course " + courseId + "): " + e.getMessage(), e);
        }
    }

    public boolean isIpnSignatureValid(Ipn ipn) {
        if (ipn.signature() == null || ipn.signature().isBlank()) {
            return false;
        }

        String rawSignature = "accessKey=" + accessKey
                + "&amount=" + ipn.amount()
                + "&extraData=" + ipn.extraData()
                + "&message=" + ipn.message()
                + "&orderId=" + ipn.orderId()
                + "&orderInfo=" + ipn.orderInfo()
                + "&orderType=" + ipn.orderType()
                + "&partnerCode=" + partnerCode
                + "&payType=" + ipn.payType()
                + "&requestId=" + ipn.requestId()
                + "&responseTime=" + ipn.responseTime()
                + "&resultCode=" + ipn.resultCode()
                + "&transId=" + ipn.transId();
        String expectedSignature = hmacSha256Hex(secretKey, rawSignature);
        return MessageDigest.isEqual(
                ipn.signature().getBytes(StandardCharsets.UTF_8),
                expectedSignature.getBytes(StandardCharsets.UTF_8));
    }

    public String hmacSha256Hex(String key, String data) {
        try {
            Mac hmacSha256 = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmacSha256.init(keySpec);
            return HexFormat.of().formatHex(hmacSha256.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Could not compute HMAC-SHA256 signature for MoMo request", e);
        }
    }
}
