package FCAJ.SecureLearn.Model;

import java.time.Instant;
import java.util.UUID;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSecondaryPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSecondarySortKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

/**
 * One item of the AnomalyAlert table, written by the anomaly-detection Lambda
 * (AI/file/handler.py). Keys: userId (partition) + alertTime (sort).
 *
 * @author ngoct
 */
@DynamoDbBean
public class AnomalyAlert {

    private String userId;
    private Instant alertTime;
    private UUID alertId;
    private float score;
    private AlertStatus status;
    private String modelKey;
    private Feature features;

    public AnomalyAlert() {
    }

    // The Lambda stores the user's email here
    @DynamoDbPartitionKey
    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    // Stored as an ISO-8601 UTC string, e.g. "2026-11-23T06:56:59.270Z"
    @DynamoDbSortKey
    @DynamoDbSecondarySortKey(indexNames = "StatusTime")
    public Instant getAlertTime() {
        return alertTime;
    }

    public void setAlertTime(Instant alertTime) {
        this.alertTime = alertTime;
    }

    public UUID getAlertId() {
        return alertId;
    }

    public void setAlertId(UUID alertId) {
        this.alertId = alertId;
    }

    // Isolation Forest decision_function score; below the threshold (default 0) means anomalous
    public float getScore() {
        return score;
    }

    public void setScore(float score) {
        this.score = score;
    }

    @DynamoDbSecondaryPartitionKey(indexNames = "StatusTime")
    public AlertStatus getStatus() {
        return status;
    }

    public void setStatus(AlertStatus status) {
        this.status = status;
    }

    public String getModelKey() {
        return modelKey;
    }

    public void setModelKey(String modelKey) {
        this.modelKey = modelKey;
    }

    public Feature getFeatures() {
        return features;
    }

    public void setFeatures(Feature features) {
        this.features = features;
    }
}
