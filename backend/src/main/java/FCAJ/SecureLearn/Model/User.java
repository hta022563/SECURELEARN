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
public class User {
    enum Role{INSTRUCTOR, STUDENT, ADMIN};
    String username;
    String password;
    Role role;
    LocalDateTime creationDate;

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
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    
    public LocalDateTime getCreationDate() {
        return creationDate;
    }

    public void setCreationDate(LocalDateTime creationDate) {
        this.creationDate = creationDate;
    }

    public User(String username, String password, Role role, LocalDateTime creationDate) {
        this.username = username;
        this.password = password;
        this.role = role;
        this.creationDate = creationDate;
    }

    

    public User() {
    }
    
}
