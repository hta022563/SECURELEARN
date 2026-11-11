package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Chapter;
import FCAJ.SecureLearn.Model.Course;
import FCAJ.SecureLearn.Model.Lesson;
import FCAJ.SecureLearn.Repositories.ChapterRepo;
import FCAJ.SecureLearn.Repositories.CourseRepo;
import FCAJ.SecureLearn.Repositories.LessonRepo;
import FCAJ.SecureLearn.Response.LessonResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
            throw new EntityNotFoundException("Upload rejected: no course found with id " + courseId);
        }
        if (lessonIdToReplace != null) {
            Lesson lessonToReplace = lessonRepo.findById(lessonIdToReplace)
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Upload rejected: no lesson found with id " + lessonIdToReplace));
            requireChapterBelongsToCourse(lessonToReplace.getChapter(), courseId);
            if (chapterId != null && !chapterId.equals(lessonToReplace.getChapter().getId())) {
                throw new EntityNotFoundException("Upload rejected: lesson " + lessonIdToReplace
                        + " belongs to chapter " + lessonToReplace.getChapter().getId()
                        + ", not the supplied chapter " + chapterId);
            }
            return;
        }
        Chapter targetChapter = chapterRepo.findById(chapterId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Upload rejected: no chapter found with id " + chapterId));
        requireChapterBelongsToCourse(targetChapter, courseId);
    }

    /**
     * Creates a lesson and returns its generated UUID.
     * Used by the upload pipeline so the frontend gets the lesson ID
     * immediately after the video is processed.
     */
    @Transactional
    public UUID addLessonReturningId(UUID chapterId, String title, String description, String videoUrl, UUID courseId) {
        Chapter parentChapter = findChapter(chapterId, "add lesson");
        Course parentCourse = findCourse(courseId, "add lesson");
        requireChapterBelongsToCourse(parentChapter, courseId);
        parentCourse.setLastUpdateTime(LocalDateTime.now());
        courseRepo.save(parentCourse);
        Lesson newLesson = new Lesson(parentChapter, title, description, videoUrl);
        return lessonRepo.save(newLesson).getId();
    }

    @Transactional
    public void addLesson(UUID chapterId, String title, String description, String videoUrl, UUID courseId) {
        addLessonReturningId(chapterId, title, description, videoUrl, courseId);
    }

    public void deleteLesson(UUID lessonId) {
        Lesson lessonToDelete = findLesson(lessonId, "delete lesson");
        lessonRepo.delete(lessonToDelete);
    }

    public List<Lesson> getLessonsInChapter(UUID chapterId) {
        return lessonRepo.findByChapterId(chapterId);
    }

    @Transactional(readOnly = true)
    public List<LessonResponse> getLessonResponsesInChapter(UUID chapterId) {
        return lessonRepo.findByChapterId(chapterId).stream()
                .map(LessonResponse::from)
                .toList();
    }

    public Lesson getLessonInfo(UUID lessonId) {
        return findLesson(lessonId, "get lesson info");
    }

    @Transactional(readOnly = true)
    public LessonResponse getLessonResponse(UUID lessonId) {
        return LessonResponse.from(findLesson(lessonId, "get lesson"));
    }

    @Transactional
    public void updateLesson(UUID courseId, UUID lessonId, String title, String description, String videoUrl) {
        Lesson lessonToUpdate = findLesson(lessonId, "update lesson");
        Course parentCourse = findCourse(courseId, "update lesson " + lessonId);
        requireChapterBelongsToCourse(lessonToUpdate.getChapter(), courseId);
        parentCourse.setLastUpdateTime(LocalDateTime.now());
        courseRepo.save(parentCourse);
        lessonToUpdate.setTitle(title);
        lessonToUpdate.setDescription(description);
        lessonToUpdate.setUrl(videoUrl);
        lessonRepo.save(lessonToUpdate);
    }

    private void requireChapterBelongsToCourse(Chapter chapter, UUID courseId) {
        if (chapter.getCourse() == null || !courseId.equals(chapter.getCourse().getId())) {
            UUID actualCourseId = chapter.getCourse() == null ? null : chapter.getCourse().getId();
            throw new EntityNotFoundException("Chapter " + chapter.getId() + " belongs to course "
                    + actualCourseId + ", not the supplied course " + courseId);
        }
    }

    private Lesson findLesson(UUID lessonId, String action) {
        return lessonRepo.findById(lessonId)
                .orElseThrow(() -> new NoSuchElementException(
                        "Cannot " + action + ": no lesson found with id " + lessonId));
    }

    private Chapter findChapter(UUID chapterId, String action) {
        return chapterRepo.findById(chapterId)
                .orElseThrow(() -> new NoSuchElementException(
                        "Cannot " + action + ": no chapter found with id " + chapterId));
    }

    private Course findCourse(UUID courseId, String action) {
        return courseRepo.findById(courseId)
                .orElseThrow(() -> new NoSuchElementException(
                        "Cannot " + action + ": no course found with id " + courseId));
    }
}
