package FCAJ.SecureLearn.Response;

import FCAJ.SecureLearn.Model.Lesson;
import java.util.UUID;

public record LessonResponse(
        UUID id,
        String title,
        String description,
        UUID chapterId,
        UUID courseId,
        // PROCESSING / READY / FAILED, so the UI can show a lesson whose video is not playable yet
        String videoStatus,
        // 1-based order inside the chapter; null until the backfill script has run
        Integer position) {

    public static LessonResponse from(Lesson lesson) {
        return new LessonResponse(
                lesson.getId(),
                lesson.getTitle(),
                lesson.getDescription(),
                lesson.getChapter().getId(),
                lesson.getChapter().getCourse().getId(),
                lesson.getVideoStatus().name(),
                lesson.getPosition());
    }
}