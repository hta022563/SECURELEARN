package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Model.ActionType;
import FCAJ.SecureLearn.Request.ConfirmRequest;
import FCAJ.SecureLearn.Request.LoginRequest;
import FCAJ.SecureLearn.Request.PasswordChangeRequest;
import FCAJ.SecureLearn.Request.RegisterRequest;
import FCAJ.SecureLearn.Request.ResetPasswordRequest;
import FCAJ.SecureLearn.Service.AuthService;
import FCAJ.SecureLearn.Service.LogService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthenticationResultType;

import java.util.List;
import java.util.Map;

/**
 * REST controller for email/password authentication backed by AWS Cognito.
 *
 * All endpoints live under /api/v1/auth — they are declared public in
 * SecurityConfiguration so no Bearer token is needed to call them.
 *
 * POST /api/v1/auth/register   — create a Cognito account and assign a role group
 * POST /api/v1/auth/login      — authenticate and receive Cognito JWTs
 * POST /api/v1/auth/logout     — globally invalidate the caller's tokens
 * POST /api/v1/auth/refresh    — exchange a refresh token for new access/id tokens
 * GET  /api/v1/auth/me         — return the claims of the currently authenticated user
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final LogService logService;

    public AuthController(AuthService authService, LogService logService) {
        this.authService = authService;
        this.logService = logService;
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
    
    @PostMapping("/otp")
    public ResponseEntity<?> confirmSignUp(@RequestBody ConfirmRequest request){
        if(request.getEmail() == null){
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required."));
        }
        try{
            authService.registerConfirmation(request.getOtp(), request.getEmail());
            return ResponseEntity.ok("Signup complete. Your account is registered");
        }catch (RuntimeException e){
            return ResponseEntity.internalServerError().body(Map.of("error","Registration failed. Please try again" + e.getMessage()));
        }
    }
   
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        if (request.getEmail() == null || request.getEmail().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required."));
        }

        try {
            AuthenticationResultType result = authService.login(
                    request.getEmail().trim().toLowerCase(),
                    request.getPassword()
            );
            logService.createLogWithEmail(request.getEmail().trim().toLowerCase(), ActionType.LOGIN, LocalDateTime.now(),servletRequest.getRemoteAddr());
            logService.getLogInDay(ActionType.LOGIN);
            return ResponseEntity.ok(Map.of(
                    "accessToken",  result.accessToken(),
                    "idToken",      result.idToken(),
                    "refreshToken", result.refreshToken(),
                    "expiresIn",    result.expiresIn()   // seconds until accessToken expires (typically 3600)
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Login failed. Please try again." + e.getMessage()));
        }
    }

    
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@AuthenticationPrincipal Jwt jwt) {
        if (jwt != null) {
            // The raw token value is the access token — pass it to Cognito GlobalSignOut
            authService.logout(jwt.getTokenValue());
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully."));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        String email = body.get("email");

        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "refreshToken is required."));
        }

        try {
            AuthenticationResultType result = authService.refreshToken(refreshToken, email);
            return ResponseEntity.ok(Map.of(
                    "accessToken", result.accessToken(),
                    "idToken",     result.idToken(),
                    "expiresIn",   result.expiresIn()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Token refresh failed."));
        }
    }
    
    @PostMapping("/password")
    public ResponseEntity<?> changePassword(@RequestBody PasswordChangeRequest request){
        if (request.getAccessToken() == null || request.getAccessToken().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required."));
        }
        if (request.getOldPassword() == null || request.getOldPassword().length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 8 characters."));
        }
        if (request.getNewPassword() == null || request.getNewPassword().length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 8 characters."));
        }
        try{
            authService.updateAccountByUser(request.getAccessToken(), request.getNewPassword(), request.getOldPassword());
            return ResponseEntity.ok(Map.of("message", "Change password successfully"));
        }
        catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Update password fail"));
        }
    }
    
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgetPassword(@RequestBody Map<String,String> email){
        if (email.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Email was not provided"));
        }
        try{
            authService.forgetPassword(email.get("email"));
            return ResponseEntity.ok("An OTP is sent to your email");
        }catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Update password fail" + e.getMessage()));
        }   
    }
    
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request){
        if(request.getEmail().isEmpty()){
            return ResponseEntity.status(401).body(Map.of("error", "Email was not provided"));
        }
        if(request.getNewPassword().isEmpty()){
            return ResponseEntity.status(401).body(Map.of("error", "Password was not provided"));
        }
        if(request.getOtp().isEmpty()){
            return ResponseEntity.status(401).body(Map.of("error", "One time password was not provided"));
        }
        
        try{
            authService.resetPassword(request.getOtp(), request.getEmail(), request.getNewPassword());
            return ResponseEntity.ok("Successfully change password. Please log in again");
        }catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Update password fail"));
        }   
    }
    
    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendCode(@RequestBody Map<String,String> email){
         if(email.isEmpty()){
            return ResponseEntity.status(401).body(Map.of("error", "Email was not provided"));
        }
         authService.resendOtp(email.get("email"));
         return ResponseEntity.ok("OTP has been resend");
    }
    
    
    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated."));
        }

        List<String> groups = jwt.getClaimAsStringList("cognito:groups");
        return ResponseEntity.ok(Map.of(
                "sub",    jwt.getSubject(),
                "email",  jwt.getClaimAsString("email") != null
                            ? jwt.getClaimAsString("email")
                            : jwt.getClaimAsString("username"),
                "name",   jwt.getClaimAsString("name") != null
                            ? jwt.getClaimAsString("name")
                            : "",
                "roles",  groups != null ? groups : List.of()
        ));
    }
    
}
