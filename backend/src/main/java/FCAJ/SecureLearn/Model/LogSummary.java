package FCAJ.SecureLearn.Model;

import java.time.LocalDateTime;
import java.util.List;

/**
 *
 * @author PC
 */
public class LogSummary {
    String username;
    LocalDateTime timestamp;
    int totalRequest;
    float avgDownloadInterval;
    int uniqueSegmentCount;
    float sequentialRatio, errorRate, manifestToSegmentRatio;
    int uniqueIpCount, uniqueDeviceCount, label;
    float timeToLive;
    List<String> uniqueIp, uniqueDevice;
}
