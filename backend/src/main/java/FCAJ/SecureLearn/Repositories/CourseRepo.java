package FCAJ.SecureLearn.Repositories;

import FCAJ.SecureLearn.Model.Course;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 *
 * @author ngoct
 */
@Repository
public interface CourseRepo extends CrudRepository<Course, UUID> {
    List<Course> findByInstructor(String instructor);
    List<Course> findByTitleContaining(String title);
    @Query("SELECT c FROM Course c JOIN c.chapter ch JOIN ch.lesson l WHERE l.id = :id")
    Course findByLessonId(@Param("id") UUID lessonId);
    @Override
    List<Course> findAll();

}
