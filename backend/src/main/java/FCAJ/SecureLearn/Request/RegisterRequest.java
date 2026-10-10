package FCAJ.SecureLearn.Request;

/**
 * Request body for POST /api/v1/auth/register
 * role must be one of: student, instructor
 * (admin accounts are created directly in the Cognito console)
 */
public class RegisterRequest {
    private String fullName;
    private String email;
    private String password;
    /** "student" or "instructor" */
    private String role;

    public RegisterRequest() {}

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
