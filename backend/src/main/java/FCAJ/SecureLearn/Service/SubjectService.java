package FCAJ.SecureLearn.Service;

import FCAJ.SecureLearn.Model.Subject;
import FCAJ.SecureLearn.Repositories.SubjectRepo;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Service for creating, reading, renaming and deleting subjects.
 *
 * @author ngoct
 */
@Service
public class SubjectService {
    private final SubjectRepo subjectRepo;

    public SubjectService(SubjectRepo subjectRepo) {
        this.subjectRepo = subjectRepo;
    }

    public Subject addNewSubject(String name) {
        String cleanName = requireName(name);
        if (subjectRepo.existsByNameIgnoreCase(cleanName)) {
            throw new IllegalArgumentException("Subject \"" + cleanName + "\" already exists");
        }
        return subjectRepo.save(new Subject(cleanName));
    }

    public List<Subject> getAllSubjects() {
        return subjectRepo.findAll();
    }

    public Subject renameSubject(UUID subjectId, String name) {
        Subject subject = findSubject(subjectId, "rename subject");
        String cleanName = requireName(name);
        if (!subject.getName().equalsIgnoreCase(cleanName) && subjectRepo.existsByNameIgnoreCase(cleanName)) {
            throw new IllegalArgumentException("Subject \"" + cleanName + "\" already exists");
        }
        subject.setName(cleanName);
        return subjectRepo.save(subject);
    }

    /** Deletes the subject and, through the cascade, every course in it. */
    public void deleteSubject(UUID subjectId) {
        subjectRepo.delete(findSubject(subjectId, "delete subject"));
    }

    public Subject findSubject(UUID subjectId, String action) {
        if (subjectId == null) {
            throw new IllegalArgumentException("Cannot " + action + ": subjectId is required");
        }
        return subjectRepo.findById(subjectId)
                .orElseThrow(() -> new NoSuchElementException(
                        "Cannot " + action + ": no subject found with id " + subjectId));
    }

    private String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Subject name must not be empty");
        }
        return name.trim();
    }
}
