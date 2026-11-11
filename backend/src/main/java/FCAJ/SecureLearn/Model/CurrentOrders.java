package FCAJ.SecureLearn.Model;

import java.util.UUID;

/**
 *
 * @author ngoct
 */
public record CurrentOrders(
        String orderId,
        UUID courseId,
        String email
){}
