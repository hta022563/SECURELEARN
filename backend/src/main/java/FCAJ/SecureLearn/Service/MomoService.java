/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Course;
import FCAJ.SecureLearn.Repositories.CourseRepo;
import FCAJ.SecureLearn.Request.MomoCreatePaymentRequest;
import FCAJ.SecureLearn.Request.MomoPaymentCreationResponse;
import java.util.HexFormat;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.codec.Hex;
import org.springframework.web.client.RestClient;

/**
 *
 * @author ngoct
 */
public class MomoService {
    private final CourseRepo courseRepo;
     @Value("${momo.url}")
    private final String endpoint;
    @Value("${momo.partnerCode}")
    private final String partnerCode;
    @Value("${momo.accessKey}")
    private final String accessKey;
    @Value("${momo.secretKey}")
    private final String secretKey;
    
     RestClient defaultClient = RestClient.create(); 

    public MomoService(String endpoint, String partnerCode, String accessKey, String secretKey, CourseRepo courseRepo) {
        this.endpoint = endpoint;
        this.partnerCode = partnerCode;
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.courseRepo = courseRepo;
    }
    
    public MomoPaymentCreationResponse createPaymentRequest(UUID id){
        Course enrollingCourse = courseRepo.findById(id).orElseThrow();
        String requestId = UUID.randomUUID().toString();
        String requestType = "captureWallet";
        String orderInfo = "Enrolling in " + enrollingCourse.getTitle() + " by " + enrollingCourse.getInstructor();
        String extraData ="";
        String redirectUrl="http://localhost:8080/payment/momo/return";
        String ipnUrl = "http://localhost:8080/api/momo/ipn";
        
        String rawSignature = "accessKey=" + accessKey + "&amount=" + enrollingCourse.getPrice() + "&extraData=" + extraData + "&ipnUrl=" + ipnUrl + "&orderId=" + requestId + "&orderInfo=" + orderInfo + "&partnerCode=" + partnerCode + "&redirectUrl=" + redirectUrl + "&requestId=" + requestId + "&requestType=" + requestType;
        MomoPaymentCreationResponse response;
        MomoCreatePaymentRequest paymentrequest = new MomoCreatePaymentRequest(partnerCode, requestId, enrollingCourse.getPrice(), requestId, orderInfo, redirectUrl, ipnUrl, requestType, extraData, "vi", encode(secretKey, rawSignature));
        return defaultClient.post().uri("/momo/v2/gateway/api/create").body(paymentrequest).retrieve().toEntity(MomoPaymentCreationResponse.class);
    }
    
    
    public String encode(String key, String data) throws Exception{
        Mac hmacSha256 = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(key.getBytes("UTF-8"), "HmacSHA256");
        hmacSha256.init(secretKey);
        
        return HexFormat.of().formatHex(hmacSha256.doFinal(data.getBytes("UTF-8")));
    }
    
    
}
