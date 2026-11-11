package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Configuration.LogAnnotationClass;
import FCAJ.SecureLearn.Model.ActionType;
import FCAJ.SecureLearn.Request.LoginRequest;
import FCAJ.SecureLearn.Request.RegisterRequest;
import FCAJ.SecureLearn.Response.UserAttributeDTO;
import FCAJ.SecureLearn.Response.UserListDTO;
import FCAJ.SecureLearn.Response.UserPage;
import FCAJ.SecureLearn.Service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    @LogAnnotationClass(ActionType.ADMIN_REGISTER)
    public ResponseEntity<?> register(@RequestBody RegisterRequest request, HttpServletRequest servletRequest,
            @AuthenticationPrincipal Jwt jwt) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required."));
        }
        if (request.getPassword() == null || request.getPassword().length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 8 characters."));
        }

        String normalizedEmail = request.getEmail().trim().toLowerCase();
        try {
            authService.adminRegister(request.getFullName(), normalizedEmail, request.getPassword(), request.getRole());
            return ResponseEntity.ok(Map.of(
                    "message", "Account created successfully. You can now log in.",
                    "email", normalizedEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Admin registration of " + normalizedEmail + " failed: " + e.getMessage()));
        }
    }

    @PostMapping("/update")
    @LogAnnotationClass(ActionType.ADMIN_UPDATE)
    public ResponseEntity<?> updateUserPassword(@RequestBody LoginRequest request, HttpServletRequest servletRequest,
            @AuthenticationPrincipal Jwt jwt) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required."));
        }
        if (request.getPassword() == null || request.getPassword().length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 8 characters."));
        }
        try {
            authService.updateAccountByAdmin(request.getEmail(), request.getPassword());
            return ResponseEntity.ok(Map.of("message", "Successfully updated user password"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Password update for " + request.getEmail() + " failed: " + e.getMessage()));
        }
    }

    @DeleteMapping("/delete")
    @LogAnnotationClass(ActionType.ADMIN_DELETE)
    public ResponseEntity<?> deleteUser(@RequestBody String email, HttpServletRequest servletRequest,
            @AuthenticationPrincipal Jwt jwt) {
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User email is required."));
        }
        try {
            authService.deleteAccount(email);
            return ResponseEntity.ok(Map.of("message", "Successfully deleted user"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Deleting user " + email + " failed: " + e.getMessage()));
        }
    }

    // GET /api/v1/admin/user?limit={number} returns the first page of users
    // GET /api/v1/admin/user?limit={number}&nextToken={token} returns the next page
    @GetMapping("/user")
    public ResponseEntity<?> getUserPage(
            @RequestParam(required = false) String nextToken,
            @RequestParam(defaultValue = "25") int limit) {
        if (limit < 1 || limit > 60) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Limit must be between 1 and 60, got " + limit + "."));
        }
        try {
            ListUsersResponse cognitoPage = authService.getUserPage(nextToken, limit);

            List<UserListDTO> users = cognitoPage.users().stream()
                    .map(user -> new UserListDTO(
                            user.username(),
                            user.attributes().stream()
                                    .map(attribute -> new UserAttributeDTO(attribute.name(), attribute.value()))
                                    .toList(),
                            authService.getUserRoles(user.username()).stream().findFirst().orElse("STUDENT"),
                            user.userStatus() == null ? null : user.userStatusAsString(),
                            user.enabled(),
                            user.userCreateDate(),
                            user.userLastModifiedDate()))
                    .toList();
            return ResponseEntity.ok(new UserPage(users, cognitoPage.paginationToken()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Listing users failed: " + e.getMessage()));
        }
    }
}
