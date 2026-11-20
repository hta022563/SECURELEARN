package FCAJ.SecureLearn.Model;


import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;


/**
 *
 * @author ngoct
 */
@Entity
public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(nullable = false)
    private long price;

    @Column(nullable = false, length = 200)
    private String instructor;

    @Column(nullable = false)
    private LocalDateTime creationTime;

    @Column(nullable = false)
    private LocalDateTime lastUpdateTime;

    // Owning side: this column is the foreign key. A course must have a subject.
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @OneToMany(mappedBy="course", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Chapter> chapter = new ArrayList();

    @OneToMany(mappedBy="course", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Enrollment> enrollment = new ArrayList();

    public Course() {
    }

    public Course(String title, String description, long price, String instructor, LocalDateTime creationTime, LocalDateTime lastUpdateTime) {
        this.title = title;
        this.description = description;
        this.price = price;
        this.instructor = instructor;
        this.creationTime = creationTime;
        this.lastUpdateTime = lastUpdateTime;
    }

    public Subject getSubject() {
        return subject;
    }

    public void setSubject(Subject subject) {
        this.subject = subject;
    }

    // Sent to the frontend instead of the whole Subject (which is @JsonIgnore'd).
    // Reading the id of a lazy proxy does not trigger a database load.
    public UUID getSubjectId() {
        return subject == null ? null : subject.getId();
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

    public long getPrice() {
        return price;
    }

    public void setPrice(long price) {
        this.price = price;
    }

    public String getInstructor() {
        return instructor;
    }

    public void setInstructor(String instructor) {
        this.instructor = instructor;
    }

    public LocalDateTime getCreationTime() {
        return creationTime;
    }

    public void setCreationTime(LocalDateTime creationTime) {
        this.creationTime = creationTime;
    }

    public LocalDateTime getLastUpdateTime() {
        return lastUpdateTime;
    }

    public void setLastUpdateTime(LocalDateTime lastUpdateTime) {
        this.lastUpdateTime = lastUpdateTime;
    }



}
