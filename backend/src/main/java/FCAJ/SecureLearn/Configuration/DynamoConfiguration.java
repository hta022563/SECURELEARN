/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Configuration;

import java.net.URI;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

/**
 *
 * @author ngoct
 */
@Configuration
public class DynamoConfiguration {
    private static final DynamoDbClient CLIENT = DynamoDbClient.builder()
            .endpointOverride(URI.create("http://localhost:8000"))
            .region(Region.AP_SOUTHEAST_1)
            .credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create("dummy", "dummy")))
            .build();
     private static final DynamoDbEnhancedClient ENHANCED = DynamoDbEnhancedClient.builder()
            .dynamoDbClient(CLIENT)
            .build();

    public static DynamoDbEnhancedClient enhanced() {
        return ENHANCED;
    }
}
