package FCAJ.SecureLearn.Request;

import java.util.UUID;

/**
 * Request body for POST /api/v1/upload/presign
 *
 * The frontend calls this before uploading to R2.
 * courseId is used to namespace the object key under videos/{courseId}/...
 */
public class VideoUploadRequest {

    /** Original file name from the browser, e.g. "lecture1.mp4" */
    private String fileName;

    /** MIME type, e.g. "video/mp4" */
    private String contentType;

    /** Used to namespace the object key in R2 */
    private UUID courseId;

    public VideoUploadRequest() {}

    public String getFileName()             { return fileName; }
    public void setFileName(String v)       { this.fileName = v; }

    public String getContentType()          { return contentType; }
    public void setContentType(String v)    { this.contentType = v; }

    public UUID getCourseId()               { return courseId; }
    public void setCourseId(UUID v)         { this.courseId = v; }
}
