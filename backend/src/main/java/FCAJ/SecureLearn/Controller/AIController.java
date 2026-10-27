/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Model.AccessLog;
import FCAJ.SecureLearn.Model.ActionType;
import FCAJ.SecureLearn.Service.LogService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 *
 * @author ngoct
 */
@RestController
@RequestMapping("/api/v1/ai")
public class AIController {
    private final LogService logService;

    public AIController(LogService logService) {
        this.logService = logService;
    }
    
    @GetMapping("/logs")
    public ResponseEntity<?> getAllLogForToday(){
      List<AccessLog> logList = new ArrayList();
       for(ActionType action : ActionType.values()){
           logList.addAll(logService.getLogInDay(action));
       }
       return ResponseEntity.ok(logList);
    }
    
    
}
