/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Model.Users;
import FCAJ.SecureLearn.Service.AuthService;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.http.HttpStatus;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 *
 * @author ngoct
 */
@RestController
public class UserController {
    private final AuthService authentication;

    public UserController(AuthService authentication) {
        this.authentication = authentication;
    }
    
    @PostMapping("/login")
    public ResponseEntity<?> login (@RequestBody LoginRequest request){
        Users loggedInUser = authentication.login(request.getUsername(), request.getPassword());
        if(loggedInUser != null){
            return ResponseEntity.ok(loggedInUser);
        }else return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid username or password"));
    }
    
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request){
        LocalDateTime currentTime = LocalDateTime.now();
        authentication.addNewUsers(request.getUsername(), request.getPassword(), request.getRole(), currentTime);
        return ResponseEntity.ok().body("Created New Account successfully");
    }
}
