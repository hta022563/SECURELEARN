/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Request;

/**
 *
 * @author ngoct
 */
public class CourseCreationRequest {
    String title, description, instructor;
    long prices;

    public CourseCreationRequest() {
    }

    public CourseCreationRequest(String title, String description, String instructor, long prices) {
        this.title = title;
        this.description = description;
        this.instructor = instructor;
        this.prices = prices;
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

    public String getInstructor() {
        return instructor;
    }

    public void setInstructor(String instructor) {
        this.instructor = instructor;
    }

    public long getPrices() {
        return prices;
    }

    public void setPrices(long prices) {
        this.prices = prices;
    }
    
}
