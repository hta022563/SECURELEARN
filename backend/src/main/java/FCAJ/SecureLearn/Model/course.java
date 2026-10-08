/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Model;


import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import static jakarta.persistence.FetchType.LAZY;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;


/**
 *
 * @author ngoct
 */
@Entity
public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false, length = 200)
    private String title;
    
    @Column(nullable = false, length = 500)
    private String description;
    
    @Column(nullable = false)
    private float price;
    
    @Column(nullable = false, length = 200)
    private String instructor;
    
    @Column(nullable = false)
    private LocalDateTime creationTime;
    
    @Column(nullable = false)
    private LocalDateTime lastUpdateTime;
    
    @OneToMany(mappedBy="course", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Chapter> chapter = new ArrayList();
    
    public Course() {
    }
    
    public Course(String title, String description, float price, String instructor, LocalDateTime creationTime, LocalDateTime lastUpdateTime) {
        this.title = title;
        this.description = description;
        this.price = price;
        this.instructor = instructor;
        this.creationTime = creationTime;
        this.lastUpdateTime = lastUpdateTime;
    }
    
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public String getInstructor() {
        return instructor;
    }

    public void setInstructor(String instructor) {
        this.instructor = instructor;
    }

    public LocalDateTime getCreationTime() {
        return creationTime;
    }

    public void setCreationTime(LocalDateTime creationTime) {
        this.creationTime = creationTime;
    }

    public LocalDateTime getLastUpdateTime() {
        return lastUpdateTime;
    }

    public void setLastUpdateTime(LocalDateTime lastUpdateTime) {
        this.lastUpdateTime = lastUpdateTime;
    }
    
    
}
