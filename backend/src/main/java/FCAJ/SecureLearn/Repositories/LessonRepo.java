package FCAJ.SecureLearn.Repositories;

import FCAJ.SecureLearn.Model.Lesson;
import java.util.List;
import java.util.UUID;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

/**
 *
 * @author ngoct
 */
@Repository
public interface LessonRepo extends CrudRepository<Lesson, UUID> {
    List<Lesson> findByChapterId(UUID chapterId);
}
