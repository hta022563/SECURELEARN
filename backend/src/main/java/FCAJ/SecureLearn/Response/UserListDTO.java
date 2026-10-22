/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Response;

import java.time.Instant;
import java.util.List;

/**
 *
 * @author ngoct
 */
public record UserListDTO(String username, List<UserAttributeDTO> attributes, String role, String userStatus, Boolean enabled, Instant userCreateDate, Instant userLastModifiedDate){
    
}
