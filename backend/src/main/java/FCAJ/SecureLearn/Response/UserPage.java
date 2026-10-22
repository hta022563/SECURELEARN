package FCAJ.SecureLearn.Response;

import java.time.Instant;
import java.util.List;
import software.amazon.awssdk.services.cognitoidentityprovider.model.UserType;

public record UserPage(List<UserListDTO> users, String nextToken) {
}




