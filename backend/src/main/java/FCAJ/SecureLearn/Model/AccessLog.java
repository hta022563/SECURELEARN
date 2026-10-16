/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Model;

import jakarta.persistence.Entity;
import java.time.LocalDateTime;

/**
 *
 * @author ngoct
 */
@Entity
public class AccessLog {
    String id, studentEmail, objectAccessed, currentUrl;
    LocalDateTime accessedTime;

    public AccessLog() {
    }

    public AccessLog(String id, String studentEmail, String objectAccessed, String currentUrl, LocalDateTime accessedTime) {
        this.id = id;
        this.studentEmail = studentEmail;
        this.objectAccessed = objectAccessed;
        this.currentUrl = currentUrl;
        this.accessedTime = accessedTime;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getStudentEmail() {
        return studentEmail;
    }

    public void setStudentEmail(String studentEmail) {
        this.studentEmail = studentEmail;
    }

    public String getObjectAccessed() {
        return objectAccessed;
    }

    public void setObjectAccessed(String objectAccessed) {
        this.objectAccessed = objectAccessed;
    }

    public String getCurrentUrl() {
        return currentUrl;
    }

    public void setCurrentUrl(String currentUrl) {
        this.currentUrl = currentUrl;
    }

    public LocalDateTime getAccessedTime() {
        return accessedTime;
    }

    public void setAccessedTime(LocalDateTime accessedTime) {
        this.accessedTime = accessedTime;
    }
    
    
}
