/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Request;

/**
 *
 * @author ngoct
 */
public class ConfirmRequest {
    String email, otp;
    

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getOtp() {
        return otp;
    }

    public void setOtp(String otp) {
        this.otp = otp;
    }

    public ConfirmRequest(String email, String otp) {
        this.email = email;
        this.otp = otp;
    }

    public ConfirmRequest() {
    }
    
}
