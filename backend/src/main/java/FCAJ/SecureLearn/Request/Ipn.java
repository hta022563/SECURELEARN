package FCAJ.SecureLearn.Request;

/**
 *
 * @author PC
 */
public record Ipn(
    String partnerCode,
    String orderId,
    String requestId,
    long amount,
    String orderInfo,
    String orderType,
    long transId,
    int resultCode,
    String message,
    String payType,
    long responseTime,
    String extraData,
    String signature
){}
