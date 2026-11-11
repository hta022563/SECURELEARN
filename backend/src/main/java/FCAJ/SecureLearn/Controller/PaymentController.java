package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Request.Ipn;
import FCAJ.SecureLearn.Service.AuthService;
import FCAJ.SecureLearn.Service.EnrollmentService;
import FCAJ.SecureLearn.Service.MomoService;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 *
 * @author ngoct
 */
@RestController
public class PaymentController {

    private final MomoService momoService;
    private final EnrollmentService enrollmentService;
    private final AuthService authService;
    // Pending MoMo orders, keyed by orderId, until the IPN callback confirms payment
    private final Map<String, String> pendingOrderEmails = new HashMap<>();
    private final Map<String, UUID> pendingOrderCourseIds = new HashMap<>();

    public PaymentController(MomoService momoService, EnrollmentService enrollmentService, AuthService authService) {
        this.momoService = momoService;
        this.enrollmentService = enrollmentService;
        this.authService = authService;
    }

    @PostMapping("api/v1/enrollment/{courseId}")
    public ResponseEntity<?> createPayment(@PathVariable UUID courseId, @AuthenticationPrincipal Jwt jwt) {
        try {
            String studentEmail = authService.getEmailByUsername(jwt.getClaimAsString("username"));
            return momoService.createPaymentRequest(courseId, pendingOrderEmails, pendingOrderCourseIds, studentEmail);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Could not create MoMo payment for course " + courseId + ": " + e.getMessage()));
        }
    }

    @PostMapping("/api/momo/ipn")
    public ResponseEntity<?> handleMomoIpn(@RequestBody Ipn ipn) {
        if (!momoService.isIpnSignatureValid(ipn)) {
            return ResponseEntity.badRequest().build();
        }
        if (ipn.resultCode() == 0) {
            enrollmentService.createEnrollment(
                    pendingOrderEmails.get(ipn.orderId()), pendingOrderCourseIds.get(ipn.orderId()));
            pendingOrderEmails.remove(ipn.orderId());
            pendingOrderCourseIds.remove(ipn.orderId());
        }
        return ResponseEntity.noContent().build();
    }
}
