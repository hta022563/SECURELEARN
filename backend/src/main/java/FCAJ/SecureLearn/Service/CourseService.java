package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Course;
import FCAJ.SecureLearn.Repositories.CourseRepo;
import java.time.LocalDateTime;
import java.util.ArrayList;
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
    private final SubjectService subjectService;

    public CourseService(CourseRepo courseRepo, SubjectService subjectService) {
        this.courseRepo = courseRepo;
        this.subjectService = subjectService;
    }

    public void addNewCourse(String title, String description, String instructor, long price,
            LocalDateTime creationTime, LocalDateTime lastUpdatedTime, UUID subjectId) {
        Course newCourse = new Course(title, description, price, instructor, creationTime, lastUpdatedTime);
        newCourse.setSubject(subjectService.findSubject(subjectId, "create course"));
        courseRepo.save(newCourse);
    }

    public List<Course> getAllCourses() {
        return courseRepo.findAll();
    }

    public List<Course> searchCoursesByTitle(String title) {
        return courseRepo.findByTitleContaining(title);
    }

    public void updateCourse(UUID courseId, String title, String description, String instructor, long price,
            LocalDateTime lastUpdatedTime, UUID subjectId) {
        Course courseToUpdate = findCourse(courseId, "update course");
        // subjectId is optional on update: null keeps the current subject.
        if (subjectId != null) {
            courseToUpdate.setSubject(subjectService.findSubject(subjectId, "update course"));
        }
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
    
    public List<Course> getOwnedrCourse(String email){
        List<Course> ownedCourse = new ArrayList();
        List<Course> allCourse = getAllCourses();
        for(Course course : allCourse){
            if(course.getInstructor().equals(email)){
                ownedCourse.add(course);
            }
        }
        return ownedCourse;
        
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
