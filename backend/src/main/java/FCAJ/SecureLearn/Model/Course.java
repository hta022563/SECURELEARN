/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Model;

import jakarta.persistence.Entity;
import java.time.LocalDateTime;

/**
 *
 * @author ngoct
 */
@Entity
public class Course {
    String title;
    String description;
    float price;
    LocalDateTime CreationDate;
    String owner;

    public Course(String title, String description, float price, LocalDateTime CreationDate, String owner) {
        this.title = title;
        this.description = description;
        this.price = price;
        this.CreationDate = CreationDate;
        this.owner = owner;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public float getPrice() {
        return price;
    }

    public void setPrice(float price) {
        this.price = price;
    }

    public LocalDateTime getCreationDate() {
        return CreationDate;
    }

    public void setCreationDate(LocalDateTime CreationDate) {
        this.CreationDate = CreationDate;
    }

    public String getOwner() {
        return owner;
    }

    public void setOwner(String owner) {
        this.owner = owner;
    }
    
}
