/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Model;


import java.time.LocalDateTime;


/**
 *
 * @author ngoct
 */

public class Users {
    private long id;
    public enum Role{INSTRUCTOR, STUDENT, ADMIN};
    String username;
    String password_hash;
    Role role;
    LocalDateTime created_at;

    public Users(String username, String password_hash, Role role, LocalDateTime created_at) {
        this.username = username;
        this.password_hash = password_hash;
        this.role = role;
        this.created_at = created_at;
    }
    
    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
    
    
    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password_hash;
    }

    public void setPassword(String password) {
        this.password_hash = password;
    }

    
    public LocalDateTime getCreationDate() {
        return created_at;
    }

    public void setCreationDate(LocalDateTime creationDate) {
        this.created_at = creationDate;
    }    

    public Users() {
    }
    
}
