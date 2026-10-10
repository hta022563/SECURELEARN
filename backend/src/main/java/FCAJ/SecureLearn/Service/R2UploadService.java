/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Service;

import java.net.URL;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.awspring.cloud.s3.ObjectMetadata;
import io.awspring.cloud.s3.S3Template;

/**
 *
 * @author ngoct
 */
@Service
public class R2UploadService {
    @Autowired
    private S3Template template;
    
    @Value("${app.s3.public-base-url}")
    private String publicBaseUrl;
    
    public URL generatePresignedPutUrl(String bucketName, String objectKey, Duration expiry, String contentType){
        ObjectMetadata objectMetadata = ObjectMetadata.builder().contentType(contentType).build();
        return template.createSignedPutURL(bucketName, objectKey, expiry, objectMetadata, contentType);
    }
    
    public String getPublicUrl(String objectKey){
        return publicBaseUrl + "/" + objectKey;
    }
    
    void deleteObject(String bucketName, String objectKey){
        template.deleteObject(bucketName, objectKey);
    }

}
