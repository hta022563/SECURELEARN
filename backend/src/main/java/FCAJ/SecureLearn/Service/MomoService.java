/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Course;
import FCAJ.SecureLearn.Model.CurrentOrders;
import FCAJ.SecureLearn.Repositories.CourseRepo;
import FCAJ.SecureLearn.Request.Ipn;
import FCAJ.SecureLearn.Request.MomoCreatePaymentRequest;
import FCAJ.SecureLearn.Response.MomoPaymentCreationResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.codec.Hex;
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
    private String endpoint, partnerCode, accessKey, secretKey;
    RestClient defaultClient;

    public MomoService(@Value(value = "${momo.endpoint}")
            String endpoint, @Value(value = "${momo.partnerCode}")
                    String partnerCode, @Value(value = "${momo.accessKey}")
                            String accessKey, @Value(value = "${momo.secretKey}")
                                    String secretKey, CourseRepo courseRepo, EnrollmentService enrollmentService) {
        this.endpoint = endpoint;
        this.partnerCode = partnerCode;
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.courseRepo = courseRepo;
        defaultClient = RestClient.builder().baseUrl(endpoint).build();
        this.enrollmentService = enrollmentService;
    }

    public ResponseEntity<MomoPaymentCreationResponse> createPaymentRequest(UUID id, Map<String, String> userMap, Map<String, UUID> courseMap, String email) {
        Course enrollingCourse = courseRepo.findById(id).orElseThrow();
        String requestId = UUID.randomUUID().toString();
        String requestType = "captureWallet";
        String orderInfo = "Enrolling in " + enrollingCourse.getTitle() + " by " + enrollingCourse.getInstructor();
        String extraData = "";
        String redirectUrl = "http://localhost:3000";
        String ipnUrl = "http://backend:8080/api/momo/ipn";
        if(enrollmentService.checkEnrollemnt(email, id)){
            throw new IllegalArgumentException("User have already enrolled in this course");
        }
        userMap.put(requestId, email);
        courseMap.put(requestId, id);
        try {
            String rawSignature = "accessKey=" + accessKey
                    + "&amount=" + enrollingCourse.getPrice()
                    + "&extraData=" + extraData
                    + "&ipnUrl=" + ipnUrl
                    + "&orderId=" + requestId
                    + "&orderInfo=" + orderInfo
                    + "&partnerCode=" + partnerCode
                    + "&redirectUrl=" + redirectUrl
                    + "&requestId=" + requestId
                    + "&requestType=" + requestType;
            MomoPaymentCreationResponse response;
            MomoCreatePaymentRequest paymentrequest = new MomoCreatePaymentRequest(partnerCode, requestId, enrollingCourse.getPrice(), requestId, orderInfo, redirectUrl, ipnUrl, requestType, extraData, "vi", encode(secretKey, rawSignature));

            return defaultClient.post().uri("/v2/gateway/api/create").body(paymentrequest).retrieve().toEntity(MomoPaymentCreationResponse.class);
        } catch (Exception e) {
            return null;
        }
    }

    public boolean ipnCheck(Ipn ipn) {
        if (ipn.signature().isEmpty() || ipn.signature().isBlank()) {
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
        String encodedSignature = encode(secretKey, rawSignature);
        return MessageDigest.isEqual(ipn.signature().getBytes(StandardCharsets.UTF_8), encodedSignature.getBytes(StandardCharsets.UTF_8));
    }

    public String encode(String key, String data) {
        try {
            Mac hmacSha256 = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmacSha256.init(secretKey);

            return HexFormat.of().formatHex(hmacSha256.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("HMAC-SHA256 unavailable", e);
        }
    }
}
