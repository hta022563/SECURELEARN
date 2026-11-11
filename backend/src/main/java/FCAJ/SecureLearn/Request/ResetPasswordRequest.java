package FCAJ.SecureLearn.Request;

/**
 *
 * @author ngoct
 */
public class ResetPasswordRequest {
    String otp, newPassword, email;

    public ResetPasswordRequest() {
    }

    public ResetPasswordRequest(String otp, String password, String email) {
        this.otp = otp;
        this.newPassword = password;
        this.email = email;
    }

    public String getOtp() {
        return otp;
    }

    public void setOtp(String otp) {
        this.otp = otp;
    }

    public String getNewPassword() {
        return newPassword;
    }

    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }



    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

}
