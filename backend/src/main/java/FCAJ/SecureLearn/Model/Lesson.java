package FCAJ.SecureLearn.Model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import static jakarta.persistence.FetchType.LAZY;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import java.util.UUID;

/**
 *
 * @author ngoct
 */
@Entity
public class Lesson {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = LAZY)
    @JoinColumn(name = "chapter_id")
    private Chapter chapter;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(nullable = true)
    private String url;

    /**
     * 1-based order inside its chapter, set by LessonPositionService. Nullable for rows created
     * before this column existed; those sort last.
     */
    @Column(name = "position")
    private Integer position;

    // ── Upload pipeline state (see VideoStatus). All nullable so existing rows stay valid. ──

    /** null = created before this column existed = READY. */
    @Enumerated(EnumType.STRING)
    @Column(name = "video_status", length = 20)
    private VideoStatus videoStatus;

    /** MediaConvert job that is producing pendingUrl. */
    @Column(name = "processing_job_id", length = 100)
    private String processingJobId;

    /** Playlist key the running job writes; copied into url once the job is COMPLETE. */
    @Column(name = "pending_url")
    private String pendingUrl;

    /** Raw upload under videos/ that the running job reads; deleted once the job is COMPLETE. */
    @Column(name = "source_key")
    private String sourceKey;

    @Column(name = "processing_error", length = 500)
    private String processingError;

    public Lesson() {
    }

    /** READY for rows that predate the status column. */
    public VideoStatus getVideoStatus() {
        return videoStatus == null ? VideoStatus.READY : videoStatus;
    }

    public void setVideoStatus(VideoStatus videoStatus) {
        this.videoStatus = videoStatus;
    }

    public String getProcessingJobId() {
        return processingJobId;
    }

    public void setProcessingJobId(String processingJobId) {
        this.processingJobId = processingJobId;
    }

    public String getPendingUrl() {
        return pendingUrl;
    }

    public void setPendingUrl(String pendingUrl) {
        this.pendingUrl = pendingUrl;
    }

    public String getSourceKey() {
        return sourceKey;
    }

    public void setSourceKey(String sourceKey) {
        this.sourceKey = sourceKey;
    }

    public String getProcessingError() {
        return processingError;
    }

    public void setProcessingError(String processingError) {
        this.processingError = processingError;
    }



    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public Integer getPosition() {
        return position;
    }

    public void setPosition(Integer position) {
        this.position = position;
    }

    public Chapter getChapter() {
        return chapter;
    }

    public void setChapter(Chapter chapter) {
        this.chapter = chapter;
    }

    public Lesson(Chapter chapter, String title, String description, String url) {
        this.chapter = chapter;
        this.title = title;
        this.description = description;
        this.url = url;
    }


}
