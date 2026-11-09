/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Model.Course;
import FCAJ.SecureLearn.Model.CurrentOrders;
import FCAJ.SecureLearn.Repositories.CourseRepo;
import FCAJ.SecureLearn.Request.Ipn;
import FCAJ.SecureLearn.Request.MomoCreatePaymentRequest;
import FCAJ.SecureLearn.Response.MomoPaymentCreationResponse;
import FCAJ.SecureLearn.Service.AuthService;
import FCAJ.SecureLearn.Service.CourseService;
import FCAJ.SecureLearn.Service.EnrollmentService;
import FCAJ.SecureLearn.Service.MomoService;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

/**
 *
 * @author ngoct
 */
@RestController
public class PaymentController {

    private final MomoService momoService;
    private final EnrollmentService enrollmentService;
    private final AuthService authService;
    private Map<String, String> userMap = new HashMap<>();
    private Map<String, UUID> courseMap = new HashMap<>();
    
    public PaymentController(MomoService momoService, EnrollmentService enrollmentService, AuthService authService) {
        this.momoService = momoService;
        this.enrollmentService = enrollmentService;
        this.authService = authService;
    }
    

    @PostMapping("api/v1/enrollment/{id}")
    public ResponseEntity<?> createPayment(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        try {
            return momoService.createPaymentRequest(id, userMap, courseMap, authService.getEmailByUsername(jwt.getClaimAsString("username")));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/api/momo/ipn")
    public ResponseEntity<?> ipnValidation(@RequestBody Ipn ipn) {
        if (!momoService.ipnCheck(ipn)) {
            return ResponseEntity.badRequest().build();
        }
        if (ipn.resultCode() == 0) {
            enrollmentService.createEnrollment(userMap.get(ipn.orderId()), courseMap.get(ipn.orderId()));
            userMap.remove(ipn.orderId());
            courseMap.remove(ipn.orderId());
        }
        return ResponseEntity.noContent().build();
    }
}
