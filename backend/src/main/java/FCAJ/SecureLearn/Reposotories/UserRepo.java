/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Reposotories;

import FCAJ.SecureLearn.Model.Users;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

/**
 *
 * @author ngoct
 */
@Repository
public interface UserRepo extends CrudRepository<Users,Long>{
    Users findByUsername(String username);
}
