import apiClient from '../api/axiosClient';
import { courses, chapters, videos } from '../data/mockDatabase';

/**
 * =============================================================================
 * SERVICE: courseService
 * =============================================================================
 * Quản lý dữ liệu Khóa học, Chương và Video bài giảng (100% tuân thủ ERD)
 * =============================================================================
 */

const USE_MOCK = true;
const simulateDelay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Lấy danh sách tất cả khóa học
 */
export async function getCourses() {
  if (USE_MOCK) {
    await simulateDelay();
    return courses;
  }
  return apiClient.get('/courses');
}

/**
 * Lấy chi tiết khóa học theo ID
 */
export async function getCourseById(courseId) {
  if (USE_MOCK) {
    await simulateDelay(200);
    return courses.find((c) => c.ID === courseId) || null;
  }
  return apiClient.get(`/courses/${courseId}`);
}

/**
 * Thêm một khóa học mới vào CSDL
 */
export async function createCourse({ title, description, price, owner }) {
  if (USE_MOCK) {
    await simulateDelay(600);
    const newCourseId = `c-${Date.now().toString().slice(-4)}`;
    const accessLogId = `al-${Date.now().toString().slice(-3)}`;

    const newCourse = {
      ID: newCourseId,
      Title: title.trim(),
      Description: description.trim(),
      Price: Number(price) >= 0 ? Number(price) : 0,
      "Creation Time": new Date().toISOString(),
      Owner: owner,
      AccessLogID: accessLogId,
      AnomalyAlertID: null,
    };

    courses.unshift(newCourse);
    return newCourse;
  }
  return apiClient.post('/courses', { title, description, price, owner });
}

/**
 * Thêm một chương mới cho khóa học
 */
export async function createChapter({ courseId, chapterNumber, title, description }) {
  if (USE_MOCK) {
    await simulateDelay(500);
    const newChapter = {
      ID: `ch-${Date.now().toString().slice(-4)}`,
      ChapterNumber: Number(chapterNumber) || 1,
      Title: title.trim(),
      Description: (description || '').trim(),
      CoursesID: courseId,
      AccessLogID: `al-${Date.now().toString().slice(-3)}`,
    };

    chapters.push(newChapter);
    return newChapter;
  }
  return apiClient.post(`/courses/${courseId}/chapters`, { chapterNumber, title, description });
}

/**
 * Thêm một video bài giảng mới
 */
export async function createVideo({ title, length, size, uploadedBy, accessLogId }) {
  if (USE_MOCK) {
    await simulateDelay(500);
    const newVideo = {
      ID: `v-${Date.now().toString().slice(-4)}`,
      Title: title.trim(),
      Length: Number(length) || 1200,
      Size: Number(size) || 350000000,
      UploadTime: new Date().toISOString(),
      UploadedBy: uploadedBy,
      AccessLogID: accessLogId,
      AnomalyAlertID: null,
    };

    videos.push(newVideo);
    return newVideo;
  }
  return apiClient.post('/videos', { title, length, size, uploadedBy, accessLogId });
}

/**
 * Cập nhật tiêu đề video bài học nhỏ
 */
export async function updateVideoTitle(videoId, newTitle) {
  if (USE_MOCK) {
    await simulateDelay();
    const vid = videos.find((v) => v.ID === videoId);
    if (vid) {
      vid.Title = newTitle.trim();
      return vid;
    }
    return null;
  }
  return apiClient.put(`/videos/${videoId}`, { title: newTitle });
}

/**
 * Xóa một video bài học nhỏ
 */
export async function deleteVideo(videoId) {
  if (USE_MOCK) {
    await simulateDelay();
    const idx = videos.findIndex((v) => v.ID === videoId);
    if (idx !== -1) {
      return videos.splice(idx, 1)[0];
    }
    return null;
  }
  return apiClient.delete(`/videos/${videoId}`);
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
  return apiClient.put(`/chapters/${chapterId}`, { title: newTitle, description: newDesc });
}

/**
 * Xóa một chương
 */
export async function deleteChapter(chapterId) {
  if (USE_MOCK) {
    await simulateDelay();
    const idx = chapters.findIndex((c) => c.ID === chapterId);
    if (idx !== -1) {
      return chapters.splice(idx, 1)[0];
    }
    return null;
  }
  return apiClient.delete(`/chapters/${chapterId}`);
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
  return apiClient.put(`/videos/${videoId}/reupload`, { title, length, size });
}



