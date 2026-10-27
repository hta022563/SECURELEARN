package FCAJ.SecureLearn.Service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Service that wraps AWS Cognito Identity Provider API calls for:
 *  - register  (SignUp → AdminConfirmSignUp → AdminAddUserToGroup)
 *  - login     (InitiateAuth with USER_PASSWORD_AUTH)
 *  - logout    (GlobalSignOut — invalidates all tokens for the user)
 *  - refreshToken (InitiateAuth with REFRESH_TOKEN_AUTH)
 */
@Service
public class AuthService {

    private final CognitoIdentityProviderClient cognitoClient;

    @Value("${cognito.user-pool-id}")
    private String userPoolId;

    @Value("${cognito.client-id}")
    private String clientId;

    @Value("${cognito.client-secret}")
    private String clientSecret;

    @Value("${cognito.region}")
    private String region;

    public AuthService(@Value("${cognito.region}") String region) {
        this.cognitoClient = CognitoIdentityProviderClient.builder()
                .region(Region.of(region))
                .build();
    }

    
    public void adminRegister(String fullName, String email, String password, String role){
        try{
        String normalizedRole = normalizeRole(role);
        AdminCreateUserRequest request = AdminCreateUserRequest.builder().username(email).temporaryPassword(password).
                userAttributes(AttributeType.builder().name("email").value(email).build(),AttributeType.builder().name("name").value(fullName).build()).userPoolId(userPoolId).build();                                                                                                                    
        cognitoClient.adminCreateUser(request);
        cognitoClient.adminSetUserPassword(AdminSetUserPasswordRequest.builder().password(password).permanent(true).username(email).userPoolId(userPoolId).build());
        }catch (Exception e){
            throw new IllegalArgumentException(e.getMessage());
        }
    }
    
    public void register(String fullName, String email, String password, String role) {
        String normalizedRole = normalizeRole(role);
        
        try {
            SignUpRequest signUpRequest = SignUpRequest.builder()
                    .clientId(clientId)
                    .secretHash(computeSecretHash(email))
                    .username(email)
                    .password(password)
                    .userAttributes(
                            AttributeType.builder().name("email").value(email).build(),
                            AttributeType.builder().name("name").value(fullName).build()
                    )
                    .build();
            cognitoClient.signUp(signUpRequest);
        } catch (UsernameExistsException e) {
            throw new IllegalArgumentException("An account with this email already exists.");
        } catch (InvalidPasswordException e) {
            throw new IllegalArgumentException("Password does not meet requirements: " + e.getMessage());
        } catch (CognitoIdentityProviderException e) {
            throw new RuntimeException("Registration failed: " + e.awsErrorDetails().errorMessage(), e);
        }

        try {
            if(normalizedRole.equals("STUDENT")){
            AdminAddUserToGroupRequest groupRequest = AdminAddUserToGroupRequest.builder()
                    .userPoolId(userPoolId)
                    .username(email)
                    .groupName(normalizedRole)
                    .build();
            cognitoClient.adminAddUserToGroup(groupRequest);
            }else throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to create any other account beside Student/Learner");
        } catch (CognitoIdentityProviderException e) {
            throw new RuntimeException("Could not assign role: " + e.awsErrorDetails().errorMessage(), e);
        }
    }

    public void registerConfirmation(String otp, String email){
        try{
        ConfirmSignUpRequest request = ConfirmSignUpRequest.builder().clientId(clientId).secretHash(computeSecretHash(email)).username(email).confirmationCode(otp).build();
        cognitoClient.confirmSignUp(request);
        }catch(Exception e){
            throw new RuntimeException("Could not confirm signup" + e.getMessage());
        }
        
        
    }
            
    public AuthenticationResultType login(String email, String password) {
        try {
            InitiateAuthRequest authRequest = InitiateAuthRequest.builder()
                    .authFlow(AuthFlowType.USER_PASSWORD_AUTH)
                    .clientId(clientId)
                    .authParameters(Map.of(
                            "USERNAME", email,
                            "PASSWORD", password,
                            "SECRET_HASH", computeSecretHash(email)
                    ))
                    .build();

            InitiateAuthResponse authResponse = cognitoClient.initiateAuth(authRequest);
            return authResponse.authenticationResult();

        } catch (NotAuthorizedException e) {
            throw new IllegalArgumentException("Incorrect email or password.");
        } catch (UserNotFoundException e) {
            throw new IllegalArgumentException("No account found for this email.");
        } catch (UserNotConfirmedException e) {
            throw new IllegalArgumentException("Account email is not yet confirmed.");
        } catch (CognitoIdentityProviderException e) {
            throw new RuntimeException("Login failed: " + e.awsErrorDetails().errorMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Refresh Token
    // -------------------------------------------------------------------------

    /**
     * Exchanges a refresh token for a new access token and id token.
     */
    public AuthenticationResultType refreshToken(String refreshToken, String email) {
        try {
            InitiateAuthRequest refreshRequest = InitiateAuthRequest.builder()
                    .authFlow(AuthFlowType.REFRESH_TOKEN_AUTH)
                    .clientId(clientId)
                    .authParameters(Map.of(
                            "REFRESH_TOKEN", refreshToken,
                            "SECRET_HASH", computeSecretHash(email)
                    ))
                    .build();

            InitiateAuthResponse response = cognitoClient.initiateAuth(refreshRequest);
            return response.authenticationResult();

        } catch (NotAuthorizedException e) {
            throw new IllegalArgumentException("Refresh token is invalid or expired.");
        } catch (CognitoIdentityProviderException e) {
            throw new RuntimeException("Token refresh failed: " + e.awsErrorDetails().errorMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Logout (global sign-out)
    // -------------------------------------------------------------------------

    /**
     * Globally invalidates all tokens for the user identified by the given access token.
     */
    public void logout(String accessToken) {
        try {
            GlobalSignOutRequest signOutRequest = GlobalSignOutRequest.builder()
                    .accessToken(accessToken)
                    .build();
            cognitoClient.globalSignOut(signOutRequest);
        } catch (CognitoIdentityProviderException e) {
            // Best-effort: don't fail the request if Cognito can't revoke
            // (the frontend will drop the token regardless)
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Computes the HMAC-SHA256 SECRET_HASH required by Cognito when the app client
     * has a client secret configured.
     * Formula: Base64(HMAC_SHA256(clientSecret, username + clientId))
     */
    private String computeSecretHash(String username) {
        try {
            String message = username + clientId;
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec key = new SecretKeySpec(
                    clientSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(key);
            byte[] rawHmac = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new RuntimeException("Failed to compute Cognito SECRET_HASH", e);
        }
    }

    /**
     * Maps frontend role values to the exact Cognito group names.
     * Groups must already exist in the Cognito User Pool.
     */
    private String normalizeRole(String role) {
        if (role == null) return "STUDENT";
        return switch (role.trim().toLowerCase()) {
            case "instructor" -> "INSTRUCTOR";
            case "admin"      -> "ADMIN";
            default           -> "STUDENT";
        };
    }
    
   public void deleteAccount(String email){
       try{
       boolean isAdmin = cognitoClient.adminListGroupsForUser(AdminListGroupsForUserRequest.builder().userPoolId(userPoolId).username(email).build()).groups().stream().anyMatch(g -> "ADMIN".equals(g.groupName()));
       if(isAdmin){
           ListUsersInGroupRequest userListRequest = ListUsersInGroupRequest.builder().userPoolId(userPoolId).groupName("ADMIN").build();
           ListUsersInGroupResponse userList = cognitoClient.listUsersInGroup(userListRequest);
           int count = userList.users().size();
           if(count <= 1){
               throw new IllegalArgumentException("Cannot delete the last admin");
       }
       }
       AdminDeleteUserRequest request = AdminDeleteUserRequest.builder().userPoolId(userPoolId).username(email).build();
       cognitoClient.adminDeleteUser(request);
       }catch (UserNotFoundException e){
           throw new IllegalArgumentException("User cannot be found");
       }catch (CognitoIdentityProviderException e){
           throw new RuntimeException("Could not delete user: " + e.awsErrorDetails().errorMessage(), e);
       }
   }
   
   public void updateAccountByUser(String accessToken, String newPassword, String oldPassword){
       try{
           cognitoClient.changePassword(ChangePasswordRequest.builder().previousPassword(oldPassword).proposedPassword(newPassword).accessToken(accessToken).build());
       }catch (UserNotFoundException e){
           throw new IllegalArgumentException("User cannot be found");
       }catch (CognitoIdentityProviderException e){
           throw new RuntimeException("Could not delete user: " + e.awsErrorDetails().errorMessage(), e);
       }
   }
   
   public void updateAccountByAdmin(String email, String password){
       try{
           cognitoClient.adminSetUserPassword(AdminSetUserPasswordRequest.builder().userPoolId(userPoolId).username(email).password(password).permanent(true).build());
       }catch (UserNotFoundException e){
           throw new IllegalArgumentException("User cannot be found");
       }catch (CognitoIdentityProviderException e){
           throw new RuntimeException("Could not delete user: " + e.awsErrorDetails().errorMessage(), e);
       }
   }
   
   public ListUsersResponse getUserPage(String nextToken, int limit){
       try{
           ListUsersRequest.Builder request = ListUsersRequest.builder()
                   .userPoolId(userPoolId)
                   .limit(limit);
           if (nextToken != null && !nextToken.isBlank()) {
               request.paginationToken(nextToken);
           }
           return cognitoClient.listUsers(request.build());
       }catch (CognitoIdentityProviderException e){
           throw new RuntimeException("Could not retrieve users: " + e.awsErrorDetails().errorMessage(), e);
       }
   }
   
   public List<String> getUserRole(String username){
       try{
           AdminListGroupsForUserRequest request = AdminListGroupsForUserRequest.builder().userPoolId(userPoolId).username(username).build();
         return cognitoClient.adminListGroupsForUser(request).groups().stream().map(GroupType::groupName).toList();
       }catch (CognitoIdentityProviderException e){
           throw new RuntimeException("Could not retrieve users: " + e.awsErrorDetails().errorMessage(), e);
       }
   }

   public String getEmailByUsername(String username){
       try{
           AdminGetUserRequest request = AdminGetUserRequest.builder().userPoolId(userPoolId).username(username).build();
           return cognitoClient.adminGetUser(request).userAttributes().stream()
                   .filter(attribute -> "email".equals(attribute.name()))
                   .map(AttributeType::value)
                   .findFirst()
                   .orElse(username);
       }catch (CognitoIdentityProviderException e){
           throw new RuntimeException("Could not retrieve user: " + e.awsErrorDetails().errorMessage(), e);
       }
   }

}
