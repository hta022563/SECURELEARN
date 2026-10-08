/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package FCAJ.SecureLearn.Request;

import java.util.UUID;

/**
 *
 * @author ngoct
 */
public class LessonCreationRequest {
    UUID course_id, chapter_id;
    String title, description, url;

    public LessonCreationRequest() {
    }

    public LessonCreationRequest(UUID course_id, UUID chapter_id, String title, String description, String url) {
        this.course_id = course_id;
        this.chapter_id = chapter_id;
        this.title = title;
        this.description = description;
        this.url = url;
    }

    public UUID getCourse_id() {
        return course_id;
    }

    public void setCourse_id(UUID course_id) {
        this.course_id = course_id;
    }

    public UUID getChapter_id() {
        return chapter_id;
    }

    public void setChapter_id(UUID chapter_id) {
        this.chapter_id = chapter_id;
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

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }
    
}
