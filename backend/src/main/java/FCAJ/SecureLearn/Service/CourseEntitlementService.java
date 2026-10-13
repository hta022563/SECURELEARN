package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.CourseEntitlement;
import FCAJ.SecureLearn.repositories.CourseEntitlementRepo;
import FCAJ.SecureLearn.repositories.CourseRepo;
import jakarta.persistence.EntityNotFoundException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CourseEntitlementService {
    private final CourseEntitlementRepo entitlementRepo;
    private final CourseRepo courseRepo;

    public CourseEntitlementService(CourseEntitlementRepo entitlementRepo, CourseRepo courseRepo) {
        this.entitlementRepo = entitlementRepo;
        this.courseRepo = courseRepo;
    }

    public boolean hasAccess(String userSub, UUID courseId) {
        return entitlementRepo.findByUserSubAndCourseId(userSub, courseId)
                .map(CourseEntitlement::isActive)
                .orElse(false);
    }

    @Transactional
    public void grant(String userSub, UUID courseId) {
        if (!courseRepo.existsById(courseId)) {
            throw new EntityNotFoundException("Course not found");
        }
        CourseEntitlement entitlement = entitlementRepo.findByUserSubAndCourseId(userSub, courseId)
                .orElseGet(() -> new CourseEntitlement(userSub, courseId));
        entitlement.grant();
        entitlementRepo.save(entitlement);
    }

    @Transactional
    public void revoke(String userSub, UUID courseId) {
        entitlementRepo.findByUserSubAndCourseId(userSub, courseId)
                .ifPresent(entitlement -> {
                    entitlement.revoke();
                    entitlementRepo.save(entitlement);
                });
    }
}