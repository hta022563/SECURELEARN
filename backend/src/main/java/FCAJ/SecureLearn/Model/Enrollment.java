/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Model;


import java.time.LocalDateTime;

/**
 *
 * @author ngoct
 */

public class Enrollment {
   
    private long id;
    enum status {NOTSTARTED, INPROGRESS, COMPLETED};
    int userId;
    int courseId;
    status currentStatus;
    LocalDateTime enrollmentDate;
    LocalDateTime completionDate;

    public Enrollment() {
    }

    public Enrollment(int userId, int courseId, status currentStatus, LocalDateTime enrollmentDate, LocalDateTime completionDate) {
        this.userId = userId;
        this.courseId = courseId;
        this.currentStatus = currentStatus;
        this.enrollmentDate = enrollmentDate;
        this.completionDate = completionDate;
    }

  

    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    public int getCourseId() {
        return courseId;
    }

    public void setCourseId(int courseId) {
        this.courseId = courseId;
    }

    public LocalDateTime getEnrollmentDate() {
        return enrollmentDate;
    }

    public void setEnrollmentDate(LocalDateTime enrollmentDate) {
        this.enrollmentDate = enrollmentDate;
    }

    public LocalDateTime getCompletionDate() {
        return completionDate;
    }

    public void setCompletionDate(LocalDateTime completionDate) {
        this.completionDate = completionDate;
    }
    
   
    
}
