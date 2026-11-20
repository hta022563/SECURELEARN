package FCAJ.SecureLearn.Repositories;

import FCAJ.SecureLearn.Model.Subject;
import java.util.List;
import java.util.UUID;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

/**
 *
 * @author ngoct
 */
@Repository
public interface SubjectRepo extends CrudRepository<Subject, UUID> {
    boolean existsByNameIgnoreCase(String name);
    @Override
    List<Subject> findAll();
}
