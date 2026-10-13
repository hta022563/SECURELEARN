/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import FCAJ.SecureLearn.Model.Chapter;
import FCAJ.SecureLearn.Model.Course;
import FCAJ.SecureLearn.Model.Lesson;
import FCAJ.SecureLearn.Response.LessonResponse;
import FCAJ.SecureLearn.repositories.ChapterRepo;
import FCAJ.SecureLearn.repositories.CourseRepo;
import FCAJ.SecureLearn.repositories.LessonRepo;

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

    @Transactional(readOnly = true)
    public void validateUploadTarget(UUID chapterId, UUID courseId, UUID lessonIdToReplace) {
        if (!courseRepo.existsById(courseId)) {
            throw new EntityNotFoundException("Course not found");
        }
        if (lessonIdToReplace != null) {
            Lesson lesson = lessonRepo.findById(lessonIdToReplace)
                    .orElseThrow(() -> new EntityNotFoundException("Lesson not found"));
            requireChapterBelongsToCourse(lesson.getChapter(), courseId);
            if (chapterId != null && !chapterId.equals(lesson.getChapter().getId())) {
                throw new EntityNotFoundException("Lesson does not belong to the supplied chapter");
            }
            return;
        }
        Chapter chapter = chapterRepo.findById(chapterId)
                .orElseThrow(() -> new EntityNotFoundException("Chapter not found"));
        requireChapterBelongsToCourse(chapter, courseId);
    }

    /**
     * Creates a lesson and returns its generated UUID.
     * Used by the upload pipeline so the frontend gets the lesson ID
     * immediately after the video is processed.
     */
    @Transactional
    public UUID addLessonReturningId(UUID chapter_id, String title, String description, String url, UUID course_id){
        Chapter chapter = chapterRepo.findById(chapter_id).orElseThrow();
        Course course = courseRepo.findById(course_id).orElseThrow();
        requireChapterBelongsToCourse(chapter, course_id);
        course.setLastUpdateTime(LocalDateTime.now());
        courseRepo.save(course);
        Lesson newLesson = new Lesson(chapter, title, description, url);
        return lessonRepo.save(newLesson).getId();
    }

    @Transactional
    public void addLesson(UUID chapter_id, String title, String description, String url, UUID course_id){
        Chapter chapter = chapterRepo.findById(chapter_id).orElseThrow();
        Course course = courseRepo.findById(course_id).orElseThrow();
        requireChapterBelongsToCourse(chapter, course_id);
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

    @Transactional(readOnly = true)
    public List<LessonResponse> getLessonResponsesInChapter(UUID chapterId) {
        return lessonRepo.findByChapterId(chapterId).stream()
                .map(LessonResponse::from)
                .toList();
    }
    
    public Lesson getLessonInfo(UUID lesson_id){
        return lessonRepo.findById(lesson_id).orElseThrow();
    }

    @Transactional(readOnly = true)
    public LessonResponse getLessonResponse(UUID lessonId) {
        return lessonRepo.findById(lessonId)
                .map(LessonResponse::from)
                .orElseThrow();
    }
    
    @Transactional
    public void updateLesson(UUID course_id,UUID lesson_id, String title, String description, String url){
        Lesson updatedLesson = lessonRepo.findById(lesson_id).orElseThrow();
        Course course = courseRepo.findById(course_id).orElseThrow();
        requireChapterBelongsToCourse(updatedLesson.getChapter(), course_id);
        course.setLastUpdateTime(LocalDateTime.now());
        courseRepo.save(course);
        updatedLesson.setTitle(title);
        updatedLesson.setDescription(description);
        updatedLesson.setUrl(url);
        lessonRepo.save(updatedLesson);
    }

    private void requireChapterBelongsToCourse(Chapter chapter, UUID courseId) {
        if (chapter.getCourse() == null || !courseId.equals(chapter.getCourse().getId())) {
            throw new EntityNotFoundException("Chapter does not belong to the supplied course");
        }
    }
}
