package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Course;
import FCAJ.SecureLearn.Repositories.CourseRepo;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Service for creating, reading, updating and deleting courses.
 *
 * @author ngoct
 */
@Service
public class CourseService {
    private final CourseRepo courseRepo;

    public CourseService(CourseRepo courseRepo) {
        this.courseRepo = courseRepo;
    }

    public void addNewCourse(String title, String description, String instructor, long price,
            LocalDateTime creationTime, LocalDateTime lastUpdatedTime) {
        Course newCourse = new Course(title, description, price, instructor, creationTime, lastUpdatedTime);
        courseRepo.save(newCourse);
    }

    public List<Course> getAllCourses() {
        return courseRepo.findAll();
    }

    public List<Course> searchCoursesByTitle(String title) {
        return courseRepo.findByTitleContaining(title);
    }

    public void updateCourse(UUID courseId, String title, String description, String instructor, long price,
            LocalDateTime lastUpdatedTime) {
        Course courseToUpdate = findCourse(courseId, "update course");
        courseToUpdate.setTitle(title);
        courseToUpdate.setDescription(description);
        courseToUpdate.setInstructor(instructor);
        courseToUpdate.setPrice(price);
        courseToUpdate.setLastUpdateTime(lastUpdatedTime);
        courseRepo.save(courseToUpdate);
    }

    public Course getCourseByLessonId(UUID lessonId) {
        Course course = courseRepo.findByLessonId(lessonId);
        if (course == null) {
            throw new NoSuchElementException("No course found containing lesson with id " + lessonId);
        }
        return course;
    }

    public void deleteCourse(UUID courseId) {
        Course courseToDelete = findCourse(courseId, "delete course");
        courseRepo.delete(courseToDelete);
    }

    public long getCoursePrice(UUID courseId) {
        return findCourse(courseId, "get course price").getPrice();
    }

    private Course findCourse(UUID courseId, String action) {
        return courseRepo.findById(courseId)
                .orElseThrow(() -> new NoSuchElementException(
                        "Cannot " + action + ": no course found with id " + courseId));
    }
}
