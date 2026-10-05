-- ---------- Enum types ----------
CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin');
CREATE TYPE completion_status AS ENUM ('not_started', 'in_progress', 'completed');

-- ---------- Users ----------
CREATE TABLE users (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username       VARCHAR(50)  NOT NULL UNIQUE,
    password_hash  TEXT         NOT NULL,          -- store a bcrypt/argon2 hash, never plain text
    role           user_role    NOT NULL DEFAULT 'student',
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------- Courses ----------
CREATE TABLE courses (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title        VARCHAR(200)  NOT NULL,
    description  TEXT,
    price        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    owner  	 VARCHAR(200) NOT NULL
    
);

-- ---------- Chapters ----------
-- id is globally unique; chapter_number is the per-course sequence (1, 2, 3...)
CREATE TABLE chapters (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_id       BIGINT       NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    chapter_number  INT          NOT NULL CHECK (chapter_number > 0),
    title           VARCHAR(200),
    description     TEXT,
    UNIQUE (course_id, chapter_number)
);

-- ---------- Videos ----------
-- Belongs to a chapter; the course is reachable via chapters.course_id
-- (avoids storing course_id twice and risking inconsistent data)
CREATE TABLE videos (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    chapter_id       BIGINT       NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    title            VARCHAR(200) NOT NULL,
    description      TEXT,
    video_number     INT          NOT NULL DEFAULT 1,       -- order within chapter
    length_seconds   INT          CHECK (length_seconds >= 0),
    size_bytes       BIGINT       CHECK (size_bytes >= 0),
    uploaded_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- extra metadata
    storage_url      TEXT         NOT NULL,                 -- S3 / CDN path
    file_type        VARCHAR(100),                          -- e.g. video/mp4
    resolution       VARCHAR(20),                           -- e.g. 1920x1080
    thumbnail_url    TEXT,
    uploaded_by      BIGINT       REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (chapter_id, video_number)
);

-- ---------- Enrollments (users <-> courses, many-to-many) ----------
CREATE TABLE enrollments (
    user_id      BIGINT NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    course_id    BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status       completion_status NOT NULL DEFAULT 'not_started',
    enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, course_id)
);

-- ---------- Indexes for common lookups ----------
CREATE INDEX idx_chapters_course     ON chapters(course_id);
CREATE INDEX idx_videos_chapter      ON videos(chapter_id);
CREATE INDEX idx_enrollments_course  ON enrollments(course_id);

-- ---------- Derived "number of chapters" ----------
-- Computed on the fly so it can never go out of sync
CREATE VIEW courses_with_chapter_count AS
SELECT c.*,
       COUNT(ch.id) AS number_of_chapters
FROM courses c
LEFT JOIN chapters ch ON ch.course_id = c.id
GROUP BY c.id;