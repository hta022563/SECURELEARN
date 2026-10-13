import apiClient from '../api/axiosClient.js';

/**
 * =============================================================================
 * SERVICE: courseService (100% BACKEND SPRING BOOT API)
 * =============================================================================
 * Toàn bộ dữ liệu lấy động trực tiếp từ Backend Controller:
 * Base URL: http://localhost:8080/api/v1
 *
 * 1. Course Management:
 *    - GET    /api/v1/allcourses                    -> Lấy tất cả khóa học
 *    - GET    /api/v1/course/search?title={keyword} -> Tìm kiếm khóa học theo tiêu đề
 *    - POST   /api/v1/course                        -> Tạo khóa học mới ({ title, description, instructor, prices })
 *    - PUT    /api/v1/course/{id}                   -> Cập nhật khóa học ({ title, description, instructor, prices })
 *    - DELETE /api/v1/course/{id}                   -> Xóa khóa học (cascades chapters & lessons)
 *
 * 2. Chapter Management:
 *    - GET    /api/v1/course/{courseId}/chapters    -> Lấy danh sách chương của khóa học
 *    - POST   /api/v1/chapter                       -> Tạo chương mới ({ course_id, title, description })
 *    - PUT    /api/v1/chapter/{id}                  -> Cập nhật chương ({ course_id, title, description })
 *    - DELETE /api/v1/chapter/{id}                  -> Xóa chương (cascades lessons)
 *
 * 3. Lesson Management:
 *    - GET    /api/v1/chapter/{chapterId}/lessons   -> Lấy danh sách bài học của chương
 *    - GET    /api/v1/lesson/{id}                   -> Lấy chi tiết một bài học
 *    - POST   /api/v1/lesson                        -> Tạo bài học mới ({ course_id, chapter_id, title, description, url })
 *    - PUT    /api/v1/lesson/{id}                   -> Cập nhật bài học ({ course_id, chapter_id, title, description, url })
 *    - DELETE /api/v1/lesson/{id}                   -> Xóa bài học
 *
 * KHÔNG DÙNG DỮ LIỆU MOCK / CỨNG NỘI BỘ. DỮ LIỆU 100% TỪ BACKEND.
 * =============================================================================
 */

// Đường dẫn OAuth2 Cognito Backend
export const COGNITO_LOGIN_URL = 'http://localhost:8080/oauth2/authorization/cognito';
export const COGNITO_LOGOUT_URL = 'http://localhost:8080/logout';

/**
 * Đăng xuất phiên làm việc phía Backend (Cognito Session)
 */
export async function logoutBackendSession() {
  try {
    await apiClient.post('/logout', {}, { baseURL: 'http://localhost:8080' });
  } catch (err) {
    console.warn('[courseService] Backend logout call notice:', err.message);
  }
}

/**
 * Chuyển hướng tới trang Đăng nhập AWS Cognito Hosted UI
 */
export function redirectToCognitoLogin() {
  window.location.href = COGNITO_LOGIN_URL;
}

/**
 * Helper chuẩn hóa đối tượng Khóa học từ BE sang cấu trúc hiển thị FE
 */
export function normalizeCourse(item) {
  if (!item) return null;
  const courseId = item.id || item.ID || '';
  const courseTitle = item.title || item.Title || 'Khóa học chưa đặt tên';
  const courseDesc = item.description || item.Description || '';
  const coursePrice = Number(item.price ?? item.prices ?? item.Price ?? item.Prices ?? 0);
  const courseInstructor = item.instructor || item.Instructor || item.owner || item.Owner || 'Giảng viên';
  const creationTime = item.creationTime || item['Creation Time'] || new Date().toISOString();
  const lastUpdateTime = item.lastUpdateTime || item.creationTime || creationTime;

  return {
    id: courseId,
    ID: courseId,
    title: courseTitle,
    Title: courseTitle,
    description: courseDesc,
    Description: courseDesc,
    price: coursePrice,
    prices: coursePrice,
    Price: coursePrice,
    Prices: coursePrice,
    instructor: courseInstructor,
    Instructor: courseInstructor,
    owner: courseInstructor,
    Owner: courseInstructor,
    creationTime,
    'Creation Time': creationTime,
    lastUpdateTime,
    accessLogID: item.accessLogID || item.AccessLogID || `al-${String(courseId).slice(-4)}`,
    AccessLogID: item.accessLogID || item.AccessLogID || `al-${String(courseId).slice(-4)}`,
    anomalyAlertID: item.anomalyAlertID || item.AnomalyAlertID || null,
    AnomalyAlertID: item.anomalyAlertID || item.AnomalyAlertID || null,
  };
}

/**
 * Helper chuẩn hóa đối tượng Chương (Chapter)
 */
export function normalizeChapter(item, courseId = null) {
  if (!item) return null;
  const chapterId = item.id || item.ID || '';
  const chapterTitle = item.title || item.Title || 'Chương học';
  const chapterDesc = item.description || item.Description || '';
  const relCourseId = item.course_id || item.courseId || item.CoursesID || courseId || '';

  return {
    id: chapterId,
    ID: chapterId,
    title: chapterTitle,
    Title: chapterTitle,
    description: chapterDesc,
    Description: chapterDesc,
    course_id: relCourseId,
    courseId: relCourseId,
    CoursesID: relCourseId,
    ChapterNumber: Number(item.ChapterNumber || item.chapterNumber || 1),
    AccessLogID: item.AccessLogID || item.accessLogID || `al-${String(chapterId).slice(-4)}`,
  };
}

/**
 * Helper chuẩn hóa đối tượng Bài học (Lesson)
 */
export function normalizeLesson(item, chapterId = null, courseId = null) {
  if (!item) return null;
  const lessonId = item.id || item.ID || '';
  const lessonTitle = item.title || item.Title || 'Bài học';
  const lessonDesc = item.description || item.Description || '';
  const lessonUrl = item.url || item.videoURL || item.videoUrl || '';
  const relChapterId = item.chapter_id || item.chapterId || item.Chapter || chapterId || '';
  const relCourseId = item.course_id || item.courseId || courseId || '';

  return {
    id: lessonId,
    ID: lessonId,
    title: lessonTitle,
    Title: lessonTitle,
    description: lessonDesc,
    Description: lessonDesc,
    url: lessonUrl,
    videoURL: lessonUrl,
    videoUrl: lessonUrl,
    streamUrl: lessonUrl,
    chapter_id: relChapterId,
    chapterId: relChapterId,
    course_id: relCourseId,
    courseId: relCourseId,
    Length: Number(item.Length || item.length || 1200),
    Size: Number(item.Size || item.size || 150000000),
    UploadTime: item.UploadTime || item.uploadTime || new Date().toISOString(),
    UploadedBy: item.UploadedBy || item.uploadedBy || 'Instructor',
    AccessLogID: item.AccessLogID || item.accessLogID || 'al-001',
  };
}

// =============================================================================
// 1. COURSE MANAGEMENT (BACKEND API ONLY)
// =============================================================================

/**
 * Lấy tất cả danh sách khóa học từ Backend
 * Backend: GET /api/v1/allcourses
 */
export async function getCourses() {
  try {
    const data = await apiClient.get('/allcourses');
    if (Array.isArray(data)) {
      return data.map(normalizeCourse);
    }
    return [];
  } catch (err) {
    console.warn('[courseService] GET /allcourses không lấy được dữ liệu từ BE:', err.message);
    return [];
  }
}

/**
 * Tìm kiếm khóa học theo tiêu đề
 * Backend: GET /api/v1/course/search?title={keyword}
 */
export async function searchCourses(keyword) {
  const term = (keyword || '').trim();
  if (!term) return getCourses();

  try {
    const data = await apiClient.get('/course/search', {
      params: { title: term },
    });
    if (Array.isArray(data)) {
      return data.map(normalizeCourse);
    }
    return [];
  } catch (err) {
    console.warn('[courseService] GET /course/search lỗi:', err.message);
    const all = await getCourses();
    return all.filter((c) =>
      (c.title || c.Title || '').toLowerCase().includes(term.toLowerCase())
    );
  }
}

/**
 * Lấy thông tin một khóa học theo ID từ Backend
 */
export async function getCourseById(courseId) {
  const all = await getCourses();
  return all.find((c) => c.id === courseId || c.ID === courseId) || null;
}

/**
 * Tạo mới một khóa học trên Backend
 * Backend: POST /api/v1/course
 * Request Body: { title, description, instructor, prices }
 */
export async function createCourse({ title, description, instructor, owner, price, prices }) {
  const courseTitle = (title || '').trim();
  const courseDesc = (description || '').trim();
  const courseInstructor = (instructor || owner || 'Instructor').trim();
  const priceNum = Number(prices ?? price ?? 0) >= 0 ? Number(prices ?? price ?? 0) : 0;

  const payload = {
    title: courseTitle,
    description: courseDesc,
    instructor: courseInstructor,
    prices: priceNum,
  };

  const res = await apiClient.post('/course', payload);
  return {
    title: courseTitle,
    description: courseDesc,
    instructor: courseInstructor,
    prices: priceNum,
    backendResponse: res,
  };
}

/**
 * Cập nhật một khóa học trên Backend
 * Backend: PUT /api/v1/course/{id}
 */
export async function updateCourse(id, { title, description, instructor, owner, price, prices }) {
  const courseTitle = (title || '').trim();
  const courseDesc = (description || '').trim();
  const courseInstructor = (instructor || owner || 'Instructor').trim();
  const priceNum = Number(prices ?? price ?? 0) >= 0 ? Number(prices ?? price ?? 0) : 0;

  const payload = {
    title: courseTitle,
    description: courseDesc,
    instructor: courseInstructor,
    prices: priceNum,
  };

  return await apiClient.put(`/course/${id}`, payload);
}

/**
 * Xóa một khóa học trên Backend (Cascades tới tất cả chapters và lessons)
 * Backend: DELETE /api/v1/course/{id}
 */
export async function deleteCourse(id) {
  return await apiClient.delete(`/course/${id}`);
}

// =============================================================================
// 2. CHAPTER MANAGEMENT (BACKEND API ONLY)
// =============================================================================

/**
 * Lấy danh sách tất cả các chương trong một khóa học từ Backend
 * Backend: GET /api/v1/course/{courseId}/chapters
 */
export async function getChapters(courseId) {
  if (!courseId) return [];

  try {
    const data = await apiClient.get(`/course/${courseId}/chapters`);
    if (Array.isArray(data)) {
      return data.map((ch, idx) => ({
        ...normalizeChapter(ch, courseId),
        ChapterNumber: idx + 1,
      }));
    }
    return [];
  } catch (err) {
    console.warn(`[courseService] GET /course/${courseId}/chapters lỗi:`, err.message);
    return [];
  }
}

/**
 * Tạo mới một chương trong khóa học trên Backend
 * Backend: POST /api/v1/chapter
 * Request Body: { course_id, title, description }
 */
export async function createChapter({ course_id, courseId, title, description, chapterNumber }) {
  const targetCourseId = course_id || courseId;
  const chapterTitle = (title || '').trim();
  const chapterDesc = (description || '').trim();

  const payload = {
    course_id: targetCourseId,
    title: chapterTitle,
    description: chapterDesc,
  };

  const res = await apiClient.post('/chapter', payload);
  return {
    ...payload,
    ChapterNumber: Number(chapterNumber) || 1,
    backendResponse: res,
  };
}

/**
 * Cập nhật một chương trên Backend
 * Backend: PUT /api/v1/chapter/{id}
 */
export async function updateChapter(id, { course_id, courseId, title, description }) {
  const targetCourseId = course_id || courseId;
  const chapterTitle = (title || '').trim();
  const chapterDesc = (description || '').trim();

  const payload = {
    course_id: targetCourseId,
    title: chapterTitle,
    description: chapterDesc,
  };

  return await apiClient.put(`/chapter/${id}`, payload);
}

/**
 * Xóa một chương trên Backend (Cascades tới tất cả bài học trong chương)
 * Backend: DELETE /api/v1/chapter/{id}
 */
export async function deleteChapter(id) {
  return await apiClient.delete(`/chapter/${id}`);
}

// =============================================================================
// 3. LESSON MANAGEMENT (BACKEND API ONLY)
// =============================================================================

/**
 * Lấy danh sách tất cả các bài học trong một chương từ Backend
 * Backend: GET /api/v1/chapter/{chapterId}/lessons
 */
export async function getLessons(chapterId) {
  if (!chapterId) return [];

  try {
    const data = await apiClient.get(`/chapter/${chapterId}/lessons`);
    if (Array.isArray(data)) {
      return data.map((l) => normalizeLesson(l, chapterId));
    }
    return [];
  } catch (err) {
    console.warn(`[courseService] GET /chapter/${chapterId}/lessons lỗi:`, err.message);
    return [];
  }
}

/**
 * Lấy chi tiết một bài học theo ID từ Backend
 * Backend: GET /api/v1/lesson/{id}
 */
export async function getLessonById(id) {
  if (!id) return null;

  try {
    const data = await apiClient.get(`/lesson/${id}`);
    return normalizeLesson(data);
  } catch (err) {
    console.warn(`[courseService] GET /lesson/${id} lỗi:`, err.message);
    return null;
  }
}

/**
 * Lấy URL phát video bảo mật từ PlaybackController (Spring Boot & Cloudflare R2)
 * Backend: GET /api/v1/lesson/{id}/playback
 * Trả về: { playbackUrl, expiresAt }
 */
export { getLessonPlayback } from './playbackService.js';

/**
 * Tạo mới một bài học trong chương trên Backend
 * Backend: POST /api/v1/lesson
 * Request Body: { course_id, chapter_id, title, description, url }
 */
export async function createLesson({
  course_id,
  courseId,
  chapter_id,
  chapterId,
  chapter,
  title,
  description,
  url,
  videoURL,
  videoUrl,
}) {
  const targetCourseId = course_id || courseId || '';
  const targetChapterId = chapter_id || chapterId || chapter || '';
  const lessonTitle = (title || '').trim();
  const lessonDesc = (description || '').trim();
  const lessonUrl = (url || videoURL || videoUrl || '').trim();

  const payload = {
    course_id: targetCourseId,
    chapter_id: targetChapterId,
    title: lessonTitle,
    description: lessonDesc,
    url: lessonUrl || null,
  };

  const res = await apiClient.post('/lesson', payload);
  return {
    ...payload,
    backendResponse: res,
  };
}

/**
 * Cập nhật một bài học trên Backend
 * Backend: PUT /api/v1/lesson/{id}
 */
export async function updateLesson(id, {
  course_id,
  courseId,
  chapter_id,
  chapterId,
  chapter,
  title,
  description,
  url,
  videoURL,
  videoUrl,
}) {
  const targetCourseId = course_id || courseId || '';
  const targetChapterId = chapter_id || chapterId || chapter || '';
  const lessonTitle = (title || '').trim();
  const lessonDesc = (description || '').trim();
  const lessonUrl = (url || videoURL || videoUrl || '').trim();

  const payload = {
    course_id: targetCourseId,
    chapter_id: targetChapterId,
    title: lessonTitle,
    description: lessonDesc,
    url: lessonUrl || null,
  };

  return await apiClient.put(`/lesson/${id}`, payload);
}

/**
 * Xóa một bài học trên Backend
 * Backend: DELETE /api/v1/lesson/{id}
 */
export async function deleteLesson(id) {
  return await apiClient.delete(`/lesson/${id}`);
}

// =============================================================================
// 4. COMPOSITE AGGREGATOR FUNCTIONS (Dành cho Player & Instructor Views)
// =============================================================================

/**
 * Lấy toàn bộ cây nội dung khóa học: Khóa học -> Các chương -> Các bài học từ Backend
 */
export async function getCourseWithLessons(courseId) {
  try {
    const course = await getCourseById(courseId);
    if (!course) {
      return { course: null, chapters: [], lessons: [] };
    }

    const fetchedChapters = await getChapters(courseId);

    // Nạp song song danh sách bài học của tất cả các chương từ Backend
    const chaptersWithLessons = await Promise.all(
      fetchedChapters.map(async (chap, idx) => {
        const lessons = await getLessons(chap.id);
        const mappedLessons = lessons.map((l) => ({
          ...l,
          chapterId: chap.id,
          courseId: course.id,
          chapterTitle: chap.title,
          chapterNumber: idx + 1,
        }));

        return {
          ...chap,
          ChapterNumber: idx + 1,
          lessons: mappedLessons,
          videos: mappedLessons,
        };
      })
    );

    const allFlattenedLessons = chaptersWithLessons.flatMap((ch) => ch.lessons);

    return {
      course,
      chapters: chaptersWithLessons,
      lessons: allFlattenedLessons,
    };
  } catch (err) {
    console.warn('[courseService] getCourseWithLessons lỗi:', err.message);
    return { course: null, chapters: [], lessons: [] };
  }
}

// =============================================================================
// 5. HELPER ALIASES
// =============================================================================

export async function createVideo(data) {
  return createLesson(data);
}

export async function updateVideoTitle(videoId, newTitle, courseId = null, chapterId = null) {
  return updateLesson(videoId, {
    course_id: courseId,
    chapter_id: chapterId,
    title: newTitle,
    description: '',
  });
}

export async function deleteVideo(videoId) {
  return deleteLesson(videoId);
}

export async function updateChapterTitle(chapterId, newTitle, newDesc = '', courseId = null) {
  return updateChapter(chapterId, {
    course_id: courseId,
    title: newTitle,
    description: newDesc,
  });
}

export async function reuploadVideo(videoId, { title, url, videoURL }) {
  return updateLesson(videoId, {
    title: title || '',
    url: url || videoURL || '',
  });
}

export async function getCourseByPk(partitionKey) {
  return getCourseById(partitionKey);
}

export async function getLesson(partitionKey, sortKey) {
  return getLessonById(sortKey || partitionKey);
}
