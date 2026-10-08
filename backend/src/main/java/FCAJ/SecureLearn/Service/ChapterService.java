/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Chapter;
import FCAJ.SecureLearn.Model.Course;
import FCAJ.SecureLearn.repositories.ChapterRepo;
import java.util.List;
import org.springframework.stereotype.Service;
import FCAJ.SecureLearn.repositories.CourseRepo;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 *
 * @author ngoct
 */
@Service
public class ChapterService {
    private final ChapterRepo chapterRepo;
    private final CourseRepo courseRepo;

    public ChapterService(ChapterRepo chapterRepo, CourseRepo courseRepo) {
        this.chapterRepo = chapterRepo;
        this.courseRepo = courseRepo;
    }
    
    public void createChapter(String title, String description, UUID course_id){
        Course course = courseRepo.findById(course_id).orElseThrow();
        course.setLastUpdateTime(LocalDateTime.now());
        Chapter newChapter = new Chapter(course, title, description);
        courseRepo.save(course);
        chapterRepo.save(newChapter);
    }
    
    public void deleteChapter(UUID id){
        Chapter targetChapter = chapterRepo.findById(id).orElseThrow();
        chapterRepo.delete(targetChapter);
    }
    
    public void updateChapter (UUID chapter_id, String title, String description, UUID course_id){
        Chapter updatedChapter = chapterRepo.findById(chapter_id).orElseThrow();
        Course updatedCourse = courseRepo.findById(course_id).orElseThrow();
        updatedCourse.setLastUpdateTime(LocalDateTime.now());
        updatedChapter.setTitle(title);
        updatedChapter.setDescription(description);
        courseRepo.save(updatedCourse);
        chapterRepo.save(updatedChapter);
    }
    public List<Chapter> getAllChapterInCourse(UUID id){
        return chapterRepo.findByCourseId(id);
    }
}
