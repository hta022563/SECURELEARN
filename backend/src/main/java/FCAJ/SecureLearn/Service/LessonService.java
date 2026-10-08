/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Chapter;
import FCAJ.SecureLearn.Model.Course;
import FCAJ.SecureLearn.Model.Lesson;
import FCAJ.SecureLearn.repositories.ChapterRepo;
import FCAJ.SecureLearn.repositories.CourseRepo;
import FCAJ.SecureLearn.repositories.LessonRepo;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 *
 * @author ngoct
 */
@Service
public class LessonService {
    private final CourseRepo courseRepo;
    private final ChapterRepo chapterRepo;
    private final LessonRepo lessonRepo;

    public LessonService(CourseRepo courseRepo, ChapterRepo chapterRepo, LessonRepo lessonRepo) {
        this.courseRepo = courseRepo;
        this.chapterRepo = chapterRepo;
        this.lessonRepo = lessonRepo;
    }

    public void addLesson(UUID chapter_id, String title, String description, String url, UUID course_id){
        Chapter chapter = chapterRepo.findById(chapter_id).orElseThrow();
        Course course = courseRepo.findById(course_id).orElseThrow();
        course.setLastUpdateTime(LocalDateTime.now());
        courseRepo.save(course);
        Lesson newLesson = new Lesson(chapter, title, description, url);
        lessonRepo.save(newLesson);
    }
    
    public void deleteLesson(UUID lesson_id){
        Lesson targetLesson = lessonRepo.findById(lesson_id).orElseThrow();
        lessonRepo.delete(targetLesson);
    }
    
    public List<Lesson> getLessonInChapter(UUID chapter_id){
        return lessonRepo.findByChapterId(chapter_id);
    }
    
    public Lesson getLessonInfo(UUID lesson_id){
        return lessonRepo.findById(lesson_id).orElseThrow();
    }
    
    public void updateLesson(UUID course_id,UUID lesson_id, String title, String description, String url){
        Lesson updatedLesson = lessonRepo.findById(lesson_id).orElseThrow();
        Course course = courseRepo.findById(course_id).orElseThrow();
        course.setLastUpdateTime(LocalDateTime.now());
        courseRepo.save(course);
        updatedLesson.setTitle(title);
        updatedLesson.setDescription(description);
        updatedLesson.setUrl(url);
        lessonRepo.save(updatedLesson);
    }
}
