import apiClient from '../api/axiosClient';
import {
  courses as mockCourses,
  chapters as mockChapters,
  videos as mockVideos,
} from '../data/mockDatabase';

/**
 * =============================================================================
 * SERVICE: courseService
 * =============================================================================
 * Khớp chuẩn 100% với Controller Backend Spring Boot:
 * Base URL: http://localhost:8080
 * API Prefix: /api/v1
 * Credentials: withCredentials: true
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
 * 4. Authentication (Cognito Open Routes):
 *    - GET    /oauth2/authorization/cognito         -> Redirect tới Cognito Hosted UI login
 *    - GET    /login/oauth2/code/cognito            -> Callback xử lý
 *    - POST   /logout                               -> Hủy session -> Cognito logout -> localhost:3000
 * =============================================================================
 */

// Đổi cờ này sang true nếu muốn ép buộc chế độ Mock dữ liệu nội bộ
export const USE_MOCK = false;
const simulateDelay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

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
 * Đảm bảo tương thích cả các trường camelCase của BE và PascalCase của mockDatabase
 */
export function normalizeCourse(item) {
  if (!item) return null;
  const courseId = item.id || item.ID || item.partitionKey || '';
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
    accessLogID: item.accessLogID || item.AccessLogID || `al-${String(courseId).slice(-3)}`,
    AccessLogID: item.accessLogID || item.AccessLogID || `al-${String(courseId).slice(-3)}`,
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
    AccessLogID: item.AccessLogID || item.accessLogID || `al-${String(chapterId).slice(-3)}`,
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
    Size: Number(item.Size || item.size || 350000000),
    UploadTime: item.UploadTime || item.uploadTime || new Date().toISOString(),
    UploadedBy: item.UploadedBy || item.uploadedBy || 'u-002',
    AccessLogID: item.AccessLogID || item.accessLogID || 'al-001',
  };
}

// =============================================================================
// 1. COURSE MANAGEMENT
// =============================================================================

/**
 * Lấy tất cả danh sách khóa học
 * Backend: GET /api/v1/allcourses
 */
export async function getCourses() {
  if (USE_MOCK) {
    await simulateDelay();
    return mockCourses.map(normalizeCourse);
  }

  try {
    const data = await apiClient.get('/allcourses');
    if (Array.isArray(data)) {
      return data.map(normalizeCourse);
    }
    return [];
  } catch (err) {
    console.warn('[courseService] GET /allcourses fallback sang mockCourses:', err.message);
    return mockCourses.map(normalizeCourse);
  }
}

/**
 * Tìm kiếm khóa học theo tiêu đề (partial match, case-insensitive)
 * Backend: GET /api/v1/course/search?title={keyword}
 */
export async function searchCourses(keyword) {
  const term = (keyword || '').trim();
  if (!term) return getCourses();

  if (USE_MOCK) {
    await simulateDelay();
    return mockCourses
      .filter((c) => (c.Title || c.title || '').toLowerCase().includes(term.toLowerCase()))
      .map(normalizeCourse);
  }

  try {
    const data = await apiClient.get('/course/search', {
      params: { title: term },
    });
    if (Array.isArray(data)) {
      return data.map(normalizeCourse);
    }
    return [];
  } catch (err) {
    console.warn('[courseService] GET /course/search lỗi, fallback lọc local:', err.message);
    const all = await getCourses();
    return all.filter((c) =>
      (c.title || c.Title || '').toLowerCase().includes(term.toLowerCase())
    );
  }
}

/**
 * Lấy thông tin một khóa học theo ID
 */
export async function getCourseById(courseId) {
  const all = await getCourses();
  return all.find((c) => c.id === courseId || c.ID === courseId) || null;
}

/**
 * Tạo mới một khóa học
 * Backend: POST /api/v1/course
 * Request Body: { title, description, instructor, prices }
 * Response: { success: "Course added successfully" }
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

  const tempCourse = {
    id: `c-${Date.now().toString().slice(-6)}`,
    ...payload,
    price: priceNum,
    creationTime: new Date().toISOString(),
    lastUpdateTime: new Date().toISOString(),
  };

  if (USE_MOCK) {
    await simulateDelay();
    mockCourses.unshift(tempCourse);
    return normalizeCourse(tempCourse);
  }

  try {
    const res = await apiClient.post('/course', payload);
    // Cập nhật bộ nhớ mock đệm để UI hiển thị mượt mà
    mockCourses.unshift(tempCourse);
    return {
      ...normalizeCourse(tempCourse),
      backendResponse: res,
    };
  } catch (err) {
    console.error('[courseService] POST /course lỗi:', err.message);
    throw err;
  }
}

/**
 * Cập nhật một khóa học
 * Backend: PUT /api/v1/course/{id}
 * Request Body: { title, description, instructor, prices }
 * Response: { success: "Course updated successfully" }
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

  if (USE_MOCK) {
    await simulateDelay();
    const item = mockCourses.find((c) => c.id === id || c.ID === id);
    if (item) {
      item.title = courseTitle;
      item.Title = courseTitle;
      item.description = courseDesc;
      item.Description = courseDesc;
      item.instructor = courseInstructor;
      item.Instructor = courseInstructor;
      item.price = priceNum;
      item.Price = priceNum;
    }
    return { success: 'Course updated successfully' };
  }

  try {
    const res = await apiClient.put(`/course/${id}`, payload);
    const item = mockCourses.find((c) => c.id === id || c.ID === id);
    if (item) {
      item.title = courseTitle;
      item.Title = courseTitle;
      item.description = courseDesc;
      item.Description = courseDesc;
      item.instructor = courseInstructor;
      item.Instructor = courseInstructor;
      item.price = priceNum;
      item.Price = priceNum;
    }
    return res;
  } catch (err) {
    console.error('[courseService] PUT /course/{id} lỗi:', err.message);
    throw err;
  }
}

/**
 * Xóa một khóa học (Cascades tới tất cả chapters và lessons)
 * Backend: DELETE /api/v1/course/{id}
 * Response: { success: "Course deleted successfully" }
 */
export async function deleteCourse(id) {
  if (USE_MOCK) {
    await simulateDelay();
    const idx = mockCourses.findIndex((c) => c.id === id || c.ID === id);
    if (idx !== -1) mockCourses.splice(idx, 1);
    return { success: 'Course deleted successfully' };
  }

  try {
    const res = await apiClient.delete(`/course/${id}`);
    const idx = mockCourses.findIndex((c) => c.id === id || c.ID === id);
    if (idx !== -1) mockCourses.splice(idx, 1);
    return res;
  } catch (err) {
    console.error('[courseService] DELETE /course/{id} lỗi:', err.message);
    throw err;
  }
}

// =============================================================================
// 2. CHAPTER MANAGEMENT
// =============================================================================

/**
 * Lấy danh sách tất cả các chương trong một khóa học
 * Backend: GET /api/v1/course/{courseId}/chapters
 * Response: [ { id, title, description } ]
 */
export async function getChapters(courseId) {
  if (USE_MOCK) {
    await simulateDelay();
    return mockChapters
      .filter((ch) => ch.CoursesID === courseId || ch.course_id === courseId)
      .map((ch) => normalizeChapter(ch, courseId));
  }

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
    console.warn(`[courseService] GET /course/${courseId}/chapters fallback mock:`, err.message);
    return mockChapters
      .filter((ch) => ch.CoursesID === courseId || ch.course_id === courseId)
      .map((ch) => normalizeChapter(ch, courseId));
  }
}

/**
 * Tạo mới một chương trong khóa học
 * Backend: POST /api/v1/chapter
 * Request Body: { course_id, title, description }
 * Response: { success: "Chapter added successfully" }
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

  const tempChapter = {
    id: `ch-${Date.now().toString().slice(-6)}`,
    ...payload,
    ChapterNumber: Number(chapterNumber) || 1,
  };

  if (USE_MOCK) {
    await simulateDelay();
    mockChapters.push(tempChapter);
    return normalizeChapter(tempChapter, targetCourseId);
  }

  try {
    const res = await apiClient.post('/chapter', payload);
    mockChapters.push(tempChapter);
    return {
      ...normalizeChapter(tempChapter, targetCourseId),
      backendResponse: res,
    };
  } catch (err) {
    console.error('[courseService] POST /chapter lỗi:', err.message);
    throw err;
  }
}

/**
 * Cập nhật một chương
 * Backend: PUT /api/v1/chapter/{id}
 * Request Body: { course_id, title, description }
 * Response: { success: "Chapter updated successfully" }
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

  if (USE_MOCK) {
    await simulateDelay();
    const ch = mockChapters.find((item) => item.id === id || item.ID === id);
    if (ch) {
      ch.title = chapterTitle;
      ch.Title = chapterTitle;
      ch.description = chapterDesc;
      ch.Description = chapterDesc;
    }
    return { success: 'Chapter updated successfully' };
  }

  try {
    const res = await apiClient.put(`/chapter/${id}`, payload);
    const ch = mockChapters.find((item) => item.id === id || item.ID === id);
    if (ch) {
      ch.title = chapterTitle;
      ch.Title = chapterTitle;
      ch.description = chapterDesc;
      ch.Description = chapterDesc;
    }
    return res;
  } catch (err) {
    console.error('[courseService] PUT /chapter/{id} lỗi:', err.message);
    throw err;
  }
}

/**
 * Xóa một chương (Cascades tới tất cả bài học trong chương)
 * Backend: DELETE /api/v1/chapter/{id}
 * Response: { success: "Chapter deleted successfully" }
 */
export async function deleteChapter(id) {
  if (USE_MOCK) {
    await simulateDelay();
    const idx = mockChapters.findIndex((c) => c.id === id || c.ID === id);
    if (idx !== -1) mockChapters.splice(idx, 1);
    return { success: 'Chapter deleted successfully' };
  }

  try {
    const res = await apiClient.delete(`/chapter/${id}`);
    const idx = mockChapters.findIndex((c) => c.id === id || c.ID === id);
    if (idx !== -1) mockChapters.splice(idx, 1);
    return res;
  } catch (err) {
    console.error('[courseService] DELETE /chapter/{id} lỗi:', err.message);
    throw err;
  }
}

// =============================================================================
// 3. LESSON MANAGEMENT
// =============================================================================

/**
 * Lấy danh sách tất cả các bài học trong một chương
 * Backend: GET /api/v1/chapter/{chapterId}/lessons
 * Response: [ { id, title, description, url } ]
 */
export async function getLessons(chapterId) {
  if (USE_MOCK) {
    await simulateDelay();
    return mockVideos
      .filter((v) => v.chapterId === chapterId || v.chapter === chapterId)
      .map((v) => normalizeLesson(v, chapterId));
  }

  try {
    const data = await apiClient.get(`/chapter/${chapterId}/lessons`);
    if (Array.isArray(data)) {
      return data.map((l) => normalizeLesson(l, chapterId));
    }
    return [];
  } catch (err) {
    console.warn(`[courseService] GET /chapter/${chapterId}/lessons fallback mock:`, err.message);
    return mockVideos
      .filter((v) => v.chapterId === chapterId || v.chapter === chapterId)
      .map((v) => normalizeLesson(v, chapterId));
  }
}

/**
 * Lấy chi tiết một bài học theo ID
 * Backend: GET /api/v1/lesson/{id}
 * Response: { id, title, description, url }
 */
export async function getLessonById(id) {
  if (USE_MOCK) {
    await simulateDelay();
    const found = mockVideos.find((v) => v.id === id || v.ID === id);
    return found ? normalizeLesson(found) : null;
  }

  try {
    const data = await apiClient.get(`/lesson/${id}`);
    return normalizeLesson(data);
  } catch (err) {
    console.warn(`[courseService] GET /lesson/${id} fallback mock:`, err.message);
    const found = mockVideos.find((v) => v.id === id || v.ID === id);
    return found ? normalizeLesson(found) : null;
  }
}

/**
 * Tạo mới một bài học trong chương
 * Backend: POST /api/v1/lesson
 * Request Body: { course_id, chapter_id, title, description, url }
 * Response: { success: "Lesson added successfully" }
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

  const tempLesson = {
    id: `v-${Date.now().toString().slice(-6)}`,
    ...payload,
    videoURL: lessonUrl,
  };

  if (USE_MOCK) {
    await simulateDelay();
    mockVideos.push(tempLesson);
    return normalizeLesson(tempLesson, targetChapterId, targetCourseId);
  }

  try {
    const res = await apiClient.post('/lesson', payload);
    mockVideos.push(tempLesson);
    return {
      ...normalizeLesson(tempLesson, targetChapterId, targetCourseId),
      backendResponse: res,
    };
  } catch (err) {
    console.error('[courseService] POST /lesson lỗi:', err.message);
    throw err;
  }
}

/**
 * Cập nhật một bài học
 * Backend: PUT /api/v1/lesson/{id}
 * Request Body: { course_id, chapter_id, title, description, url }
 * Response: { success: "Lesson updated successfully" }
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

  if (USE_MOCK) {
    await simulateDelay();
    const vid = mockVideos.find((v) => v.id === id || v.ID === id);
    if (vid) {
      vid.title = lessonTitle;
      vid.Title = lessonTitle;
      vid.description = lessonDesc;
      vid.Description = lessonDesc;
      vid.url = lessonUrl;
      vid.videoURL = lessonUrl;
    }
    return { success: 'Lesson updated successfully' };
  }

  try {
    const res = await apiClient.put(`/lesson/${id}`, payload);
    const vid = mockVideos.find((v) => v.id === id || v.ID === id);
    if (vid) {
      vid.title = lessonTitle;
      vid.Title = lessonTitle;
      vid.description = lessonDesc;
      vid.Description = lessonDesc;
      vid.url = lessonUrl;
      vid.videoURL = lessonUrl;
    }
    return res;
  } catch (err) {
    console.error('[courseService] PUT /lesson/{id} lỗi:', err.message);
    throw err;
  }
}

/**
 * Xóa một bài học
 * Backend: DELETE /api/v1/lesson/{id}
 * Response: { success: "Lesson deleted successfully" }
 */
export async function deleteLesson(id) {
  if (USE_MOCK) {
    await simulateDelay();
    const idx = mockVideos.findIndex((v) => v.id === id || v.ID === id);
    if (idx !== -1) mockVideos.splice(idx, 1);
    return { success: 'Lesson deleted successfully' };
  }

  try {
    const res = await apiClient.delete(`/lesson/${id}`);
    const idx = mockVideos.findIndex((v) => v.id === id || v.ID === id);
    if (idx !== -1) mockVideos.splice(idx, 1);
    return res;
  } catch (err) {
    console.error('[courseService] DELETE /lesson/{id} lỗi:', err.message);
    throw err;
  }
}

// =============================================================================
// 4. COMPOSITE AGGREGATOR FUNCTIONS (Dành cho Player & Instructor Views)
// =============================================================================

/**
 * Lấy toàn bộ cây nội dung khóa học: Khóa học -> Các chương -> Các bài học
 * Tự động gọi lần lượt:
 * 1. GET /api/v1/allcourses (hoặc tìm theo ID)
 * 2. GET /api/v1/course/{courseId}/chapters
 * 3. GET /api/v1/chapter/{chapterId}/lessons cho từng chương
 */
export async function getCourseWithLessons(courseId) {
  try {
    const course = await getCourseById(courseId);
    if (!course) {
      return { course: null, chapters: [], lessons: [] };
    }

    const fetchedChapters = await getChapters(courseId);

    // Nạp song song danh sách bài học của tất cả các chương
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
          videos: mappedLessons, // alias tương thích component cũ
        };
      })
    );

    // Danh sách phẳng tất cả bài học
    const allFlattenedLessons = chaptersWithLessons.flatMap((ch) => ch.lessons);

    return {
      course,
      chapters: chaptersWithLessons,
      lessons: allFlattenedLessons,
    };
  } catch (err) {
    console.warn('[courseService] getCourseWithLessons fallback mock:', err.message);
    const course = mockCourses.find((c) => c.ID === courseId || c.id === courseId) || mockCourses[0];
    const chaps = mockChapters.filter((ch) => ch.CoursesID === course?.ID || ch.CoursesID === course?.id);
    return {
      course: normalizeCourse(course),
      chapters: chaps.map((ch) => ({
        ...normalizeChapter(ch, course?.id),
        videos: mockVideos.filter((v) => v.chapterId === ch.ID || v.AccessLogID === ch.AccessLogID),
        lessons: mockVideos.filter((v) => v.chapterId === ch.ID || v.AccessLogID === ch.AccessLogID),
      })),
      lessons: mockVideos.map(normalizeLesson),
    };
  }
}

// =============================================================================
// 5. BACKWARD-COMPATIBLE ALIASES (Đảm bảo các component cũ chạy ổn định)
// =============================================================================

export async function createVideo({
  courseId,
  chapterId,
  title,
  length,
  size,
  uploadedBy,
  accessLogId,
  videoURL,
  url,
}) {
  return createLesson({
    course_id: courseId,
    chapter_id: chapterId,
    title,
    description: `Video: ${title}`,
    url: url || videoURL,
  });
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

export async function reuploadVideo(videoId, { title, length, size, url, videoURL }) {
  if (USE_MOCK) {
    await simulateDelay();
    const vid = mockVideos.find((v) => v.ID === videoId || v.id === videoId);
    if (vid) {
      if (title) vid.Title = title;
      if (url || videoURL) vid.videoURL = url || videoURL;
      return vid;
    }
  }

  return updateLesson(videoId, {
    title: title || '',
    url: url || videoURL || '',
  });
}

// Alias cho các hàm cũ
export async function getCourseByPk(partitionKey) {
  return getCourseById(partitionKey);
}

export async function getLesson(partitionKey, sortKey) {
  return getLessonById(sortKey || partitionKey);
}
