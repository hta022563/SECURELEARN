package FCAJ.SecureLearn.Response;

import java.util.UUID;

public record ChapterResponse(UUID id, String title, String description, UUID courseId) {
}
