package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Course;
import FCAJ.SecureLearn.Model.Enrollment;
import FCAJ.SecureLearn.Model.Status;
import FCAJ.SecureLearn.Repositories.CourseRepo;
import FCAJ.SecureLearn.Repositories.EnrollmentRepo;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 *
 * @author ngoct
 */
@Service
public class EnrollmentService {
    private final EnrollmentRepo enrollmentRepo;
    private final CourseRepo courseRepo;

    public EnrollmentService(EnrollmentRepo enrollmentRepo, CourseRepo courseRepo) {
        this.enrollmentRepo = enrollmentRepo;
        this.courseRepo = courseRepo;
    }

    public void createEnrollment(String email, UUID courseId) {
        Course enrolledCourse = findCourse(courseId, "enroll " + email);
        Enrollment newEnrollment = new Enrollment(email, enrolledCourse, Status.NOTSTARTED, LocalDateTime.now(), null);
        enrollmentRepo.save(newEnrollment);
    }

    public Enrollment getEnrollment(UUID enrollmentId) {
        return findEnrollment(enrollmentId, "get enrollment");
    }

    public List<Enrollment> getAllEnrollments() {
        return enrollmentRepo.findAll();
    }

    public List<Enrollment> getEnrollmentsByEmail(String email) {
        return enrollmentRepo.findByEmail(email);
    }

    public List<Enrollment> getEnrollmentsInCourse(UUID courseId) {
        return enrollmentRepo.findByCourseId(courseId);
    }

    public void updateEnrollment(UUID enrollmentId, String email, UUID courseId) {
        Enrollment enrollmentToUpdate = findEnrollment(enrollmentId, "update enrollment");
        Course newCourse = findCourse(courseId, "update enrollment " + enrollmentId);
        enrollmentToUpdate.setEmail(email);
        enrollmentToUpdate.setCourse(newCourse);
        enrollmentRepo.save(enrollmentToUpdate);
    }

    public void deleteEnrollment(UUID enrollmentId) {
        Enrollment enrollmentToDelete = findEnrollment(enrollmentId, "delete enrollment");
        enrollmentRepo.delete(enrollmentToDelete);
    }

    public boolean isEnrolledInCourse(String email, UUID courseId) {
        return enrollmentRepo.findByEmailAndCourseId(email, courseId) != null;
    }

    private Enrollment findEnrollment(UUID enrollmentId, String action) {
        return enrollmentRepo.findById(enrollmentId)
                .orElseThrow(() -> new NoSuchElementException(
                        "Cannot " + action + ": no enrollment found with id " + enrollmentId));
    }

    private Course findCourse(UUID courseId, String action) {
        return courseRepo.findById(courseId)
                .orElseThrow(() -> new NoSuchElementException(
                        "Cannot " + action + ": no course found with id " + courseId));
    }
}
