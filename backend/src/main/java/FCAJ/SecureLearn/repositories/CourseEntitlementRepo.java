package FCAJ.SecureLearn.repositories;

import FCAJ.SecureLearn.Model.CourseEntitlement;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseEntitlementRepo extends CrudRepository<CourseEntitlement, UUID> {
    Optional<CourseEntitlement> findByUserSubAndCourseId(String userSub, UUID courseId);
}