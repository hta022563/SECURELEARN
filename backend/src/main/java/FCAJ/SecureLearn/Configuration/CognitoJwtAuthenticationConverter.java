package FCAJ.SecureLearn.Configuration;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Converts a validated Cognito JWT into a Spring Security authentication token.
 * Reads the {@code cognito:groups} claim and maps each group name to a
 * {@code ROLE_<GROUP>} granted authority so that {@code hasRole()} and
 * {@code hasAnyRole()} work correctly in the security filter chain.
 */
@Component
public class CognitoJwtAuthenticationConverter
        implements Converter<Jwt, AbstractAuthenticationToken> {

    /** The Cognito JWT claim that holds the user's group memberships. */
    private static final String COGNITO_GROUPS_CLAIM = "cognito:groups";

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = extractAuthorities(jwt);
        return new JwtAuthenticationToken(jwt, authorities);
    }

    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        List<String> groups = jwt.getClaimAsStringList(COGNITO_GROUPS_CLAIM);
        if (groups == null || groups.isEmpty()) {
            return Collections.emptyList();
        }
        return groups.stream()
                .map(group -> new SimpleGrantedAuthority("ROLE_" + group))
                .collect(Collectors.toList());
    }
}
