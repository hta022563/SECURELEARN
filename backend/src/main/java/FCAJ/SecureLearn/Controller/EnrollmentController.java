package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Model.Enrollment;
import FCAJ.SecureLearn.Response.EnrollmentLockResponse;
import FCAJ.SecureLearn.Service.AuthService;
import FCAJ.SecureLearn.Service.EnrollmentService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 *
 * @author ngoct
 */
@RestController
@RequestMapping("/api/v1/enrollment")
public class EnrollmentController {
    private final EnrollmentService enrollmentService;
    private final AuthService authService;

    public EnrollmentController(EnrollmentService enrollmentService, AuthService authService) {
        this.enrollmentService = enrollmentService;
        this.authService = authService;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyEnrollments(@AuthenticationPrincipal Jwt jwt) {
        String studentEmail = authService.getEmailByUsername(jwt.getClaimAsString("username"));
        List<Enrollment> studentEnrollments = enrollmentService.getEnrollmentsByEmail(studentEmail);
        List<EnrollmentLockResponse> enrollmentResponses = studentEnrollments.stream()
                .map(enrollment -> new EnrollmentLockResponse(
                        enrollment.getCourse().getId(),
                        enrollment.getCurrentStatus(),
                        enrollment.getEnrollmentDate(),
                        enrollment.getCompletionDate()))
                .toList();
        return ResponseEntity.ok(enrollmentResponses);
    }
}
