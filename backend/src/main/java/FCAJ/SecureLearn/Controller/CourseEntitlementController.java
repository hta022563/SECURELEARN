package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Service.CourseEntitlementService;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/course/{courseId}/entitlements")
public class CourseEntitlementController {
    private final CourseEntitlementService entitlementService;

    public CourseEntitlementController(CourseEntitlementService entitlementService) {
        this.entitlementService = entitlementService;
    }

    @PutMapping("/{userSub}")
    public ResponseEntity<?> grant(
            @PathVariable UUID courseId,
            @PathVariable String userSub) {
        entitlementService.grant(userSub, courseId);
        return ResponseEntity.ok(Map.of("granted", true));
    }

    @DeleteMapping("/{userSub}")
    public ResponseEntity<?> revoke(
            @PathVariable UUID courseId,
            @PathVariable String userSub) {
        entitlementService.revoke(userSub, courseId);
        return ResponseEntity.noContent().build();
    }
}