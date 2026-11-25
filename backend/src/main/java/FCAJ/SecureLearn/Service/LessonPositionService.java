package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Lesson;
import FCAJ.SecureLearn.Repositories.LessonRepo;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Keeps each chapter's lessons numbered 1..n with no gaps:
 *  - a new lesson goes last: (lessons already in the chapter) + 1
 *  - after a delete the rest are renumbered, so that count stays right
 *  - lists are sorted by position, never by the order Postgres happens to return rows in
 *    (an UPDATE, such as a video re-upload, moves a row to the end of that order)
 */
@Service
public class LessonPositionService {
    /** By position; rows not numbered yet (null) go last. */
    public static final Comparator<Lesson> BY_POSITION =
            Comparator.comparing(Lesson::getPosition, Comparator.nullsLast(Comparator.naturalOrder()));

    private final LessonRepo lessonRepo;

    public LessonPositionService(LessonRepo lessonRepo) {
        this.lessonRepo = lessonRepo;
    }

    /** Position for a lesson about to be added to the chapter. */
    public int nextPosition(UUID chapterId) {
        return (int) lessonRepo.countByChapterId(chapterId) + 1;
    }

    /** The chapter's lessons in position order. */
    public List<Lesson> sortedLessons(UUID chapterId) {
        List<Lesson> lessons = new ArrayList<>(lessonRepo.findByChapterId(chapterId));
        lessons.sort(BY_POSITION);
        return lessons;
    }

    /** Numbers the chapter's lessons 1..n in their current order, saving only the ones that changed. */
    @Transactional
    public void renumber(UUID chapterId) {
        List<Lesson> lessons = sortedLessons(chapterId);
        List<Lesson> changed = new ArrayList<>();
        for (int i = 0; i < lessons.size(); i++) {
            Lesson lesson = lessons.get(i);
            Integer wanted = i + 1;
            if (!wanted.equals(lesson.getPosition())) {
                lesson.setPosition(wanted);
                changed.add(lesson);
            }
        }
        lessonRepo.saveAll(changed);
    }
}
