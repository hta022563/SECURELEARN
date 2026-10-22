/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.AccessLog;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.PageIterable;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

/**
 *
 * @author ngoct
 */
@Service
public class LogService {
   private final DynamoDbEnhancedClient enhancedClient;
   private final AuthService authService;
    final DynamoDbTable<AccessLog> logTable;
    public LogService(DynamoDbEnhancedClient enhancedClient, AuthService authService) {
        this.enhancedClient = enhancedClient;
        this.authService = authService;
        logTable = enhancedClient.table("AccessLog", TableSchema.fromBean(AccessLog.class));
    }

    // Takes the Cognito username from the JWT and logs under the user's email
    public void createLog(String username, String actionType, LocalDateTime accessedTime, String ipAddress){
        createLogWithEmail(authService.getEmailByUsername(username), actionType, accessedTime, ipAddress);
    }

    // Use when the email is already known (e.g. login) to skip the Cognito lookup
    public void createLogWithEmail(String userId, String actionType, LocalDateTime accessedTime, String ipAddress){
        QueryConditional userQuery = QueryConditional.keyEqualTo(Key.builder().addPartitionValue(userId).build());
        PageIterable<AccessLog> logList = logTable.query(userQuery);
        int count = 1;
        switch(actionType){
                case "Login" ->{
                    for(AccessLog log : logList.items()){
                        if(log.getLogId().startsWith("ACC")){
                            count ++;
                        }
                    }
                    String logId = "ACC" + String.format("%04d", count);
                    AccessLog newLog = new AccessLog(logId, userId, accessedTime,actionType, ipAddress);
                    logTable.putItem(newLog);
                }
                
                case "Playback" -> {
                    for(AccessLog log : logList.items()){
                        if(log.getLogId().startsWith("VID")){
                            count ++;
                        }
                    }
                    String logId = "VID" + String.format("%04d", count);
                    AccessLog newLog = new AccessLog(logId, userId, accessedTime,actionType, ipAddress);
                    logTable.putItem(newLog);
                }
                
                case "Key" -> {
                    for(AccessLog log : logList.items()){
                        if(log.getLogId().startsWith("VID")){
                            count ++;
                        }
                    }
                    String logId = "VID" + String.format("%04d", count);
                    AccessLog newLog = new AccessLog(logId, userId, accessedTime,actionType, ipAddress);
                    logTable.putItem(newLog);
                }
                
                case "AdminRegister" -> {
                    for(AccessLog log : logList.items()){
                        if(log.getLogId().startsWith("ADM")){
                            count ++;
                        }
                    }
                    String logId = "ADM" + String.format("%04d", count);
                    AccessLog newLog = new AccessLog(logId, userId, accessedTime,actionType, ipAddress);
                    logTable.putItem(newLog);
                }
                
                case "AdminDelete" -> {
                    for(AccessLog log : logList.items()){
                        if(log.getLogId().startsWith("ADM")){
                            count ++;
                        }
                    }
                    String logId = "ADM" + String.format("%04d", count);
                    AccessLog newLog = new AccessLog(logId, userId, accessedTime,actionType, ipAddress);
                    logTable.putItem(newLog);
                }
                case "AdminUpdate" -> {
                    for(AccessLog log : logList.items()){
                        if(log.getLogId().startsWith("ADM")){
                            count ++;
                        }
                    }
                    String logId = "ADM" + String.format("%04d", count);
                    AccessLog newLog = new AccessLog(logId, userId, accessedTime,actionType, ipAddress);
                    logTable.putItem(newLog);
                }
                case "CourseDeletion" ->{
                    for(AccessLog log : logList.items()){
                        if(log.getLogId().startsWith("COU")){
                            count ++;
                        }
                    }
                    String logId = "COU" + String.format("%04d", count);
                    AccessLog newLog = new AccessLog(logId, userId, accessedTime,actionType, ipAddress);
                    logTable.putItem(newLog);
                }
                case "ChapterDeletion" ->{
                    for(AccessLog log : logList.items()){
                        if(log.getLogId().startsWith("COU")){
                            count ++;
                        }
                    }
                    String logId = "COU" + String.format("%04d", count);
                    AccessLog newLog = new AccessLog(logId, userId, accessedTime,actionType, ipAddress);
                    logTable.putItem(newLog);
                }
                case "VideoDeletion" ->{
                    for(AccessLog log : logList.items()){
                        if(log.getLogId().startsWith("COU")){
                            count ++;
                        }
                    }
                    String logId = "COU" + String.format("%04d", count);
                    AccessLog newLog = new AccessLog(logId, userId, accessedTime,actionType, ipAddress);
                    logTable.putItem(newLog);
                }
                default ->{
                    for(AccessLog log : logList.items()){
                        if(log.getLogId().startsWith("UNK")){
                            count ++;
                        }
                    }
                    String logId = "UNK" + String.format("%04d", count);
                    AccessLog newLog = new AccessLog(logId, userId, accessedTime,actionType, ipAddress);
                    logTable.putItem(newLog);
                }
    }
    }
    
}
