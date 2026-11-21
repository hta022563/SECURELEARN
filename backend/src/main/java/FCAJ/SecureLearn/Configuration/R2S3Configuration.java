package FCAJ.SecureLearn.Configuration;

import io.awspring.cloud.s3.DiskBufferingS3OutputStreamProvider;
import io.awspring.cloud.s3.PropertiesS3ObjectContentTypeResolver;
import io.awspring.cloud.s3.S3ObjectConverter;
import io.awspring.cloud.s3.S3Template;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * S3 client for the video bucket. Storage moved from Cloudflare R2 to AWS S3, so there is no
 * endpoint override and no static key pair: credentials come from the default AWS chain
 * (the function's IAM role on Lambda, AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY locally).
 * The class and bean names still say "r2" so existing @Qualifier references keep working.
 */
@Configuration
@Profile({"playback", "upload"})
public class R2S3Configuration {

    @Bean(name = "r2S3Client", destroyMethod = "close")
    S3Client r2S3Client(@Value("${s3.region:ap-southeast-1}") String region) {
        return S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.builder().build())
                .build();
    }

    @Bean(name = "r2S3Presigner", destroyMethod = "close")
    S3Presigner r2S3Presigner(@Value("${s3.region:ap-southeast-1}") String region) {
        return S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.builder().build())
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
}
