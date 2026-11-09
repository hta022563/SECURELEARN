package FCAJ.SecureLearn.Request;

/**
 * Body sent from our backend to MoMo's create endpoint (POST {momo.url}/v2/gateway/api/create).
 * Component names become the JSON keys, so they must match MoMo's field names exactly.
 * Compute the signature first, then create the record (it can't be changed afterwards).
 */
public record MomoCreatePaymentRequest(
        String partnerCode,
        String requestId,
        long amount,
        String orderId,
        String orderInfo,
        String redirectUrl,
        String ipnUrl,
        String requestType,
        String extraData,
        String lang,
        String signature) {
}
