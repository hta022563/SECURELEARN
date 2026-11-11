package FCAJ.SecureLearn.Response;

import java.time.Instant;
import java.util.List;

/**
 *
 * @author ngoct
 */
public record UserListDTO(String username, List<UserAttributeDTO> attributes, String role, String userStatus, Boolean enabled, Instant userCreateDate, Instant userLastModifiedDate) {

}
