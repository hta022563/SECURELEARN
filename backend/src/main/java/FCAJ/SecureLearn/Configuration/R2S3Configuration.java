package FCAJ.SecureLearn.Configuration;

import io.awspring.cloud.s3.DiskBufferingS3OutputStreamProvider;
import io.awspring.cloud.s3.PropertiesS3ObjectContentTypeResolver;
import io.awspring.cloud.s3.S3ObjectConverter;
import io.awspring.cloud.s3.S3Template;
import java.net.URI;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class R2S3Configuration {

    @Bean(name = "r2S3Client", destroyMethod = "close")
    S3Client r2S3Client(
            @Value("${r2.endpoint}") String endpoint,
            @Value("${r2.region:auto}") String region,
            @Value("${r2.access-key}") String accessKey,
            @Value("${r2.secret-key}") String secretKey) {
        return S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(credentialsProvider(accessKey, secretKey))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                .build();
    }

    @Bean(name = "r2S3Presigner", destroyMethod = "close")
    S3Presigner r2S3Presigner(
            @Value("${r2.endpoint}") String endpoint,
            @Value("${r2.region:auto}") String region,
            @Value("${r2.access-key}") String accessKey,
            @Value("${r2.secret-key}") String secretKey) {
        return S3Presigner.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(credentialsProvider(accessKey, secretKey))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                .build();
    }

    @Bean(name = "r2S3Template")
    S3Template r2S3Template(
            @Qualifier("r2S3Client") S3Client s3Client,
            @Qualifier("r2S3Presigner") S3Presigner s3Presigner,
            S3ObjectConverter s3ObjectConverter) {
        return new S3Template(
                s3Client,
                new DiskBufferingS3OutputStreamProvider(
                        s3Client, new PropertiesS3ObjectContentTypeResolver()),
                s3ObjectConverter,
                s3Presigner);
    }

    private StaticCredentialsProvider credentialsProvider(String accessKey, String secretKey) {
        return StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey));
    }
}
