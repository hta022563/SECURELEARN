package FCAJ.SecureLearn.Request;

import java.util.UUID;

/**
 *
 * @author ngoct
 */
public class ChapterCreationRequest {
    UUID course_id;
    String title, description;

    public ChapterCreationRequest() {
    }

    public ChapterCreationRequest(UUID course_id, String title, String description) {
        this.course_id = course_id;
        this.title = title;
        this.description = description;
    }

    public UUID getCourse_id() {
        return course_id;
    }

    public void setCourse_id(UUID course_id) {
        this.course_id = course_id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

}
