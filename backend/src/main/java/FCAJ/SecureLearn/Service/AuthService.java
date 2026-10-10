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
import java.util.Map;

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

    // -------------------------------------------------------------------------
    // Register
    // -------------------------------------------------------------------------

    /**
     * Creates a new Cognito user (email/password), auto-confirms them, then adds
     * them to the appropriate group (student or instructor).
     *
     * @throws RuntimeException wrapping any Cognito SDK exception on failure
     */
    public void register(String fullName, String email, String password, String role) {
        String normalizedRole = normalizeRole(role);

        // 1. SignUp — creates the user in Cognito (status: UNCONFIRMED)
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

        // 2. AdminConfirmSignUp — skip email verification for now so the user can log in immediately
        try {
            AdminConfirmSignUpRequest confirmRequest = AdminConfirmSignUpRequest.builder()
                    .userPoolId(userPoolId)
                    .username(email)
                    .build();
            cognitoClient.adminConfirmSignUp(confirmRequest);
        } catch (CognitoIdentityProviderException e) {
            throw new RuntimeException("Could not confirm registration: " + e.awsErrorDetails().errorMessage(), e);
        }

        // 3. AdminAddUserToGroup — assigns the role group so cognito:groups appears in the JWT
        try {
            AdminAddUserToGroupRequest groupRequest = AdminAddUserToGroupRequest.builder()
                    .userPoolId(userPoolId)
                    .username(email)
                    .groupName(normalizedRole)
                    .build();
            cognitoClient.adminAddUserToGroup(groupRequest);
        } catch (CognitoIdentityProviderException e) {
            throw new RuntimeException("Could not assign role: " + e.awsErrorDetails().errorMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Login
    // -------------------------------------------------------------------------

    /**
     * Authenticates with USER_PASSWORD_AUTH flow.
     *
     * @return AuthenticationResultType containing accessToken, idToken, refreshToken
     * @throws IllegalArgumentException on bad credentials
     * @throws RuntimeException on other Cognito errors
     */
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
}
