import apiClient from '../api/axiosClient';
import { courses, chapters, videos } from '../data/mockDatabase';

/**
 * =============================================================================
 * SERVICE: courseService
 * =============================================================================
 * Kết nối API Backend Spring Boot (DynamoDB) cho Khóa học và Bài học:
 * - POST /course: Tạo mới khóa học
 * - POST /lesson: Tạo mới bài học thuộc khóa học
 * - GET /allcourses: Lấy danh sách toàn bộ khóa học
 * - POST /updateCourse: Cập nhật thông tin khóa học
 * - POST /updatelesson: Cập nhật thông tin bài học
 * - DELETE /course: Xóa khóa học
 * - DELETE /lesson: Xóa bài học
 * =============================================================================
 */

// Đổi cờ này sang true nếu muốn quay lại chế độ Mock dữ liệu nội bộ
export const USE_MOCK = false;
const simulateDelay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper chuẩn hóa đối tượng Khóa học từ BE sang format UI FE
 */
function normalizeCourse(item) {
  const courseId = item.id || item.ID || '';
  const courseTitle = item.title || item.Title || 'Khóa học chưa đặt tên';
  const courseDesc = item.description || item.Description || '';
  const coursePrice = Number(item.price ?? item.prices ?? 0);
  const courseOwner = item.instructor || item.Owner || 'Giảng viên';

  return {
    ID: courseId,
    id: courseId,
    Title: courseTitle,
    title: courseTitle,
    Description: courseDesc,
    description: courseDesc,
    Price: coursePrice,
    price: coursePrice,
    prices: coursePrice,
    Owner: courseOwner,
    instructor: courseOwner,
    "Creation Time": item.creationTime || new Date().toISOString(),
    AccessLogID: item.AccessLogID || `al-${courseId.slice(-3)}`,
    AnomalyAlertID: null,
  };
}

/**
 * Lấy danh sách tất cả khóa học
 * Backend: GET /allcourses
 */
export async function getCourses() {
  if (USE_MOCK) {
    await simulateDelay();
    return courses;
  }

  const data = await apiClient.get('/allcourses');
  if (Array.isArray(data)) {
    return data
      .filter((item) => !item.Chapter || item.Chapter === 'Meta' || item.chapter === 'Meta')
      .map(normalizeCourse);
  }
  return [];
}

/**
 * Lấy chi tiết khóa học theo ID
 */
export async function getCourseById(courseId) {
  if (USE_MOCK) {
    await simulateDelay(200);
    return courses.find((c) => (c.ID === courseId || c.id === courseId)) || null;
  }

  const all = await getCourses();
  return all.find((c) => c.ID === courseId || c.id === courseId) || null;
}

/**
 * Thêm một khóa học mới vào CSDL
 * Backend: POST /course
 * Payload: { id, title, description, instructor, prices }
 */
export async function createCourse({ id, title, description, price, prices, owner, instructor }) {
  const generatedId = id || `c-${Date.now().toString().slice(-4)}`;
  const instructorName = instructor || owner || 'Instructor';
  const priceNum = Number(prices ?? price) >= 0 ? Number(prices ?? price) : 0;

  const newCourse = {
    ID: generatedId,
    id: generatedId,
    Title: (title || '').trim(),
    title: (title || '').trim(),
    Description: (description || '').trim(),
    description: (description || '').trim(),
    Price: priceNum,
    price: priceNum,
    prices: priceNum,
    "Creation Time": new Date().toISOString(),
    Owner: instructorName,
    instructor: instructorName,
    AccessLogID: `al-${Date.now().toString().slice(-3)}`,
    AnomalyAlertID: null,
  };

  if (USE_MOCK) {
    await simulateDelay(600);
    courses.unshift(newCourse);
    return newCourse;
  }

  try {
    // Gửi payload tương thích 100% với CourseCreationRequest ở BE
    await apiClient.post('/course', {
      id: generatedId,
      title: (title || '').trim(),
      description: (description || '').trim(),
      instructor: instructorName,
      prices: priceNum,
    });
  } catch (error) {
    console.error('[courseService] Lỗi gọi API POST /course:', error);
    throw error;
  }

  // Đồng bộ vào cache/danh sách cục bộ để FE cập nhật UI ngay lập tức
  if (!courses.some((c) => (c.ID || c.id) === generatedId)) {
    courses.unshift(newCourse);
  }

  return newCourse;
}

/**
 * Thêm một bài học mới vào khóa học
 * Backend: POST /lesson
 * Payload: { id, chapter, title, description, videoURL }
 */
export async function createLesson({ courseId, chapter, title, description, videoURL }) {
  const payload = {
    id: courseId,
    chapter: chapter || `ch-${Date.now().toString().slice(-4)}`,
    title: (title || '').trim(),
    description: (description || '').trim(),
    videoURL: videoURL || '',
  };

  if (USE_MOCK) {
    await simulateDelay(500);
    return { success: 'Lesson added successfully (Mock)', data: payload };
  }

  try {
    const res = await apiClient.post('/lesson', payload);
    return res;
  } catch (error) {
    console.error('[courseService] Lỗi gọi API POST /lesson:', error);
    throw error;
  }
}

/**
 * Thêm một chương mới cho khóa học (Tạo đồng thời bài học/chương trên BE)
 */
export async function createChapter({ courseId, chapterNumber, title, description }) {
  const chapterId = `ch-${Date.now().toString().slice(-4)}`;
  const newChapter = {
    ID: chapterId,
    ChapterNumber: Number(chapterNumber) || 1,
    Title: (title || '').trim(),
    Description: (description || '').trim(),
    CoursesID: courseId,
    AccessLogID: `al-${Date.now().toString().slice(-3)}`,
  };

  if (USE_MOCK) {
    await simulateDelay(500);
    chapters.push(newChapter);
    return newChapter;
  }

  try {
    // Gọi API BE lưu chương dưới dạng một bản ghi Lesson trong DynamoDB
    await createLesson({
      courseId,
      chapter: chapterId,
      title: (title || '').trim(),
      description: (description || '').trim(),
      videoURL: '',
    });
  } catch (error) {
    console.warn('[courseService] Lỗi khi tạo chapter trên BE:', error.message);
  }

  chapters.push(newChapter);
  return newChapter;
}

/**
 * Thêm một video bài giảng mới
 */
export async function createVideo({ courseId, chapterId, title, length, size, uploadedBy, accessLogId, videoURL }) {
  const videoId = `v-${Date.now().toString().slice(-4)}`;
  const newVideo = {
    ID: videoId,
    Title: (title || '').trim(),
    Length: Number(length) || 1200,
    Size: Number(size) || 350000000,
    UploadTime: new Date().toISOString(),
    UploadedBy: uploadedBy || 'u-002',
    AccessLogID: accessLogId || 'al-001',
    AnomalyAlertID: null,
  };

  if (USE_MOCK) {
    await simulateDelay(500);
    videos.push(newVideo);
    return newVideo;
  }

  if (courseId) {
    try {
      await createLesson({
        courseId,
        chapter: chapterId || videoId,
        title: (title || '').trim(),
        description: `Video bài giảng: ${(title || '').trim()}`,
        videoURL: videoURL || `https://stream.securelearn.internal/${videoId}`,
      });
    } catch (e) {
      console.warn('[courseService] Lỗi khi tạo video lesson trên BE:', e.message);
    }
  }

  videos.push(newVideo);
  return newVideo;
}

/**
 * Cập nhật tiêu đề video bài học nhỏ
 * Backend: POST /updatelesson
 */
export async function updateVideoTitle(videoId, newTitle, courseId = null, chapter = null) {
  if (USE_MOCK) {
    await simulateDelay();
    const vid = videos.find((v) => v.ID === videoId);
    if (vid) {
      vid.Title = newTitle.trim();
      return vid;
    }
    return null;
  }

  if (courseId && chapter) {
    try {
      await apiClient.post('/updatelesson', {
        id: courseId,
        chapter: chapter,
        title: newTitle.trim(),
        description: '',
        videoURL: '',
      });
    } catch (e) {
      console.warn('[courseService] Lỗi update lesson trên BE:', e.message);
    }
  }

  const vid = videos.find((v) => v.ID === videoId);
  if (vid) vid.Title = newTitle.trim();
  return vid;
}

/**
 * Xóa một video bài học nhỏ
 * Backend: DELETE /lesson
 */
export async function deleteVideo(videoId, courseId = null, chapter = null) {
  if (USE_MOCK) {
    await simulateDelay();
    const idx = videos.findIndex((v) => v.ID === videoId);
    if (idx !== -1) {
      return videos.splice(idx, 1)[0];
    }
    return null;
  }

  if (courseId && chapter) {
    try {
      await apiClient.delete('/lesson', {
        data: { partitionKey: courseId, sortKey: chapter },
      });
    } catch (e) {
      console.warn('[courseService] Lỗi xóa lesson trên BE:', e.message);
    }
  }

  const idx = videos.findIndex((v) => v.ID === videoId);
  if (idx !== -1) {
    return videos.splice(idx, 1)[0];
  }
  return null;
}

/**
 * Cập nhật tiêu đề hoặc thông tin chương
 */
export async function updateChapterTitle(chapterId, newTitle, newDesc) {
  if (USE_MOCK) {
    await simulateDelay();
    const chap = chapters.find((c) => c.ID === chapterId);
    if (chap) {
      if (newTitle) chap.Title = newTitle.trim();
      if (newDesc !== undefined) chap.Description = newDesc.trim();
      return chap;
    }
    return null;
  }

  const chap = chapters.find((c) => c.ID === chapterId);
  if (chap) {
    if (newTitle) chap.Title = newTitle.trim();
    if (newDesc !== undefined) chap.Description = newDesc.trim();
  }
  return chap;
}

/**
 * Xóa một chương
 */
export async function deleteChapter(chapterId, courseId = null) {
  if (USE_MOCK) {
    await simulateDelay();
    const idx = chapters.findIndex((c) => c.ID === chapterId);
    if (idx !== -1) {
      return chapters.splice(idx, 1)[0];
    }
    return null;
  }

  if (courseId) {
    try {
      await apiClient.delete('/lesson', {
        data: { partitionKey: courseId, sortKey: chapterId },
      });
    } catch (e) {
      console.warn('[courseService] Lỗi xóa chapter trên BE:', e.message);
    }
  }

  const idx = chapters.findIndex((c) => c.ID === chapterId);
  if (idx !== -1) {
    return chapters.splice(idx, 1)[0];
  }
  return null;
}

/**
 * Thay thế / Up lại video khác
 */
export async function reuploadVideo(videoId, { title, length, size }) {
  if (USE_MOCK) {
    await simulateDelay();
    const vid = videos.find((v) => v.ID === videoId);
    if (vid) {
      if (title && title.trim()) vid.Title = title.trim();
      if (length) vid.Length = Number(length);
      if (size) vid.Size = Number(size);
      vid.UploadTime = new Date().toISOString();
      return vid;
    }
    return null;
  }

  const vid = videos.find((v) => v.ID === videoId);
  if (vid) {
    if (title && title.trim()) vid.Title = title.trim();
    if (length) vid.Length = Number(length);
    if (size) vid.Size = Number(size);
    vid.UploadTime = new Date().toISOString();
    return vid;
  }
  return null;
}
