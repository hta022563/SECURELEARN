/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Service;

import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.awspring.cloud.s3.ObjectMetadata;
import io.awspring.cloud.s3.S3Template;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

/**
 *
 * @author ngoct
 */
@Service
public class R2Service {
    private final S3Template template;
    private final S3Presigner presigner;
    
    @Value("${app.s3.public-base-url}")
    private String publicBaseUrl;

    public R2Service(
            @Qualifier("r2S3Template") S3Template template,
            @Qualifier("r2S3Presigner") S3Presigner presigner) {
        this.template = template;
        this.presigner = presigner;
    }
    
    public URL generatePresignedPutUrl(String bucketName, String objectKey, Duration expiry, String contentType){
        ObjectMetadata objectMetadata = ObjectMetadata.builder().contentType(contentType).build();
        return template.createSignedPutURL(bucketName, objectKey, expiry, objectMetadata, contentType);
    }

    public URL generatePresignedGetUrl(String bucketName, String objectKey, Duration expiry) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .build();
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(expiry)
                .getObjectRequest(getObjectRequest)
                .build();
        return presigner.presignGetObject(presignRequest).url();
    }

    public String readObjectAsString(String bucketName, String objectKey) {
        return new String(readObjectAsBytes(bucketName, objectKey), StandardCharsets.UTF_8);
    }

    public byte[] readObjectAsBytes(String bucketName, String objectKey) {
        var response = template.download(bucketName, objectKey);
        try (var input = response.getInputStream()) {
            return input.readAllBytes();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to read R2 object " + objectKey, e);
        }
    }
    
    public String getPublicUrl(String objectKey){
        return publicBaseUrl + "/" + objectKey;
    }

    public String objectKeyFromPublicUrl(String value) {
        if (value == null || publicBaseUrl == null) {
            return null;
        }
        String prefix = publicBaseUrl.endsWith("/")
                ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
                : publicBaseUrl;
        return value.startsWith(prefix + "/") ? value.substring(prefix.length() + 1) : null;
    }
    
    public void deleteObject(String bucketName, String objectKey){
        template.deleteObject(bucketName, objectKey);
    }

}
