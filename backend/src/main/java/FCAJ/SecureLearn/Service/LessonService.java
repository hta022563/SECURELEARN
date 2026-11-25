package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Chapter;
import FCAJ.SecureLearn.Model.Course;
import FCAJ.SecureLearn.Model.Lesson;
import FCAJ.SecureLearn.Model.VideoStatus;
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
    private final LessonPositionService lessonPositionService;

    public LessonService(CourseRepo courseRepo, ChapterRepo chapterRepo, LessonRepo lessonRepo,
            LessonPositionService lessonPositionService) {
        this.courseRepo = courseRepo;
        this.chapterRepo = chapterRepo;
        this.lessonRepo = lessonRepo;
        this.lessonPositionService = lessonPositionService;
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
     *
     * Every way of creating a lesson ends here (POST /lesson via addLesson, and both upload
     * paths), so this is the one place the new lesson is given its position: last in its chapter.
     */
    @Transactional
    public UUID addLessonReturningId(UUID chapterId, String title, String description, String videoUrl, UUID courseId) {
        Chapter parentChapter = findChapter(chapterId, "add lesson");
        Course parentCourse = findCourse(courseId, "add lesson");
        requireChapterBelongsToCourse(parentChapter, courseId);
        parentCourse.setLastUpdateTime(LocalDateTime.now());
        courseRepo.save(parentCourse);
        Lesson newLesson = new Lesson(parentChapter, title, description, videoUrl);
        newLesson.setPosition(lessonPositionService.nextPosition(chapterId));
        return lessonRepo.save(newLesson).getId();
    }

    @Transactional
    public void addLesson(UUID chapterId, String title, String description, String videoUrl, UUID courseId) {
        addLessonReturningId(chapterId, title, description, videoUrl, courseId);
    }

    /** Deletes the lesson, then closes the gap it leaves so the chapter stays numbered 1..n. */
    @Transactional
    public void deleteLesson(UUID lessonId) {
        Lesson lessonToDelete = findLesson(lessonId, "delete lesson");
        UUID chapterId = lessonToDelete.getChapter().getId();
        lessonRepo.delete(lessonToDelete);
        lessonPositionService.renumber(chapterId);
    }

    public List<Lesson> getLessonsInChapter(UUID chapterId) {
        return lessonPositionService.sortedLessons(chapterId);
    }

    @Transactional(readOnly = true)
    public List<LessonResponse> getLessonResponsesInChapter(UUID chapterId) {
        return lessonPositionService.sortedLessons(chapterId).stream()
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

    // ── Upload pipeline (UploadController / LessonVideoService) ──────────────────────────

    /** FFmpeg path: the video is already processed, so the lesson's video is replaced and READY at once. */
    @Transactional
    public void replaceLessonVideo(UUID courseId, UUID lessonId, String title, String description, String videoUrl) {
        updateLesson(courseId, lessonId, title, description, videoUrl);
        Lesson lesson = findLesson(lessonId, "replace lesson video");
        clearProcessing(lesson);
        lesson.setVideoStatus(VideoStatus.READY);
        lessonRepo.save(lesson);
    }

    /** MediaConvert path, new lesson: created with no video yet; url is set when the job completes. */
    @Transactional
    public UUID addProcessingLesson(UUID chapterId, String title, String description, UUID courseId,
            String jobId, String pendingUrl, String sourceKey) {
        UUID lessonId = addLessonReturningId(chapterId, title, description, null, courseId);
        Lesson lesson = findLesson(lessonId, "start processing");
        startProcessing(lesson, jobId, pendingUrl, sourceKey);
        return lessonId;
    }

    /** MediaConvert path, replacement: title/description change now, the old video keeps playing until the job completes. */
    @Transactional
    public void markReplacementProcessing(UUID courseId, UUID lessonId, String title, String description,
            String jobId, String pendingUrl, String sourceKey) {
        Lesson lesson = findLesson(lessonId, "replace lesson video");
        updateLesson(courseId, lessonId, title, description, lesson.getUrl());
        startProcessing(findLesson(lessonId, "replace lesson video"), jobId, pendingUrl, sourceKey);
    }

    /** Job finished: switch the lesson to the new playlist. Returns the raw upload to delete (may be null). */
    @Transactional
    public String completeProcessing(UUID lessonId) {
        Lesson lesson = findLesson(lessonId, "complete processing");
        String sourceKey = lesson.getSourceKey();
        lesson.setUrl(lesson.getPendingUrl());
        clearProcessing(lesson);
        lesson.setVideoStatus(VideoStatus.READY);
        lessonRepo.save(lesson);
        return sourceKey;
    }

    /** Job failed: keep whatever url the lesson had (null for a new lesson) and record why. */
    @Transactional
    public void failProcessing(UUID lessonId, String error) {
        Lesson lesson = findLesson(lessonId, "fail processing");
        clearProcessing(lesson);
        lesson.setVideoStatus(VideoStatus.FAILED);
        lesson.setProcessingError(error == null || error.length() <= 500 ? error : error.substring(0, 500));
        lessonRepo.save(lesson);
    }

    private void startProcessing(Lesson lesson, String jobId, String pendingUrl, String sourceKey) {
        lesson.setVideoStatus(VideoStatus.PROCESSING);
        lesson.setProcessingJobId(jobId);
        lesson.setPendingUrl(pendingUrl);
        lesson.setSourceKey(sourceKey);
        lesson.setProcessingError(null);
        lessonRepo.save(lesson);
    }

    private void clearProcessing(Lesson lesson) {
        lesson.setProcessingJobId(null);
        lesson.setPendingUrl(null);
        lesson.setSourceKey(null);
        lesson.setProcessingError(null);
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
