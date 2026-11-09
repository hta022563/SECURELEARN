/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Model;

import java.util.UUID;

/**
 *
 * @author ngoct
 */
public record CurrentOrders(
        String orderId,
        UUID courseId,
        String email
){}
