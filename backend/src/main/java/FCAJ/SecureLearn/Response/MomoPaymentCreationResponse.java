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


