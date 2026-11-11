package FCAJ.SecureLearn.Repositories;

import FCAJ.SecureLearn.Model.Chapter;
import java.util.List;
import java.util.UUID;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

/**
 *
 * @author ngoct
 */
@Repository
public interface ChapterRepo extends CrudRepository<Chapter, UUID> {
    @Override
    List<Chapter> findAll();

    List<Chapter> findByCourseId(UUID courseId);
}
