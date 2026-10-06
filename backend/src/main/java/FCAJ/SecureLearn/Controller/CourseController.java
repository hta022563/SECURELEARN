/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Model.Courses;
import FCAJ.SecureLearn.Request.LessonCreationRequest;
import FCAJ.SecureLearn.Request.CourseCreationRequest;
import FCAJ.SecureLearn.Request.KeySchemaRequest;
import FCAJ.SecureLearn.Request.PartitionKeyRequest;
import FCAJ.SecureLearn.Service.CourseService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import software.amazon.awssdk.enhanced.dynamodb.model.PageIterable;

/**
 *
 * @author ngoct
 */
@RestController
public class CourseController {
    private final CourseService courseService;

    public CourseController(CourseService courses) {
        this.courseService = courses;
    }
    @PostMapping("/course")
    public ResponseEntity<?> createCourse(@RequestBody CourseCreationRequest request){
        courseService.addNewCourse(request.getId(), request.getTitle(),request.getDescription(), request.getInstructor(), request.getPrices(),LocalDateTime.now(),LocalDateTime.now());
        return ResponseEntity.ok().body(Map.of("success","Courses added successfully"));
    }
    @PostMapping("/lesson")
    public ResponseEntity<?> addLesson(@RequestBody LessonCreationRequest request){
        courseService.addLesson(request.getId(), request.getChapter(), request.getTitle(), request.getDescription(), request.getVideoURL());
        return ResponseEntity.ok().body(Map.of("success","Lesson added successfully"));
    }
    @GetMapping("/allcourses")
    public ResponseEntity<?> getAllCourses(){
        List<Courses> courseList = courseService.getAllCourses();
        return ResponseEntity.ok(courseList);
    }
    @GetMapping("/course")
    public ResponseEntity<?> getCourses(@RequestBody PartitionKeyRequest request){
        List<Courses> courseList = courseService.getCourseByPk(request.getPartitionKey());
        return ResponseEntity.ok(courseList);
    }
    @GetMapping("/lesson")
    public ResponseEntity<?> getLesson(@RequestBody KeySchemaRequest request){
        Courses searchLesson = courseService.getLesson(request.getPartitionKey(), request.getSortKey());
        return ResponseEntity.ok(searchLesson);
    }
    @PostMapping("/updateCourse")
    public ResponseEntity<?> updateCourse(@RequestBody CourseCreationRequest request){
        courseService.updateCourse(request.getId(), request.getTitle(),request.getDescription(), request.getInstructor(), request.getPrices(), LocalDateTime.now());
        return ResponseEntity.ok().body(Map.of("success","Courses updated successfully"));
    }
    
    @PostMapping("/updatelesson")
    public ResponseEntity<?> updateLesson(@RequestBody LessonCreationRequest request){
        courseService.updateLesson(request.getId(), request.getChapter(), request.getTitle(), request.getDescription(), request.getVideoURL());
        return ResponseEntity.ok().body(Map.of("success","Lesson update successfully"));
    }
    @DeleteMapping("/course")
    public ResponseEntity<?> deleteCourse(@RequestBody PartitionKeyRequest request){
        courseService.deleteCourse(request.getPartitionKey());
        return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/lesson")
    public ResponseEntity<?> deleteLesson(@RequestBody KeySchemaRequest request){
        courseService.deleteLesson(request.getPartitionKey(), request.getSortKey());
        return ResponseEntity.noContent().build();
    }
    
}
