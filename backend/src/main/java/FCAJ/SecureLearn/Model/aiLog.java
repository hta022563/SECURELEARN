package FCAJ.SecureLearn.Model;

import java.time.Instant;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

/**
 * AI-summarized access log for one user over one time window.
 * Stored in the same "AccessLog" table: partition key userEmail, sort key logId.
 *
 * @author ngoct
 */
@DynamoDbBean
public class aiLog {

    private String userEmail;
    private String logId;
    private Instant windowTimestamp; //bỏ qua cái này
    private int totalRequests;
    private double avgDownloadInterval;
    private int uniqueChunkCount;
    private double sequentialRatio;
    private double errorRate;
    private double manifestToChunkRatio;
    private int uniqueIpCount;
    private int uniqueDeviceCount;
    private int label;
    // Unix epoch seconds; DynamoDB TTL deletes the item after this time
    private long ttl; //ko cần trả về cái nàys

    public aiLog() {
    }

    @DynamoDbPartitionKey
    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    @DynamoDbSortKey
    public String getLogId() {
        return logId;
    }

    public void setLogId(String logId) {
        this.logId = logId;
    }

    public Instant getWindowTimestamp() {
        return windowTimestamp;
    }

    public void setWindowTimestamp(Instant windowTimestamp) {
        this.windowTimestamp = windowTimestamp;
    }

    public int getTotalRequests() {
        return totalRequests;
    }

    public void setTotalRequests(int totalRequests) {
        this.totalRequests = totalRequests;
    }

    public double getAvgDownloadInterval() {
        return avgDownloadInterval;
    }

    public void setAvgDownloadInterval(double avgDownloadInterval) {
        this.avgDownloadInterval = avgDownloadInterval;
    }

    public int getUniqueChunkCount() {
        return uniqueChunkCount;
    }

    public void setUniqueChunkCount(int uniqueChunkCount) {
        this.uniqueChunkCount = uniqueChunkCount;
    }

    public double getSequentialRatio() {
        return sequentialRatio;
    }

    public void setSequentialRatio(double sequentialRatio) {
        this.sequentialRatio = sequentialRatio;
    }

    public double getErrorRate() {
        return errorRate;
    }

    public void setErrorRate(double errorRate) {
        this.errorRate = errorRate;
    }

    public double getManifestToChunkRatio() {
        return manifestToChunkRatio;
    }

    public void setManifestToChunkRatio(double manifestToChunkRatio) {
        this.manifestToChunkRatio = manifestToChunkRatio;
    }

    public int getUniqueIpCount() {
        return uniqueIpCount;
    }

    public void setUniqueIpCount(int uniqueIpCount) {
        this.uniqueIpCount = uniqueIpCount;
    }

    public int getUniqueDeviceCount() {
        return uniqueDeviceCount;
    }

    public void setUniqueDeviceCount(int uniqueDeviceCount) {
        this.uniqueDeviceCount = uniqueDeviceCount;
    }

    public int getLabel() {
        return label;
    }

    public void setLabel(int label) {
        this.label = label;
    }

    public long getTtl() {
        return ttl;
    }

    public void setTtl(long ttl) {
        this.ttl = ttl;
    }
}
