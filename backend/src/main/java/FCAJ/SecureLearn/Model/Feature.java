package FCAJ.SecureLearn.Model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;

/**
 * The 12 model features stored in the "features" map of an AnomalyAlert item.
 * The Lambda (AI/file/handler.py) writes the keys in snake_case, so each getter
 * names its DynamoDB attribute explicitly.
 *
 * @author ngoct
 */
@DynamoDbBean
public class Feature {

    private float avgDownloadInterval;
    private float medianDownloadInterval;
    private float stdDownloadInterval;
    private float minDownloadInterval;
    private float totalRequests;
    private float uniqueChunkCount;
    private float sequentialRatio;
    private float coverageRatio;
    private float errorRate;
    private float manifestToChunkRatio;
    private float uniqueIpCount;
    private float uniqueDeviceCount;

    public Feature() {
    }

    @DynamoDbAttribute("avg_download_interval")
    public float getAvgDownloadInterval() {
        return avgDownloadInterval;
    }

    public void setAvgDownloadInterval(float avgDownloadInterval) {
        this.avgDownloadInterval = avgDownloadInterval;
    }

    @DynamoDbAttribute("median_download_interval")
    public float getMedianDownloadInterval() {
        return medianDownloadInterval;
    }

    public void setMedianDownloadInterval(float medianDownloadInterval) {
        this.medianDownloadInterval = medianDownloadInterval;
    }

    @DynamoDbAttribute("std_download_interval")
    public float getStdDownloadInterval() {
        return stdDownloadInterval;
    }

    public void setStdDownloadInterval(float stdDownloadInterval) {
        this.stdDownloadInterval = stdDownloadInterval;
    }

    @DynamoDbAttribute("min_download_interval")
    public float getMinDownloadInterval() {
        return minDownloadInterval;
    }

    public void setMinDownloadInterval(float minDownloadInterval) {
        this.minDownloadInterval = minDownloadInterval;
    }

    @DynamoDbAttribute("total_requests")
    public float getTotalRequests() {
        return totalRequests;
    }

    public void setTotalRequests(float totalRequests) {
        this.totalRequests = totalRequests;
    }

    @DynamoDbAttribute("unique_chunk_count")
    public float getUniqueChunkCount() {
        return uniqueChunkCount;
    }

    public void setUniqueChunkCount(float uniqueChunkCount) {
        this.uniqueChunkCount = uniqueChunkCount;
    }

    @DynamoDbAttribute("sequential_ratio")
    public float getSequentialRatio() {
        return sequentialRatio;
    }

    public void setSequentialRatio(float sequentialRatio) {
        this.sequentialRatio = sequentialRatio;
    }

    @DynamoDbAttribute("coverage_ratio")
    public float getCoverageRatio() {
        return coverageRatio;
    }

    public void setCoverageRatio(float coverageRatio) {
        this.coverageRatio = coverageRatio;
    }

    @DynamoDbAttribute("error_rate")
    public float getErrorRate() {
        return errorRate;
    }

    public void setErrorRate(float errorRate) {
        this.errorRate = errorRate;
    }

    @DynamoDbAttribute("manifest_to_chunk_ratio")
    public float getManifestToChunkRatio() {
        return manifestToChunkRatio;
    }

    public void setManifestToChunkRatio(float manifestToChunkRatio) {
        this.manifestToChunkRatio = manifestToChunkRatio;
    }

    @DynamoDbAttribute("unique_ip_count")
    public float getUniqueIpCount() {
        return uniqueIpCount;
    }

    public void setUniqueIpCount(float uniqueIpCount) {
        this.uniqueIpCount = uniqueIpCount;
    }

    @DynamoDbAttribute("unique_device_count")
    public float getUniqueDeviceCount() {
        return uniqueDeviceCount;
    }

    public void setUniqueDeviceCount(float uniqueDeviceCount) {
        this.uniqueDeviceCount = uniqueDeviceCount;
    }
}
