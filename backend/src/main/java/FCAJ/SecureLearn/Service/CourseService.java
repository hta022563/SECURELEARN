/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import FCAJ.SecureLearn.Model.Course;
import java.util.UUID;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.PageIterable;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import FCAJ.SecureLearn.repositories.CourseRepo;

/**
 * Service for managing courses and lessons in DynamoDB
 * Uses dependency injection for DynamoDbEnhancedClient
 * 
 * @author ngoct
 */
@Service
public class CourseService {
    
    private static final Logger logger = LoggerFactory.getLogger(CourseService.class);
    private final CourseRepo courseRepo;

    public CourseService(CourseRepo courseRepo) {
        this.courseRepo = courseRepo;
    }

    public void addNewCourse(String title, String description, String instructor, float prices, LocalDateTime creationTime, LocalDateTime lastUpdatedTime){
        Course newCourse = new Course(title, description, prices, instructor, creationTime, lastUpdatedTime);
        courseRepo.save(newCourse);
    }
    
    
    public List<Course> getAllCourses(){
        return courseRepo.findAll();
    }
    
    public List<Course> getCourseByTitle(String title){
        return courseRepo.findByTitleContaining(title);
    }
    
    public void updateCourse(UUID id, String title, String description, String instructor, float prices, LocalDateTime lastUpdatedTime){
        Course updatedCourse = courseRepo.findById(id).orElseThrow();
        updatedCourse.setTitle(title);
        updatedCourse.setDescription(description);
        updatedCourse.setInstructor(instructor);
        updatedCourse.setPrice(prices);
        updatedCourse.setLastUpdateTime(lastUpdatedTime);
        courseRepo.save(updatedCourse);
    }
    
  
    public void deleteCourse(UUID id){
        Course targetCourse = courseRepo.findById(id).orElseThrow() ;
        courseRepo.delete(targetCourse);
    }
    
}
