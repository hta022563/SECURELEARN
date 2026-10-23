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

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;
/**
 *
 * @author ngoct
 */
@DynamoDbBean
public class AccessLog {
   
    private String logId;
    String userEmail;
    LocalDateTime accessedTime;
    String actionType, ipAddress;
    UUID lessonId;
    public AccessLog() {
    }

    public AccessLog(String logId, String userId, LocalDateTime accessedTime, String actionType, String ipAddress) {
        this.logId = logId;
        this.userEmail = userId;
        this.accessedTime = accessedTime;
        this.actionType = actionType;
        this.ipAddress = ipAddress;
    }

    public AccessLog(String logId, String userEmail, LocalDateTime accessedTime, String actionType, String ipAddress, UUID lessonId) {
        this.logId = logId;
        this.userEmail = userEmail;
        this.accessedTime = accessedTime;
        this.actionType = actionType;
        this.ipAddress = ipAddress;
        this.lessonId = lessonId;
    }

   
    @DynamoDbSortKey
    public String getLogId() {
        return logId;
    }

    public void setLogId(String logId) {
        this.logId = logId;
    }
    @DynamoDbPartitionKey
    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }
    
    
    public LocalDateTime getAccessedTime() {
        return accessedTime;
    }

    
    
    public void setAccessedTime(LocalDateTime accessedTime) {
        this.accessedTime = accessedTime;
    }

    public String getActionType() {
        return actionType;
    }

    public void setActionType(String actionType) {
        this.actionType = actionType;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public UUID getLessonId() {
        return lessonId;
    }

    public void setLessonId(UUID lessonId) {
        this.lessonId = lessonId;
    }

   

    
}
