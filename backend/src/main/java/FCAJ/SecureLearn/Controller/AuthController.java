package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Configuration.LogAnnotationClass;
import FCAJ.SecureLearn.Model.ActionType;
import FCAJ.SecureLearn.Request.ConfirmRequest;
import FCAJ.SecureLearn.Request.LoginRequest;
import FCAJ.SecureLearn.Request.PasswordChangeRequest;
import FCAJ.SecureLearn.Request.RegisterRequest;
import FCAJ.SecureLearn.Request.ResetPasswordRequest;
import FCAJ.SecureLearn.Service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
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

    public AuthController(AuthService authService) {
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

        String normalizedEmail = request.getEmail().trim().toLowerCase();
        try {
            if (!"student".equalsIgnoreCase(request.getRole())) {
                return ResponseEntity.badRequest().body(Map.of("message",
                        "Cannot self-register as role '" + request.getRole()
                                + "'. Please contact an admin to create instructor or admin accounts."));
            }
            authService.register(request.getFullName(), normalizedEmail, request.getPassword(), request.getRole());
            return ResponseEntity.ok(Map.of(
                    "message", "Account created successfully. You can now log in.",
                    "email", normalizedEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Registration of " + normalizedEmail + " failed: " + e.getMessage()));
        }
    }

    @PostMapping("/otp")
    public ResponseEntity<?> confirmSignUp(@RequestBody ConfirmRequest request) {
        if (request.getEmail() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required."));
        }
        try {
            authService.registerConfirmation(request.getOtp(), request.getEmail());
            return ResponseEntity.ok("Signup complete. Your account is registered");
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Sign-up confirmation failed: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    @LogAnnotationClass(ActionType.LOGIN)
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        if (request.getEmail() == null || request.getEmail().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required."));
        }

        String normalizedEmail = request.getEmail().trim().toLowerCase();
        try {
            AuthenticationResultType tokens = authService.login(normalizedEmail, request.getPassword());
            // LogInterceptor reads this attribute because there is no JWT yet during login
            servletRequest.setAttribute("username", normalizedEmail);
            return ResponseEntity.ok(Map.of(
                    "accessToken",  tokens.accessToken(),
                    "idToken",      tokens.idToken(),
                    "refreshToken", tokens.refreshToken(),
                    "expiresIn",    tokens.expiresIn()   // seconds until accessToken expires (typically 3600)
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Login for " + normalizedEmail + " failed: " + e.getMessage()));
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
            AuthenticationResultType tokens = authService.refreshToken(refreshToken, email);
            return ResponseEntity.ok(Map.of(
                    "accessToken", tokens.accessToken(),
                    "idToken",     tokens.idToken(),
                    "expiresIn",   tokens.expiresIn()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Token refresh for " + email + " failed: " + e.getMessage()));
        }
    }

    @PostMapping("/password")
    public ResponseEntity<?> changePassword(@RequestBody PasswordChangeRequest request) {
        if (request.getAccessToken() == null || request.getAccessToken().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "accessToken is required."));
        }
        if (request.getOldPassword() == null || request.getOldPassword().length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "Old password must be at least 8 characters."));
        }
        if (request.getNewPassword() == null || request.getNewPassword().length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "New password must be at least 8 characters."));
        }
        try {
            authService.updateAccountByUser(request.getAccessToken(), request.getNewPassword(), request.getOldPassword());
            return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Password change failed: " + e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "Email was not provided"));
        }
        try {
            authService.forgotPassword(email);
            return ResponseEntity.ok("An OTP is sent to your email");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Forgot-password request for " + email + " failed: " + e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        if (request.getEmail() == null || request.getEmail().isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Email was not provided"));
        }
        if (request.getNewPassword() == null || request.getNewPassword().isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "New password was not provided"));
        }
        if (request.getOtp() == null || request.getOtp().isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "One-time password was not provided"));
        }

        try {
            authService.resetPassword(request.getOtp(), request.getEmail(), request.getNewPassword());
            return ResponseEntity.ok("Password changed successfully. Please log in again");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Password reset for " + request.getEmail() + " failed: " + e.getMessage()));
        }
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "Email was not provided"));
        }
        authService.resendOtp(email);
        return ResponseEntity.ok("OTP has been resent");
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
