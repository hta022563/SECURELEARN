/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Course;
import FCAJ.SecureLearn.Model.Enrollment;
import FCAJ.SecureLearn.Model.Status;
import FCAJ.SecureLearn.Repositories.CourseRepo;
import FCAJ.SecureLearn.Repositories.EnrollmentRepo;
import java.time.LocalDateTime;
import java.util.List;
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

    public void createEnrollment(String email, UUID course_id){
        Course course = courseRepo.findById(course_id).orElseThrow();
        Enrollment newEnrollment = new Enrollment(email, course, Status.NOTSTARTED, LocalDateTime.now(), null);
        enrollmentRepo.save(newEnrollment);
    }

    public Enrollment getEnrollment(UUID id){
        return enrollmentRepo.findById(id).orElseThrow();
    }

    public List<Enrollment> getAllEnrollments(){
        return enrollmentRepo.findAll();
    }

    public List<Enrollment> getEnrollmentsByEmail(String email){
        return enrollmentRepo.findByEmail(email);
    }

    public List<Enrollment> getEnrollmentsInCourse(UUID course_id){
        return enrollmentRepo.findByCourseId(course_id);
    }

    public void updateEnrollment(UUID enrollment_id, String email, UUID course_id){
        Enrollment updatedEnrollment = enrollmentRepo.findById(enrollment_id).orElseThrow();
        Course course = courseRepo.findById(course_id).orElseThrow();
        updatedEnrollment.setEmail(email);
        updatedEnrollment.setCourse(course);
        enrollmentRepo.save(updatedEnrollment);
    }

    public void deleteEnrollment(UUID id){
        Enrollment targetEnrollment = enrollmentRepo.findById(id).orElseThrow();
        enrollmentRepo.delete(targetEnrollment);
    }
}
