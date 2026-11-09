/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Repositories;

import FCAJ.SecureLearn.Model.Enrollment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

/**
 *
 * @author ngoct
 */
@Repository
public interface EnrollmentRepo extends CrudRepository<Enrollment, UUID> {
    @Override
    List<Enrollment> findAll();

    List<Enrollment> findByEmail(String email);

    List<Enrollment> findByCourseId(UUID id);
    
    Enrollment findByEmailAndCourseId(String email, UUID id);
}
