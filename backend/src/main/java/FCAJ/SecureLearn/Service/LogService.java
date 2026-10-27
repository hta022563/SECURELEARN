/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.AccessLog;
import FCAJ.SecureLearn.Model.ActionType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Month;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.pagination.sync.SdkIterable;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
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
    public void createLog(String username, ActionType actionType, LocalDateTime accessedTime, String ipAddress){
        createLogWithEmail(authService.getEmailByUsername(username), actionType, accessedTime, ipAddress);
    }

    // Use when the email is already known (e.g. login) to skip the Cognito lookup
    public void createLogWithEmail(String userId, ActionType actionType, LocalDateTime accessedTime, String ipAddress){
        QueryConditional userQuery = QueryConditional.keyEqualTo(Key.builder().addPartitionValue(userId).build());
        PageIterable<AccessLog> logList = logTable.query(userQuery);
        int count = 1;
        switch(actionType){
                case LOGIN ->{
                    for(AccessLog log : logList.items()){
                        if(log.getLogId().startsWith("ACC")){
                            count ++;
                        }
                    }
                    String logId = "ACC" + String.format("%04d", count);
                    AccessLog newLog = new AccessLog(logId, userId, accessedTime,actionType, ipAddress);
                    logTable.putItem(newLog);
                }
                
                case PLAYBACK -> {
                    for(AccessLog log : logList.items()){
                        if(log.getLogId().startsWith("VID")){
                            count ++;
                        }
                    }
                    String logId = "VID" + String.format("%04d", count);
                    AccessLog newLog = new AccessLog(logId, userId, accessedTime,actionType, ipAddress);
                    logTable.putItem(newLog);
                }
                
                case ADMIN_REGISTER,ADMIN_DELETE, ADMIN_UPDATE -> {
                    for(AccessLog log : logList.items()){
                        if(log.getLogId().startsWith("ADM")){
                            count ++;
                        }
                    }
                    String logId = "ADM" + String.format("%04d", count);
                    AccessLog newLog = new AccessLog(logId, userId, accessedTime,actionType, ipAddress);
                    logTable.putItem(newLog);
                }
                
                case COURSE_DELETION, CHAPTER_DELETION,VIDEO_DELETION ->{
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
    
    public void createVideoLog(String username, ActionType actionType, LocalDateTime accessedTime, String ipAddress, UUID lessonId){
        String userId = authService.getEmailByUsername(username);
        QueryConditional userQuery = QueryConditional.keyEqualTo(Key.builder().addPartitionValue(userId).build());
        PageIterable<AccessLog> logList = logTable.query(userQuery);
        int count = 1;
        switch(actionType){
                case MANIFEST_REQUEST ->{
                    for(AccessLog log : logList.items()){
                        if(log.getLogId().startsWith("VID")){
                            count ++;
                        }
                    }
                    String logId = "VID" + String.format("%04d", count);
                    AccessLog newLog = new AccessLog(logId, userId, accessedTime,actionType, ipAddress, lessonId);
                    logTable.putItem(newLog);
                }
                case KEY_REQUEST ->{
                    for(AccessLog log : logList.items()){
                        if(log.getLogId().startsWith("VID")){
                            count ++;
                        }
                    }
                    String logId = "VID" + String.format("%04d", count);
                    AccessLog newLog = new AccessLog(logId, userId, accessedTime,actionType, ipAddress, lessonId);
                    logTable.putItem(newLog);
                }
                
        }       
    }
    
 
   public List<AccessLog> getLogInDay(ActionType actionType){
       LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
       LocalDateTime endOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);
       Key fromKey = Key.builder().addPartitionValue(actionType.name()).addSortValue(startOfDay).build(),
           toKey = Key.builder().addPartitionValue(actionType.name()).addSortValue(endOfDay).build();
       QueryConditional userQuery = QueryConditional.sortBetween(fromKey, toKey);
       SdkIterable<Page<AccessLog>> logIterable = logTable.index("LogInADay").query(userQuery);
       List<AccessLog> logList = new ArrayList();
       for(Page<AccessLog> logPage : logIterable){
           for(AccessLog log: logPage.items()){
               logList.add(log);
           System.out.println(log.getUserEmail());
           }
       }
       return logList;
   }
}
