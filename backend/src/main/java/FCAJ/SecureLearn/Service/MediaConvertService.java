package FCAJ.SecureLearn.Service;

import io.awspring.cloud.s3.ObjectMetadata;
import io.awspring.cloud.s3.S3Template;
import jakarta.annotation.PreDestroy;
import java.io.ByteArrayInputStream;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.mediaconvert.MediaConvertClient;
import software.amazon.awssdk.services.mediaconvert.model.AacCodingMode;
import software.amazon.awssdk.services.mediaconvert.model.AacSettings;
import software.amazon.awssdk.services.mediaconvert.model.AudioCodec;
import software.amazon.awssdk.services.mediaconvert.model.AudioCodecSettings;
import software.amazon.awssdk.services.mediaconvert.model.AudioDefaultSelection;
import software.amazon.awssdk.services.mediaconvert.model.AudioDescription;
import software.amazon.awssdk.services.mediaconvert.model.AudioSelector;
import software.amazon.awssdk.services.mediaconvert.model.ContainerSettings;
import software.amazon.awssdk.services.mediaconvert.model.ContainerType;
import software.amazon.awssdk.services.mediaconvert.model.CreateJobRequest;
import software.amazon.awssdk.services.mediaconvert.model.H264QvbrSettings;
import software.amazon.awssdk.services.mediaconvert.model.H264RateControlMode;
import software.amazon.awssdk.services.mediaconvert.model.H264SceneChangeDetect;
import software.amazon.awssdk.services.mediaconvert.model.H264Settings;
import software.amazon.awssdk.services.mediaconvert.model.HlsEncryptionSettings;
import software.amazon.awssdk.services.mediaconvert.model.HlsEncryptionType;
import software.amazon.awssdk.services.mediaconvert.model.HlsGroupSettings;
import software.amazon.awssdk.services.mediaconvert.model.HlsInitializationVectorInManifest;
import software.amazon.awssdk.services.mediaconvert.model.HlsKeyProviderType;
import software.amazon.awssdk.services.mediaconvert.model.HlsSegmentControl;
import software.amazon.awssdk.services.mediaconvert.model.Input;
import software.amazon.awssdk.services.mediaconvert.model.InputTimecodeSource;
import software.amazon.awssdk.services.mediaconvert.model.Job;
import software.amazon.awssdk.services.mediaconvert.model.JobSettings;
import software.amazon.awssdk.services.mediaconvert.model.Output;
import software.amazon.awssdk.services.mediaconvert.model.OutputGroup;
import software.amazon.awssdk.services.mediaconvert.model.OutputGroupSettings;
import software.amazon.awssdk.services.mediaconvert.model.OutputGroupType;
import software.amazon.awssdk.services.mediaconvert.model.StaticKeyProvider;
import software.amazon.awssdk.services.mediaconvert.model.VideoCodec;
import software.amazon.awssdk.services.mediaconvert.model.VideoCodecSettings;
import software.amazon.awssdk.services.mediaconvert.model.VideoDescription;
import software.amazon.awssdk.services.mediaconvert.model.VideoSelector;

/**
 * Transcodes a raw upload to AES-128 encrypted HLS with AWS Elemental MediaConvert.
 * Used instead of FFmpeg when video.processor=mediaconvert (the upload group on Lambda).
 *
 * submit() only starts the job and returns at once; MediaConvert reads videos/... and writes
 * hls/... itself, using MEDIACONVERT_ROLE_ARN. checkJob() is called later to see if it finished.
 *
 * Output layout (same folder and key file as the FFmpeg pipeline, different file names):
 *   hls/{baseKey}/master.m3u8                  <- stored on the lesson; lists one rendition
 *   hls/{baseKey}/master_video.m3u8            <- the rendition's playlist (segments + key line)
 *   hls/{baseKey}/master_video_00001.ts ...
 *   hls/{baseKey}/content.key                  <- written here by submit(), not by MediaConvert
 */
@Service
@Profile("upload")
public class MediaConvertService {

    /** The #EXT-X-KEY URI written into the playlist; PlaybackService swaps it for the /key endpoint. */
    static final String KEY_URI_PLACEHOLDER = "securelearn-key";
    private static final String AUDIO_SELECTOR = "Audio Selector 1";

    private final S3Template s3Template;
    private final MediaConvertClient client;

    @Value("${s3.bucket-name}")
    private String bucketName;

    @Value("${mediaconvert.role-arn:}")
    private String roleArn;

    public MediaConvertService(
            @Qualifier("r2S3Template") S3Template s3Template,
            @Value("${s3.region:ap-southeast-1}") String region) {
        this.s3Template = s3Template;
        // Regional endpoint: MediaConvert no longer needs the account-specific DescribeEndpoints URL.
        this.client = MediaConvertClient.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.builder().build())
                .build();
    }

    @PreDestroy
    void close() {
        client.close();
    }

    /**
     * Generates a content key, stores it as content.key, and starts the MediaConvert job.
     *
     * @param rawObjectKey e.g. "videos/{courseId}/1234567890_lecture1.mp4"
     * @param lessonLabel  lesson id (or "new") stored on the job, only to make jobs easy to find
     */
    public SubmittedJob submit(String rawObjectKey, String lessonLabel) {
        if (roleArn == null || roleArn.isBlank()) {
            throw new IllegalStateException("mediaconvert.role-arn (MEDIACONVERT_ROLE_ARN) is not set");
        }
        // Same folder naming as the FFmpeg pipeline; the timestamp in the file name keeps a
        // replacement upload from overwriting the lesson's current video while the job runs.
        String baseKey = rawObjectKey
                .replaceFirst("^videos/", "hls/")
                .replaceAll("\\.[^.]+$", "");

        byte[] contentKey = new byte[16];
        new SecureRandom().nextBytes(contentKey);
        String contentKeyHex = HexFormat.of().formatHex(contentKey);
        try {
            s3Template.upload(bucketName, baseKey + "/content.key", new ByteArrayInputStream(contentKey),
                    ObjectMetadata.builder().contentType("application/octet-stream").build());
        } finally {
            Arrays.fill(contentKey, (byte) 0);
        }

        CreateJobRequest request = CreateJobRequest.builder()
                .role(roleArn)
                .userMetadata(Map.of("lesson", lessonLabel, "source", rawObjectKey))
                .settings(jobSettings(rawObjectKey, baseKey, contentKeyHex))
                .build();
        String jobId = client.createJob(request).job().id();
        return new SubmittedJob(jobId, baseKey + "/master.m3u8");
    }

    /** Current state of a job submitted earlier. */
    public JobState checkJob(String jobId) {
        Job job = client.getJob(r -> r.id(jobId)).job();
        return switch (job.status()) {
            case COMPLETE -> new JobState(Outcome.COMPLETE, null);
            case ERROR, CANCELED -> new JobState(Outcome.FAILED,
                    job.errorMessage() != null ? job.errorMessage() : "MediaConvert job " + job.statusAsString());
            default -> new JobState(Outcome.RUNNING, null); // SUBMITTED, PROGRESSING
        };
    }

    // Mirrors the old FFmpeg command: H.264 + AAC 128k, 6 s segments, AES-128 with our own key.
    private JobSettings jobSettings(String rawObjectKey, String baseKey, String contentKeyHex) {
        Input input = Input.builder()
                .fileInput("s3://" + bucketName + "/" + rawObjectKey)
                .videoSelector(VideoSelector.builder().build())
                .audioSelectors(Map.of(AUDIO_SELECTOR,
                        AudioSelector.builder().defaultSelection(AudioDefaultSelection.DEFAULT).build()))
                .timecodeSource(InputTimecodeSource.ZEROBASED)
                .build();

        HlsEncryptionSettings encryption = HlsEncryptionSettings.builder()
                .encryptionMethod(HlsEncryptionType.AES128)
                .type(HlsKeyProviderType.STATIC_KEY)
                .staticKeyProvider(StaticKeyProvider.builder()
                        .staticKeyValue(contentKeyHex)
                        .url(KEY_URI_PLACEHOLDER)
                        .build())
                .initializationVectorInManifest(HlsInitializationVectorInManifest.INCLUDE)
                .build();

        HlsGroupSettings hls = HlsGroupSettings.builder()
                .destination("s3://" + bucketName + "/" + baseKey + "/master")
                .segmentLength(6)
                .minSegmentLength(0)
                .segmentControl(HlsSegmentControl.SEGMENTED_FILES)
                .encryption(encryption)
                .build();

        // QVBR = constant-quality like FFmpeg's -crf; the max bitrate keeps 6 s segments well
        // under Lambda's 6 MB response limit (segments are proxied through PlaybackController).
        H264Settings h264 = H264Settings.builder()
                .rateControlMode(H264RateControlMode.QVBR)
                .qvbrSettings(H264QvbrSettings.builder().qvbrQualityLevel(7).build())
                .maxBitrate(5_000_000)
                .sceneChangeDetect(H264SceneChangeDetect.TRANSITION_DETECTION)
                .build();

        Output output = Output.builder()
                .nameModifier("_video")
                .containerSettings(ContainerSettings.builder().container(ContainerType.M3_U8).build())
                .videoDescription(VideoDescription.builder()
                        .codecSettings(VideoCodecSettings.builder()
                                .codec(VideoCodec.H_264)
                                .h264Settings(h264)
                                .build())
                        .build())
                .audioDescriptions(AudioDescription.builder()
                        .audioSourceName(AUDIO_SELECTOR)
                        .codecSettings(AudioCodecSettings.builder()
                                .codec(AudioCodec.AAC)
                                .aacSettings(AacSettings.builder()
                                        .bitrate(128_000)
                                        .codingMode(AacCodingMode.CODING_MODE_2_0)
                                        .sampleRate(48_000)
                                        .build())
                                .build())
                        .build())
                .build();

        return JobSettings.builder()
                .inputs(input)
                .outputGroups(OutputGroup.builder()
                        .name("HLS")
                        .outputGroupSettings(OutputGroupSettings.builder()
                                .type(OutputGroupType.HLS_GROUP_SETTINGS)
                                .hlsGroupSettings(hls)
                                .build())
                        .outputs(output)
                        .build())
                .build();
    }

    public record SubmittedJob(String jobId, String playlistKey) {
    }

    public enum Outcome { RUNNING, COMPLETE, FAILED }

    public record JobState(Outcome outcome, String error) {
    }
}
