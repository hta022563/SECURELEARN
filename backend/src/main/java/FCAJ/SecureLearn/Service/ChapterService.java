package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Chapter;
import FCAJ.SecureLearn.Model.Course;
import FCAJ.SecureLearn.Repositories.ChapterRepo;
import FCAJ.SecureLearn.Repositories.CourseRepo;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;

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

    public void createChapter(String title, String description, UUID courseId) {
        Course parentCourse = findCourse(courseId, "create chapter");
        parentCourse.setLastUpdateTime(LocalDateTime.now());
        Chapter newChapter = new Chapter(parentCourse, title, description);
        courseRepo.save(parentCourse);
        chapterRepo.save(newChapter);
    }

    public void deleteChapter(UUID chapterId) {
        Chapter chapterToDelete = findChapter(chapterId, "delete chapter");
        chapterRepo.delete(chapterToDelete);
    }

    public void updateChapter(UUID chapterId, String title, String description, UUID courseId) {
        Chapter chapterToUpdate = findChapter(chapterId, "update chapter");
        Course parentCourse = findCourse(courseId, "update chapter " + chapterId);
        parentCourse.setLastUpdateTime(LocalDateTime.now());
        chapterToUpdate.setTitle(title);
        chapterToUpdate.setDescription(description);
        courseRepo.save(parentCourse);
        chapterRepo.save(chapterToUpdate);
    }

    public List<Chapter> getAllChaptersInCourse(UUID courseId) {
        return chapterRepo.findByCourseId(courseId);
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
