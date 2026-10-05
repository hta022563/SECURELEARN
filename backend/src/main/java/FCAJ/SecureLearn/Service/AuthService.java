/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Users;
import FCAJ.SecureLearn.Model.Users.Role;
import FCAJ.SecureLearn.Reposotories.UserRepo;
import java.time.LocalDateTime;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 *
 * @author ngoct
 */
@Service
public class AuthService {
    private final UserRepo userRepo;
    private final PasswordEncoder passwordEncoder;
    
    public AuthService(UserRepo userRepo, PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.passwordEncoder = null;
    }
    
    public Users login(String username, String password){
        Users loggedInUser = userRepo.findByUsername(username);
        if(loggedInUser != null){
            if(passwordEncoder.matches(password, loggedInUser.getPassword())){
                return loggedInUser;
            }else{
                return null;
            }
        }
        
        return null;
    }
    public void addNewUsers(String username, String password, Role role, LocalDateTime created_at){
        String password_hash = passwordEncoder.encode(password);
        Users newUser = new Users(username,password_hash,role,created_at);
        userRepo.save(newUser);
    }
}
