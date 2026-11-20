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

    // A category prefix plus a random UUID keeps ids unique without reading the table, e.g. "VID3f2a..."
    private String generateLogId(ActionType actionType) {
        String prefix = LOG_PREFIX.getOrDefault(actionType, UNKNOWN_PREFIX);
        return prefix + UUID.randomUUID();
    }

    // Raw logs are built here; the caller saves them with saveLog
    public AccessLog createLog(String email, ActionType actionType, LocalDateTime accessedTime, String ipAddress,
            String userAgent, String deviceFingerprint, int statusCode) {
        return new AccessLog(generateLogId(actionType), email, accessedTime, actionType, ipAddress, userAgent,
                deviceFingerprint, statusCode);
    }

    public AccessLog createLog(String email, ActionType actionType, LocalDateTime accessedTime, String ipAddress,
            String userAgent, String deviceFingerprint, int statusCode, UUID lessonId) {
        return new AccessLog(generateLogId(actionType), email, accessedTime, actionType, ipAddress, userAgent,
                deviceFingerprint, statusCode, lessonId);
    }

    public AccessLog createLog(String email, ActionType actionType, LocalDateTime accessedTime, String ipAddress,
            String userAgent, String deviceFingerprint, int statusCode, int segmentId, UUID lessonId) {
        return new AccessLog(generateLogId(actionType), email, accessedTime, actionType, ipAddress, userAgent,
                deviceFingerprint, statusCode, segmentId, lessonId);
    }

    // Throws an SdkException if DynamoDB rejects the write or can't be reached
    public void saveLog(AccessLog rawLog) {
        logTable.putItem(rawLog);
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
