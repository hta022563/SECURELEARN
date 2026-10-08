/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import FCAJ.SecureLearn.Model.Course;
import FCAJ.SecureLearn.Model.Chapter;
import FCAJ.SecureLearn.Model.Lesson;
import FCAJ.SecureLearn.Request.CourseCreationRequest;
import FCAJ.SecureLearn.Request.ChapterCreationRequest;
import FCAJ.SecureLearn.Request.LessonCreationRequest;
import FCAJ.SecureLearn.Service.ChapterService;
import FCAJ.SecureLearn.Service.CourseService;
import FCAJ.SecureLearn.Service.LessonService;

/**
 * REST Controller for Course, Chapter, and Lesson management.
 * Base path: /api/v1
 * 
 * @author ngoct
 */
@RestController
@RequestMapping("/api/v1")
public class CourseController {
    private final CourseService courseService;
    private final ChapterService chapterService;
    private final LessonService lessonService;

    public CourseController(CourseService courseService, ChapterService chapterService, LessonService lessonService) {
        this.courseService = courseService;
        this.chapterService = chapterService;
        this.lessonService = lessonService;
    }
    
    // =========================================================================
    // COURSE ENDPOINTS
    // =========================================================================
    
    /**
     * Create a new course
     * POST /api/v1/course
     */
    @PostMapping("/course")
    public ResponseEntity<?> createCourse(@RequestBody CourseCreationRequest request){
       courseService.addNewCourse(request.getTitle(), request.getDescription(), request.getInstructor(), request.getPrices(), LocalDateTime.now(), LocalDateTime.now());
       return ResponseEntity.ok().body(Map.of("success", "Course added successfully"));
    }
    
    /**
     * Get all courses
     * GET /api/v1/allcourses
     */
    @GetMapping("/allcourses")
    public ResponseEntity<List<Course>> getAllCourses(){
        List<Course> courses = courseService.getAllCourses();
        return ResponseEntity.ok(courses);
    }
    
    /**
     * Search courses by title (partial match)
     * GET /api/v1/course/search?title=security
     */
    @GetMapping("/course/search")
    public ResponseEntity<List<Course>> searchCoursesByTitle(@RequestParam String title){
        List<Course> courses = courseService.getCourseByTitle(title);
        return ResponseEntity.ok(courses);
    }
    
    /**
     * Update a course
     * PUT /api/v1/course/{id}
     */
    @PutMapping("/course/{id}")
    public ResponseEntity<?> updateCourse(@PathVariable UUID id, @RequestBody CourseCreationRequest request){
        courseService.updateCourse(id, request.getTitle(), request.getDescription(), request.getInstructor(), request.getPrices(), LocalDateTime.now());
        return ResponseEntity.ok().body(Map.of("success", "Course updated successfully"));
    }
    
    /**
     * Delete a course (cascades to chapters and lessons)
     * DELETE /api/v1/course/{id}
     */
    @DeleteMapping("/course/{id}")
    public ResponseEntity<?> deleteCourse(@PathVariable UUID id){
        courseService.deleteCourse(id);
        return ResponseEntity.ok().body(Map.of("success", "Course deleted successfully"));
    }
    
    // =========================================================================
    // CHAPTER ENDPOINTS
    // =========================================================================
    
    /**
     * Create a new chapter in a course
     * POST /api/v1/chapter
     */
    @PostMapping("/chapter")
    public ResponseEntity<?> addChapter(@RequestBody ChapterCreationRequest request){
        chapterService.createChapter(request.getTitle(), request.getDescription(), request.getCourse_id());
        return ResponseEntity.ok().body(Map.of("success","Chapter added successfully"));
    }
    
    /**
     * Get all chapters in a specific course
     * GET /api/v1/course/{courseId}/chapters
     */
    @GetMapping("/course/{courseId}/chapters")
    public ResponseEntity<List<Chapter>> getAllChaptersInCourse(@PathVariable UUID courseId){
        List<Chapter> chapters = chapterService.getAllChapterInCourse(courseId);
        return ResponseEntity.ok(chapters);
    }
    
    /**
     * Update a chapter
     * PUT /api/v1/chapter/{id}
     */
    @PutMapping("/chapter/{id}")
    public ResponseEntity<?> updateChapter(@PathVariable UUID id, @RequestBody ChapterCreationRequest request){
        chapterService.updateChapter(id, request.getTitle(), request.getDescription(), request.getCourse_id());
        return ResponseEntity.ok().body(Map.of("success", "Chapter updated successfully"));
    }
    
    /**
     * Delete a chapter (cascades to lessons)
     * DELETE /api/v1/chapter/{id}
     */
    @DeleteMapping("/chapter/{id}")
    public ResponseEntity<?> deleteChapter(@PathVariable UUID id){
        chapterService.deleteChapter(id);
        return ResponseEntity.ok().body(Map.of("success", "Chapter deleted successfully"));
    }
    
    // =========================================================================
    // LESSON ENDPOINTS
    // =========================================================================
    
    /**
     * Create a new lesson in a chapter
     * POST /api/v1/lesson
     */
    @PostMapping("/lesson")
    public ResponseEntity<?> addLesson(@RequestBody LessonCreationRequest request){
        lessonService.addLesson(request.getChapter_id(), request.getTitle(), request.getDescription(), request.getUrl(), request.getCourse_id());
        return ResponseEntity.ok().body(Map.of("success","Lesson added successfully"));
    }
    
    /**
     * Get all lessons in a specific chapter
     * GET /api/v1/chapter/{chapterId}/lessons
     */
    @GetMapping("/chapter/{chapterId}/lessons")
    public ResponseEntity<List<Lesson>> getAllLessonsInChapter(@PathVariable UUID chapterId){
        List<Lesson> lessons = lessonService.getLessonInChapter(chapterId);
        return ResponseEntity.ok(lessons);
    }
    
    /**
     * Get a specific lesson by ID
     * GET /api/v1/lesson/{id}
     */
    @GetMapping("/lesson/{id}")
    public ResponseEntity<Lesson> getLessonById(@PathVariable UUID id){
        Lesson lesson = lessonService.getLessonInfo(id);
        return ResponseEntity.ok(lesson);
    }
    
    /**
     * Update a lesson
     * PUT /api/v1/lesson/{id}
     */
    @PutMapping("/lesson/{id}")
    public ResponseEntity<?> updateLesson(@PathVariable UUID id, @RequestBody LessonCreationRequest request){
        lessonService.updateLesson(request.getCourse_id(), id, request.getTitle(), request.getDescription(), request.getUrl());
        return ResponseEntity.ok().body(Map.of("success", "Lesson updated successfully"));
    }
    
    /**
     * Delete a lesson
     * DELETE /api/v1/lesson/{id}
     */
    @DeleteMapping("/lesson/{id}")
    public ResponseEntity<?> deleteLesson(@PathVariable UUID id){
        lessonService.deleteLesson(id);
        return ResponseEntity.ok().body(Map.of("success", "Lesson deleted successfully"));
    }
}
