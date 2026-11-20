package FCAJ.SecureLearn.Request;

/**
 *
 * @author ngoct
 */
public class SubjectRequest {
    String name;

    public SubjectRequest() {
    }

    public SubjectRequest(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
