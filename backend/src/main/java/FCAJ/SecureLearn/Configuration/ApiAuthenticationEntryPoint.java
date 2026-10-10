package FCAJ.SecureLearn.Configuration;

import java.io.IOException;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.ObjectMapper;

/**
 * Returns a structured JSON 401 response instead of Spring Security's default HTML error page.
 * Distinguishes between an expired token and any other authentication failure so the client
 * can surface a meaningful message.
 */
@Component
public class ApiAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public ApiAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        Map<String, Object> body;
        if (isTokenExpired(authException)) {
            body = Map.of(
                    "status", 401,
                    "error", "Token expired",
                    "message", "JWT has expired"
            );
        } else {
            body = Map.of(
                    "status", 401,
                    "error", "Unauthorized",
                    "message", "Invalid token"
            );
        }

        objectMapper.writeValue(response.getOutputStream(), body);
    }

    /**
     * Walks the exception cause chain to determine whether the authentication failure
     * was specifically caused by an expired JWT.
     */
    private boolean isTokenExpired(AuthenticationException authException) {
        // Check OAuth2AuthenticationException wrapping (most common path through resource server)
        if (authException instanceof OAuth2AuthenticationException oauth2Ex) {
            var error = oauth2Ex.getError();
            if ("invalid_token".equals(error.getErrorCode())
                    && error.getDescription() != null
                    && error.getDescription().toLowerCase().contains("expired")) {
                return true;
            }
        }

        // Walk the cause chain looking for a JwtValidationException
        Throwable cause = authException.getCause();
        while (cause != null) {
            if (cause instanceof JwtValidationException jwtEx) {
                return jwtEx.getErrors().stream()
                        .anyMatch(e -> e.getDescription() != null
                                && e.getDescription().toLowerCase().contains("expired"));
            }
            cause = cause.getCause();
        }

        return false;
    }
}
