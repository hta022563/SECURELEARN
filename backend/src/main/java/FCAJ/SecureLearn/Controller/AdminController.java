/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Request.LoginRequest;
import FCAJ.SecureLearn.Request.RegisterRequest;
import FCAJ.SecureLearn.Response.UserPage;
import FCAJ.SecureLearn.Service.AuthService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ListUsersResponse;

/**
 *
 * @author PC
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
     private final AuthService authService;

    public AdminController(AuthService authService) {
        this.authService = authService;
    }
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required."));
        }
        if (request.getPassword() == null || request.getPassword().length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 8 characters."));
        }

        try {
            if(request.getRole().equalsIgnoreCase("student")){
            authService.register(
                    request.getFullName(),
                    request.getEmail().trim().toLowerCase(),
                    request.getPassword(),
                    request.getRole()
            );
            return ResponseEntity.ok(Map.of(
                    "message", "Account created successfully. You can now log in.",
                    "email", request.getEmail().trim().toLowerCase()
            ));
            }else return ResponseEntity.badRequest().body(Map.of("message","Cannot register account, please contact admin if you want to add instructor or admin"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Registration failed. Please try again." + e.getMessage()));
        }
    }
    
    @PostMapping("/update")
    public ResponseEntity<?> updateUser(@RequestBody LoginRequest request){
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required."));
        }
        if (request.getPassword() == null || request.getPassword().length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 8 characters."));
        }
        try{
            authService.updateAccountByAdmin(request.getEmail(), request.getPassword());
            return ResponseEntity.ok(Map.of("message", "Successfully update user password"));
        }catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Update failed. Please try again." + e.getMessage()));
        }
    }
    
    @DeleteMapping("/delete")
    public ResponseEntity<?> deleteUser (@RequestBody String email){
        if(email == null || email.isBlank()){
            return ResponseEntity.badRequest().body(Map.of("error","User Email is required"));
        }
        try{
            authService.deleteAccount(email);
            return ResponseEntity.ok(Map.of("message", "Successfully delete"));
        }catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Deletion failed. Please try again." + e.getMessage()));
        }
    }
    
    //Request /api/v1/admin/user?limit={Number} to get a certain amount of user
    //Request /api/v1/admin/user?limit={Number}&nextToken=<token> to get the next batch of user
    @GetMapping("/user")
     public ResponseEntity<?> getUserPage(
             @RequestParam(required = false) String nextToken,
             @RequestParam(defaultValue = "25") int limit) {
        if (limit < 1 || limit > 60) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Limit must be between 1 and 60."));
        }
        try{
            ListUsersResponse result = authService.getUserPage(nextToken, limit);
            return ResponseEntity.ok(new UserPage(result.users(), result.paginationToken()));
        }catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Get List failed. Please try again." + e.getMessage()));
        }
    }
}
