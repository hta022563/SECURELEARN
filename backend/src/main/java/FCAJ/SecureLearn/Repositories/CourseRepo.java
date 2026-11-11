/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
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
    @Query("SELECT c from Course c Join c.chapter ch join ch.lesson l where l.id= :id  ")
    Course findbyLessonId(@Param("id") UUID lessonId);
    @Override
    List<Course> findAll();
    
}
