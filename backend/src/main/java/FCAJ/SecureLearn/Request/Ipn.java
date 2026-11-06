/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Request;

/**
 *
 * @author PC
 */
public record Ipn(
    String partnerCode,
    String orderId,
    String requestId,
    long amount,
    String orderInfo,
    String orderType,
    int transId,
    int resultCode,
    String message,
    String payType,
    int responseTime,
    String extraData,
    String signature
){}
