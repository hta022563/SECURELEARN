/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Request.LoginRequest;
import FCAJ.SecureLearn.Request.RegisterRequest;
import FCAJ.SecureLearn.Response.UserAttributeDTO;
import FCAJ.SecureLearn.Response.UserListDTO;
import FCAJ.SecureLearn.Response.UserPage;
import FCAJ.SecureLearn.Service.AuthService;
import FCAJ.SecureLearn.Service.LogService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ListUsersResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.UserType;

/**
 *
 * @author PC
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
     private final AuthService authService;
     private final LogService logService;

    public AdminController(AuthService authService, LogService logService) {
        this.authService = authService;
        this.logService = logService;
    }
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request, HttpServletRequest servletRequest, @AuthenticationPrincipal Jwt jwt) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required."));
        }
        if (request.getPassword() == null || request.getPassword().length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 8 characters."));
        }

        try {
            authService.register(
                    request.getFullName(),
                    request.getEmail().trim().toLowerCase(),
                    request.getPassword(),
                    request.getRole()
            );
            logService.createLog(jwt.getClaimAsString("username"),"AdminRegister", LocalDateTime.now(), servletRequest.getRemoteAddr());
            return ResponseEntity.ok(Map.of(
                    "message", "Account created successfully. You can now log in.",
                    "email", request.getEmail().trim().toLowerCase()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Registration failed. Please try again." + e.getMessage()));
        }
    }
    
    @PostMapping("/update")
    public ResponseEntity<?> updateUser(@RequestBody LoginRequest request, HttpServletRequest servletRequest, @AuthenticationPrincipal Jwt jwt){
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required."));
        }
        if (request.getPassword() == null || request.getPassword().length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 8 characters."));
        }
        try{
            authService.updateAccountByAdmin(request.getEmail(), request.getPassword());
            logService.createLog(jwt.getClaimAsString("username"),"AdminUpdate", LocalDateTime.now(), servletRequest.getRemoteAddr());
            return ResponseEntity.ok(Map.of("message", "Successfully update user password"));
        }catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Update failed. Please try again." + e.getMessage()));
        }
    }
    
    @DeleteMapping("/delete")
    public ResponseEntity<?> deleteUser (@RequestBody String email, HttpServletRequest servletRequest, @AuthenticationPrincipal Jwt jwt){
        if(email == null || email.isBlank()){
            return ResponseEntity.badRequest().body(Map.of("error","User Email is required"));
        }
        try{
            authService.deleteAccount(email);
            logService.createLog(jwt.getClaimAsString("username"),"AdminDelete", LocalDateTime.now(), servletRequest.getRemoteAddr());
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
            
            List<UserListDTO> userList = result.users().stream().map(user -> new UserListDTO(user.username(),
                    user.attributes().stream().map(attribute -> new UserAttributeDTO(attribute.name(), 
                            attribute.value())).toList(),
                    authService.getUserRole(user.username()).stream().findFirst().orElse("STUDENT"),
                    user.userStatus()== null ? null : user.userStatusAsString(),
                    user.enabled(),
                    user.userCreateDate(),
                    user.userLastModifiedDate())).toList();
            return ResponseEntity.ok(new UserPage(userList, result.paginationToken()));
        }catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Get List failed. Please try again." + e.getMessage()));
        }
    }
}
