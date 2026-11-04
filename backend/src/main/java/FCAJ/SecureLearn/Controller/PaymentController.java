/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Model.Course;
import FCAJ.SecureLearn.Repositories.CourseRepo;
import FCAJ.SecureLearn.Request.MomoCreatePaymentRequest;
import FCAJ.SecureLearn.Request.MomoPaymentCreationResponse;
import FCAJ.SecureLearn.Service.CourseService;
import FCAJ.SecureLearn.Service.MomoService;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

/**
 *
 * @author ngoct
 */
@RestController
public class PaymentController {
   
    @PostMapping("api/v1/enrollment/{id}")
    public ResponseEntity<?> createPayment(@PathVariable UUID id){
        
        
        
        try{
            
            
        }catch(Exception e){
            return ResponseEntity.badRequest().body("It didnt work");
        }
    }
}
