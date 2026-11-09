/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Response;

import java.net.URL;

/**
 *
 * @author ngoct
 */

public record MomoPaymentCreationResponse(
        String partnerCode, 
        String orderId,
        String requestId,
        long amount,
        long responseTime,
        String message,
        int resultCode,
        URL payUrl,
        String deeplink,
        URL qrCodeUrl,
        URL deeplinkMiniApp,
        String signature,
        long userFee
){}
    

