package FCAJ.SecureLearn.Model;

/**
 * Lifecycle of an AnomalyAlert. The AI Lambda only ever writes OPEN;
 * the other values are for an admin to set later.
 *
 * @author ngoct
 */
public enum AlertStatus {
    OPEN,
    RESOLVED,
    DISMISSED,
    LOCKED
}
