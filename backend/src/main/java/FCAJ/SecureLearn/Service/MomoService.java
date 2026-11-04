/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;

/**
 *
 * @author ngoct
 */
public class MomoService {
    
    @Value("momo.url")
    private final String endpoint;
    @Value("momo.partnerCode")
    private final String partnerCode;
    @Value("momo.accessKey")
    private final String accessKey;
    @Value("momo.secretKey")
    private final String secretKey;
    public MomoService(String endpoint, String partnerCode, String accessKey, String secretKey) {
        this.endpoint = endpoint;
        this.partnerCode = partnerCode;
        this.accessKey = accessKey;
        this.secretKey = secretKey;
    }
    
    public void createMomoPayment(String orderId, float amount, String orderInfo){
       
        
        String requestId = orderId;
        String requestType = "captureWallet";
        String extraData ="";
        String redirectUrl="http://localhost:3000/payment/momo/return";
        String ipnUrl = "http://localhost:3000/api/momo/ipn";
        
        String rawSignature = "accessKey=" + accessKey + "&amount=" + amount + "&extraData" + extraData + "&ipnUrl=" + ipnUrl + "&orderId=" + orderId + "&orderInfo=" + orderInfo + "&partnerCode" + partnerCode + "&redirectUrl=" + redirectUrl + "&requestId=" + requestId + "&requestType=" + requestType;
        try{
             Mac hmacSha256 = Mac.getInstance("HmacSHA256");
             SecretKeySpec secretKey = new SecretKeySpec()
        }catch(Exception e){
            
        }
    }
    
    
}
