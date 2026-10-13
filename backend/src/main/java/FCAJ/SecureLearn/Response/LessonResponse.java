package FCAJ.SecureLearn.Response;

import FCAJ.SecureLearn.Model.Lesson;
import java.util.UUID;

public record LessonResponse(
        UUID id,
        String title,
        String description,
        UUID chapterId,
        UUID courseId) {

    public static LessonResponse from(Lesson lesson) {
        return new LessonResponse(
                lesson.getId(),
                lesson.getTitle(),
                lesson.getDescription(),
                lesson.getChapter().getId(),
                lesson.getChapter().getCourse().getId());
    }
}