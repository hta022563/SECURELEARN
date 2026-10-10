package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Request.LoginRequest;
import FCAJ.SecureLearn.Request.RegisterRequest;
import FCAJ.SecureLearn.Service.AuthService;
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

    // -------------------------------------------------------------------------
    // Register
    // -------------------------------------------------------------------------

    /**
     * Creates a new Cognito account and assigns the requested role group.
     * The account is auto-confirmed so the user can log in immediately.
     *
     * Request body:
     * {
     *   "fullName": "Nguyen Van A",
     *   "email":    "user@example.com",
     *   "password": "Password123!",
     *   "role":     "student" | "instructor"
     * }
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
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

    // -------------------------------------------------------------------------
    // Login
    // -------------------------------------------------------------------------

    /**
     * Authenticates with Cognito USER_PASSWORD_AUTH and returns the token set.
     *
     * Request body:
     * { "email": "user@example.com", "password": "Password123!" }
     *
     * Response body:
     * {
     *   "accessToken":  "...",   // use this as Bearer token for API calls
     *   "idToken":      "...",   // contains user profile claims
     *   "refreshToken": "...",   // use to get new tokens when accessToken expires
     *   "expiresIn":    3600
     * }
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required."));
        }

        try {
            AuthenticationResultType result = authService.login(
                    request.getEmail().trim().toLowerCase(),
                    request.getPassword()
            );
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

    // -------------------------------------------------------------------------
    // Logout
    // -------------------------------------------------------------------------

    /**
     * Globally invalidates the caller's Cognito tokens.
     * The frontend should also clear its local token storage regardless of the response.
     *
     * Requires: Authorization: Bearer <accessToken>
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@AuthenticationPrincipal Jwt jwt) {
        if (jwt != null) {
            // The raw token value is the access token — pass it to Cognito GlobalSignOut
            authService.logout(jwt.getTokenValue());
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully."));
    }

    // -------------------------------------------------------------------------
    // Refresh Token
    // -------------------------------------------------------------------------

    /**
     * Exchanges a refresh token for a new access token and id token.
     *
     * Request body:
     * { "refreshToken": "...", "email": "user@example.com" }
     */
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

    // -------------------------------------------------------------------------
    // Me
    // -------------------------------------------------------------------------

    /**
     * Returns the claims from the caller's JWT — useful for the frontend to know
     * the current user's email, name, and role without a separate profile endpoint.
     *
     * Requires: Authorization: Bearer <accessToken>
     *
     * Response example:
     * {
     *   "sub":   "a1b2c3d4-...",
     *   "email": "user@example.com",
     *   "name":  "Nguyen Van A",
     *   "roles": ["STUDENT"]
     * }
     */
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
