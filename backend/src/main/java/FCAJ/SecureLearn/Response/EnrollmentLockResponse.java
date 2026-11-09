/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Response;

import FCAJ.SecureLearn.Model.Status;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 *
 * @author ngoct
 */
public record EnrollmentLockResponse (UUID courseId, Status status, LocalDateTime enrollmentDate, LocalDateTime completionDate)
{}
