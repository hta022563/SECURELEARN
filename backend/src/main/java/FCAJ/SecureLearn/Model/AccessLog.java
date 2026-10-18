/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 *
 * @author ngoct
 */
@Entity
public class AccessLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    String studentEmail, objectAccessed, currentUrl;
    LocalDateTime accessedTime;

    public AccessLog() {
    }

    public AccessLog(UUID id, String studentEmail, String objectAccessed, String currentUrl, LocalDateTime accessedTime) {
        this.id = id;
        this.studentEmail = studentEmail;
        this.objectAccessed = objectAccessed;
        this.currentUrl = currentUrl;
        this.accessedTime = accessedTime;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
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
