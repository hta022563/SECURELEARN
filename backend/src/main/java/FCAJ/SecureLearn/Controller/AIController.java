package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Model.AccessLog;
import FCAJ.SecureLearn.Model.ActionType;
import FCAJ.SecureLearn.Service.LogService;
import java.util.ArrayList;
import java.util.List;
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
    public ResponseEntity<?> getAllLogsForToday() {
        List<AccessLog> todaysLogs = new ArrayList<>();
        for (ActionType actionType : ActionType.values()) {
            todaysLogs.addAll(logService.getLogsForToday(actionType));
        }
        return ResponseEntity.ok(todaysLogs);
    }
}
