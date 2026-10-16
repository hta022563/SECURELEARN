package FCAJ.SecureLearn.Response;

import java.util.List;
import software.amazon.awssdk.services.cognitoidentityprovider.model.UserType;

public record UserPage(List<UserType> users, String nextToken) {
}
