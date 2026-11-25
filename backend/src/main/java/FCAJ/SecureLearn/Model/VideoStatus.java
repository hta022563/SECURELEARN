package FCAJ.SecureLearn.Model;

/**
 * Where a lesson's video is in the upload pipeline.
 * A lesson with no status (rows created before this column existed) counts as READY.
 */
public enum VideoStatus {
    /** Transcoding job submitted; the lesson keeps its previous video (if any) until it finishes. */
    PROCESSING,
    /** The lesson's url points at a finished, playable HLS playlist. */
    READY,
    /** The last transcoding job failed; see processingError. A replaced lesson still plays its old video. */
    FAILED
}
