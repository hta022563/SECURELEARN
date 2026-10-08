/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.repositories;

import FCAJ.SecureLearn.Model.Course;
import java.util.List;
import java.util.UUID;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

/**
 *
 * @author ngoct
 */
@Repository
public interface CourseRepo extends CrudRepository<Course, UUID> {
    List<Course> findByInstructor(String instructor);
    List<Course> findByTitleContaining(String title);
    @Override
    List<Course> findAll();
    
}
