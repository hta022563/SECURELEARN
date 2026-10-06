/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Configuration.DynamoConfiguration;
import FCAJ.SecureLearn.Model.Courses;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.PageIterable;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;

/**
 *
 * @author ngoct
 */
@Service
public class CourseService {
    DynamoDbTable<Courses> courseTable = DynamoConfiguration.enhanced().table("Courses", TableSchema.fromBean(Courses.class));
    public void addNewCourse(String id, String title, String description, String instructor, float prices, LocalDateTime creationTime, LocalDateTime lastUpdatedTime){
        Courses newCourse = new Courses(id,"Meta");
        newCourse.setTitle(title);
        newCourse.setDescription(description);
        newCourse.setInstructor(instructor);
        newCourse.setPrice(prices);
        newCourse.setCreationTime(creationTime);
        newCourse.setLastUpdatedTime(lastUpdatedTime);
        courseTable.putItem(newCourse);
    }
    
    public void addLesson(String id, String Chapter, String title, String description, String videoURL){
        Courses newCourse = new Courses(id, Chapter);
        newCourse.setTitle(title);
        newCourse.setDescription(description);
        newCourse.setVideoURL(videoURL);
        courseTable.putItem(newCourse);
    }
    
    public List<Courses> getAllCourses(){
        PageIterable<Courses> courseIterable = courseTable.scan();
        List<Courses> courseList = courseIterable.items().stream().toList();
        return courseList;
    }
    
    public List<Courses> getCourseByPk(String pk){
        QueryConditional query  = QueryConditional.keyEqualTo(Key.builder().addPartitionValue(pk).build());
        PageIterable<Courses> courseIterable = courseTable.query(query);
        return courseIterable.items().stream().toList();
    }
    
    public Courses getLesson(String pk, String sk){
        Key searchKey = Key.builder().addPartitionValue(pk).addSortValue(sk).build();
        return courseTable.getItem(searchKey);
    }
    
    public void updateCourse(String id, String title, String description, String instructor, float prices, LocalDateTime lastUpdatedTime){
        Courses updatedCourse = getLesson(id, "Meta");
        updatedCourse.setTitle(title);
        updatedCourse.setDescription(description);
        updatedCourse.setInstructor(instructor);
        updatedCourse.setPrice(prices);
        updatedCourse.setCreationTime(updatedCourse.getCreationTime());
        updatedCourse.setLastUpdatedTime(lastUpdatedTime);
        courseTable.updateItem(updatedCourse);
    }
    
    public void updateLesson(String id, String Chapter, String title, String description, String videoURL){
        Courses updatedLesson = getLesson(id, Chapter);
        updatedLesson.setTitle(title);
        updatedLesson.setDescription(description);
        updatedLesson.setVideoURL(videoURL);
        courseTable.updateItem(updatedLesson);
    }
    
    public void deleteLesson(String id, String Chapter){
        Key searchKey = Key.builder().addPartitionValue(id).addSortValue(Chapter).build();
        courseTable.deleteItem(searchKey);
    }
    public void deleteCourse(String id){
        Key searchKey = Key.builder().addPartitionValue(id).build();
        QueryConditional query = QueryConditional.keyEqualTo(searchKey);
        List<Courses> targetList = courseTable.query(query).items().stream().toList();
        for(Courses course: targetList){
            courseTable.deleteItem(course);
        }
    }
}
