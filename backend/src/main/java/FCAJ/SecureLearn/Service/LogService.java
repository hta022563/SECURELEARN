package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.AccessLog;
import FCAJ.SecureLearn.Model.ActionType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
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

/**
 *
 * @author ngoct
 */
@Service
public class LogService {
    private final DynamoDbTable<AccessLog> logTable;

    private static final String UNKNOWN_PREFIX = "UNK";
    private static final Map<ActionType, String> LOG_PREFIX = new EnumMap<>(ActionType.class);

    static {
        LOG_PREFIX.put(ActionType.LOGIN, "ACC");

        LOG_PREFIX.put(ActionType.PLAYBACK, "VID");
        LOG_PREFIX.put(ActionType.MANIFEST_REQUEST, "VID");
        LOG_PREFIX.put(ActionType.KEY_REQUEST, "VID");
        LOG_PREFIX.put(ActionType.SEGMENT_REQUEST, "VID");

        LOG_PREFIX.put(ActionType.ADMIN_REGISTER, "ADM");
        LOG_PREFIX.put(ActionType.ADMIN_DELETE, "ADM");
        LOG_PREFIX.put(ActionType.ADMIN_UPDATE, "ADM");

        LOG_PREFIX.put(ActionType.COURSE_DELETION, "COU");
        LOG_PREFIX.put(ActionType.CHAPTER_DELETION, "COU");
        LOG_PREFIX.put(ActionType.VIDEO_DELETION, "COU");
    }

    public LogService(DynamoDbEnhancedClient enhancedClient) {
        this.logTable = enhancedClient.table("AccessLog", TableSchema.fromBean(AccessLog.class));
    }

    // Log ids look like "VID0007": a category prefix plus a per-user running count
    private String generateLogId(String email, ActionType actionType) {
        String prefix = LOG_PREFIX.getOrDefault(actionType, UNKNOWN_PREFIX);
        QueryConditional userLogsQuery = QueryConditional.keyEqualTo(Key.builder().addPartitionValue(email).build());
        PageIterable<AccessLog> userLogs = logTable.query(userLogsQuery);
        int nextNumber = 1;
        for (AccessLog existingLog : userLogs.items()) {
            if (existingLog.getLogId().startsWith(prefix)) {
                nextNumber++;
            }
        }
        return prefix + String.format("%04d", nextNumber);
    }

    public void createLog(String email, ActionType actionType, LocalDateTime accessedTime, String ipAddress,
            String userAgent, String deviceFingerprint, int statusCode) {
        String logId = generateLogId(email, actionType);
        AccessLog newLog = new AccessLog(logId, email, accessedTime, actionType, ipAddress, userAgent,
                deviceFingerprint, statusCode);
        logTable.putItem(newLog);
    }

    public void createLog(String email, ActionType actionType, LocalDateTime accessedTime, String ipAddress,
            String userAgent, String deviceFingerprint, int statusCode, UUID lessonId) {
        String logId = generateLogId(email, actionType);
        AccessLog newLog = new AccessLog(logId, email, accessedTime, actionType, ipAddress, userAgent,
                deviceFingerprint, statusCode, lessonId);
        logTable.putItem(newLog);
    }

    public void createLog(String email, ActionType actionType, LocalDateTime accessedTime, String ipAddress,
            String userAgent, String deviceFingerprint, int statusCode, int segmentId, UUID lessonId) {
        String logId = generateLogId(email, actionType);
        AccessLog newLog = new AccessLog(logId, email, accessedTime, actionType, ipAddress, userAgent,
                deviceFingerprint, statusCode, segmentId, lessonId);
        logTable.putItem(newLog);
    }

    public List<AccessLog> getLogsForToday(ActionType actionType) {
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime endOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);
        Key fromKey = Key.builder().addPartitionValue(actionType.name()).addSortValue(startOfDay).build();
        Key toKey = Key.builder().addPartitionValue(actionType.name()).addSortValue(endOfDay).build();
        QueryConditional todayQuery = QueryConditional.sortBetween(fromKey, toKey);
        SdkIterable<Page<AccessLog>> logPages = logTable.index("LogInADay").query(todayQuery);
        List<AccessLog> todaysLogs = new ArrayList<>();
        for (Page<AccessLog> logPage : logPages) {
            todaysLogs.addAll(logPage.items());
        }
        return todaysLogs;
    }
}
