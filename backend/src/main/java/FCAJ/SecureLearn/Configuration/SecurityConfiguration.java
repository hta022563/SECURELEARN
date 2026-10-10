package FCAJ.SecureLearn.Configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

import FCAJ.SecureLearn.Controller.CognitoLogoutHandler;

/**
 * Security configuration with two filter chains:
 *
 * 1. apiFilterChain  (Order 1) — matches /api/**
 *    - Validates Cognito-issued JWTs via the OAuth 2.0 Resource Server DSL
 *    - Extracts cognito:groups → ROLE_* authorities via CognitoJwtAuthenticationConverter
 *    - Enforces per-endpoint access rules (public / authenticated / instructor+admin)
 *    - Returns JSON 401/403 errors via ApiAuthenticationEntryPoint / ApiAccessDeniedHandler
 *    - CORS and CSRF-disable unchanged
 *
 * 2. webFilterChain  (Order 2) — all other paths
 *    - OAuth2 login with Cognito (unchanged)
 */
@Configuration
@EnableWebSecurity
public class SecurityConfiguration {

    private final CorsConfigurationSource corsConfigurationSource;
    private final CognitoJwtAuthenticationConverter cognitoJwtAuthenticationConverter;
    private final ApiAuthenticationEntryPoint apiAuthenticationEntryPoint;
    private final ApiAccessDeniedHandler apiAccessDeniedHandler;

    public SecurityConfiguration(
            CorsConfigurationSource corsConfigurationSource,
            CognitoJwtAuthenticationConverter cognitoJwtAuthenticationConverter,
            ApiAuthenticationEntryPoint apiAuthenticationEntryPoint,
            ApiAccessDeniedHandler apiAccessDeniedHandler) {
        this.corsConfigurationSource = corsConfigurationSource;
        this.cognitoJwtAuthenticationConverter = cognitoJwtAuthenticationConverter;
        this.apiAuthenticationEntryPoint = apiAuthenticationEntryPoint;
        this.apiAccessDeniedHandler = apiAccessDeniedHandler;
    }

    /**
     * Security filter chain for /api/** endpoints.
     * Validates Cognito JWTs and enforces role-based access control.
     */
    @Bean
    @Order(1)
    public SecurityFilterChain apiFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/api/**")
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .csrf(csrf -> csrf.disable())

            // JWT resource server — validates tokens against Cognito JWKS
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(cognitoJwtAuthenticationConverter))
            )

            // JSON error responses (no HTML pages)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(apiAuthenticationEntryPoint)
                .accessDeniedHandler(apiAccessDeniedHandler)
            )

            // ----------------------------------------------------------------
            // Endpoint access rules (evaluated top-to-bottom, first match wins)
            // ----------------------------------------------------------------
            .authorizeHttpRequests(authz -> authz

                // Rule 1: CORS preflight — never requires a token
                .requestMatchers(HttpMethod.OPTIONS, "/api/**").permitAll()

                // Rules 2–3: auth endpoints — always public (register, login, refresh)
                .requestMatchers("/api/v1/auth/register").permitAll()
                .requestMatchers("/api/v1/auth/login").permitAll()
                .requestMatchers("/api/v1/auth/refresh").permitAll()
                // /api/v1/auth/logout and /api/v1/auth/me require a valid token (authenticated)

                // Rules 4–5: public read endpoints
                .requestMatchers(HttpMethod.GET,  "/api/v1/allcourses").permitAll()
                .requestMatchers(HttpMethod.GET,  "/api/v1/course/search").permitAll()

                // Rules 4–6: authenticated read endpoints (any valid JWT)
                .requestMatchers(HttpMethod.GET,  "/api/v1/course/{courseId}/chapters").authenticated()
                .requestMatchers(HttpMethod.GET,  "/api/v1/chapter/{chapterId}/lessons").authenticated()
                .requestMatchers(HttpMethod.GET,  "/api/v1/lesson/{id}").authenticated()

                // Rules 7–9: course write — INSTRUCTOR or ADMIN only
                .requestMatchers(HttpMethod.POST,   "/api/v1/course").hasAnyRole("INSTRUCTOR", "ADMIN")
                .requestMatchers(HttpMethod.PUT,    "/api/v1/course/{id}").hasAnyRole("INSTRUCTOR", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/course/{id}").hasAnyRole("INSTRUCTOR", "ADMIN")

                // Rules 10–12: chapter write — INSTRUCTOR or ADMIN only
                .requestMatchers(HttpMethod.POST,   "/api/v1/chapter").hasAnyRole("INSTRUCTOR", "ADMIN")
                .requestMatchers(HttpMethod.PUT,    "/api/v1/chapter/{id}").hasAnyRole("INSTRUCTOR", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/chapter/{id}").hasAnyRole("INSTRUCTOR", "ADMIN")

                // Rules 13–15: lesson write — INSTRUCTOR or ADMIN only
                .requestMatchers(HttpMethod.POST,   "/api/v1/lesson").hasAnyRole("INSTRUCTOR", "ADMIN")
                .requestMatchers(HttpMethod.PUT,    "/api/v1/lesson/{id}").hasAnyRole("INSTRUCTOR", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/lesson/{id}").hasAnyRole("INSTRUCTOR", "ADMIN")

                // Rule 16: catch-all — any other /api/** requires authentication
                .anyRequest().authenticated()
            );

        return http.build();
    }

    /**
     * Security filter chain for web (non-API) endpoints.
     * Handles Cognito OAuth2 login for browser-based flows. Unchanged.
     */
    @Bean
    @Order(2)
    public SecurityFilterChain webFilterChain(HttpSecurity http) throws Exception {
        CognitoLogoutHandler cognitoLogoutHandler = new CognitoLogoutHandler();

        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .csrf(Customizer.withDefaults())
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(Customizer.withDefaults())
            .logout(logout -> logout.logoutSuccessHandler(cognitoLogoutHandler));

        return http.build();
    }
}
