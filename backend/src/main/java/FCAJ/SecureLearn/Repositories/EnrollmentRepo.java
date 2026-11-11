package FCAJ.SecureLearn.Repositories;

import FCAJ.SecureLearn.Model.Enrollment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

/**
 *
 * @author ngoct
 */
@Repository
public interface EnrollmentRepo extends CrudRepository<Enrollment, UUID> {
    @Override
    List<Enrollment> findAll();

    List<Enrollment> findByEmail(String email);

    List<Enrollment> findByCourseId(UUID courseId);

    Enrollment findByEmailAndCourseId(String email, UUID courseId);
}
