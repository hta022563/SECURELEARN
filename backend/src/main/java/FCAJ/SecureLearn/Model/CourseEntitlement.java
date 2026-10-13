package FCAJ.SecureLearn.Model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "course_entitlements", uniqueConstraints = {
        @UniqueConstraint(name = "uk_entitlement_user_course", columnNames = {"user_sub", "course_id"})
})
public class CourseEntitlement {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_sub", nullable = false, length = 255)
    private String userSub;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "granted_at", nullable = false)
    private LocalDateTime grantedAt;

    protected CourseEntitlement() {
    }

    public CourseEntitlement(String userSub, UUID courseId) {
        this.userSub = userSub;
        this.courseId = courseId;
        this.active = true;
        this.grantedAt = LocalDateTime.now();
    }

    public void grant() {
        active = true;
        grantedAt = LocalDateTime.now();
    }

    public void revoke() {
        active = false;
    }

    public boolean isActive() {
        return active;
    }
}