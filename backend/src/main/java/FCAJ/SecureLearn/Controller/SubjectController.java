package FCAJ.SecureLearn.Controller;

import FCAJ.SecureLearn.Model.Subject;
import FCAJ.SecureLearn.Request.SubjectRequest;
import FCAJ.SecureLearn.Service.SubjectService;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for Subject management. Runs in the same "course" Lambda as CourseController.
 *
 * @author ngoct
 */
@RestController
@RequestMapping("/api/v1")
@Profile("course")
public class SubjectController {
    private final SubjectService subjectService;

    public SubjectController(SubjectService subjectService) {
        this.subjectService = subjectService;
    }

    /** GET /api/v1/subject -> [{ id, name }] */
    @GetMapping("/subject")
    public ResponseEntity<List<Subject>> getAllSubjects() {
        return ResponseEntity.ok(subjectService.getAllSubjects());
    }

    /** POST /api/v1/subject { name } -> created subject */
    @PostMapping("/subject")
    public ResponseEntity<?> createSubject(@RequestBody SubjectRequest request) {
        try {
            return ResponseEntity.ok(subjectService.addNewSubject(request.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** PUT /api/v1/subject/{id} { name } -> renamed subject */
    @PutMapping("/subject/{id}")
    public ResponseEntity<?> renameSubject(@PathVariable UUID id, @RequestBody SubjectRequest request) {
        try {
            return ResponseEntity.ok(subjectService.renameSubject(id, request.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    /** DELETE /api/v1/subject/{id} -> deletes the subject AND all its courses */
    @DeleteMapping("/subject/{id}")
    public ResponseEntity<?> deleteSubject(@PathVariable UUID id) {
        try {
            subjectService.deleteSubject(id);
            return ResponseEntity.ok().body(Map.of("success", "Subject deleted successfully"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }
}
