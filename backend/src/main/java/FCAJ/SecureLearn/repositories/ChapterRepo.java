/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.repositories;

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
    
    List<Chapter> findByCourseId(UUID id);
}
