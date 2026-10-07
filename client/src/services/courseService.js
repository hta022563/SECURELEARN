import apiClient from '../api/axiosClient';
import { courses, chapters, videos } from '../data/mockDatabase';

/**
 * =============================================================================
 * SERVICE: courseService
 * =============================================================================
 * Tương thích 100% với Controller Backend Spring Boot (CourseController.java):
 * Base Path: /api/v1
 *
 * Các API Endpoints:
 * 1. POST   /course        -> Tạo mới khóa học (CourseCreationRequest)
 * 2. POST   /lesson        -> Tạo mới bài học (LessonCreationRequest)
 * 3. GET    /allcourses    -> Lấy toàn bộ danh sách khóa học (List<Courses>)
 * 4. GET    /course        -> Lấy khóa học theo PartitionKey (PartitionKeyRequest)
 * 5. GET    /lesson        -> Lấy bài học theo PartitionKey & SortKey (KeySchemaRequest)
 * 6. POST   /updateCourse  -> Cập nhật khóa học (CourseCreationRequest)
 * 7. POST   /updatelesson  -> Cập nhật bài học (LessonCreationRequest)
 * 8. DELETE /course        -> Xóa khóa học theo PartitionKey (PartitionKeyRequest)
 * 9. DELETE /lesson        -> Xóa bài học theo PartitionKey & SortKey (KeySchemaRequest)
 * =============================================================================
 */

// Đổi cờ này sang true nếu muốn ép buộc chế độ Mock dữ liệu nội bộ
export const USE_MOCK = false;
const simulateDelay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Helper chuẩn hóa đối tượng Khóa học từ BE (DynamoDB) sang cấu trúc hiển thị FE
 */
export function normalizeCourse(item) {
  if (!item) return null;
  const courseId = item.id || item.ID || item.partitionKey || '';
  const courseTitle = item.title || item.Title || 'Khóa học chưa đặt tên';
  const courseDesc = item.description || item.Description || '';
  const coursePrice = Number(item.prices ?? item.price ?? item.Price ?? item.Prices ?? 0);
  const courseOwner = item.instructor || item.Instructor || item.owner || item.Owner || 'Giảng viên';

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
    owner: courseOwner,
    instructor: courseOwner,
    "Creation Time": item.creationTime || item["Creation Time"] || new Date().toISOString(),
    AccessLogID: item.accessLogID || item.AccessLogID || `al-${String(courseId).slice(-3)}`,
    AnomalyAlertID: item.anomalyAlertID || item.AnomalyAlertID || null,
  };
}

/**
 * 1. Lấy danh sách tất cả khóa học
 * Backend: GET /api/v1/allcourses
 */
export async function getCourses() {
  if (USE_MOCK) {
    await simulateDelay();
    return courses;
  }

  try {
    const data = await apiClient.get('/allcourses');
    if (Array.isArray(data)) {
      return data
        .filter((item) => !item.Chapter || item.Chapter === 'Meta' || item.chapter === 'Meta' || !item.sortKey || item.sortKey === 'Meta')
        .map(normalizeCourse);
    }
    return [];
  } catch (err) {
    console.warn('[courseService] Lỗi gọi GET /allcourses, fallback sang mockDatabase:', err.message);
    return courses;
  }
}

/**
 * 2. Lấy danh sách items theo Partition Key (Khóa học và các bản ghi liên quan)
 * Backend: GET /api/v1/course
 * Payload: { partitionKey }
 */
export async function getCourseByPk(partitionKey) {
  if (USE_MOCK) {
    await simulateDelay(200);
    return courses.filter((c) => (c.ID === partitionKey || c.id === partitionKey));
  }

  try {
    const res = await apiClient.request({
      method: 'GET',
      url: '/course',
      data: { partitionKey },
    });
    return Array.isArray(res) ? res : [res];
  } catch (err) {
    console.warn('[courseService] Lỗi gọi GET /course:', err.message);
    throw err;
  }
}

/**
 * Lấy chi tiết khóa học theo ID
 */
export async function getCourseById(courseId) {
  if (USE_MOCK) {
    await simulateDelay(200);
    return courses.find((c) => (c.ID === courseId || c.id === courseId)) || null;
  }

  try {
    const items = await getCourseByPk(courseId);
    if (Array.isArray(items) && items.length > 0) {
      const meta = items.find((item) => !item.chapter && !item.Chapter || item.chapter === 'Meta' || item.Chapter === 'Meta') || items[0];
      return normalizeCourse(meta);
    }
  } catch (err) {
    console.warn('[courseService] getCourseById fallback sang getCourses():', err.message);
  }

  const all = await getCourses();
  return all.find((c) => c.ID === courseId || c.id === courseId) || null;
}

/**
 * Lấy khóa học cùng danh sách bài giảng (Lessons) từ Backend API
 * Backend: GET /api/v1/course { partitionKey: courseId }
 */
export async function getCourseWithLessons(courseId) {
  if (USE_MOCK) {
    const course = courses.find((c) => c.ID === courseId || c.id === courseId) || courses[0];
    const chaps = chapters.filter((ch) => ch.CoursesID === course?.ID);
    return {
      course,
      chapters: chaps,
      lessons: videos,
    };
  }

  try {
    const items = await getCourseByPk(courseId);
    if (Array.isArray(items) && items.length > 0) {
      const meta = items.find((item) => !item.chapter && !item.Chapter || item.chapter === 'Meta' || item.Chapter === 'Meta') || items[0];
      const normalizedCourse = normalizeCourse(meta);

      const rawLessons = items.filter((item) => item.Chapter && item.Chapter !== 'Meta' && item.chapter !== 'Meta');
      
      const normalizedLessons = rawLessons.map((l, idx) => ({
        ID: l.Chapter || l.chapter || `lesson-${idx}`,
        id: l.Chapter || l.chapter || `lesson-${idx}`,
        Title: l.title || 'Bài học',
        title: l.title || 'Bài học',
        Description: l.description || '',
        description: l.description || '',
        videoURL: l.videoURL || l.videoUrl || '',
        videoUrl: l.videoURL || l.videoUrl || '',
        streamUrl: l.videoURL || l.videoUrl || '',
        Length: 1200,
        Size: 350000000,
        UploadTime: l.creationTime || new Date().toISOString(),
        chapterId: l.Chapter || l.chapter,
        courseId: l.id || courseId,
      }));

      return {
        course: normalizedCourse,
        lessons: normalizedLessons,
      };
    }
  } catch (err) {
    console.warn('[courseService] getCourseWithLessons lỗi:', err.message);
  }

  const course = await getCourseById(courseId);
  return {
    course,
    lessons: [],
  };
}

/**
 * 3. Lấy thông tin bài học cụ thể
 * Backend: GET /api/v1/lesson
 * Payload: { partitionKey, sortKey }
 */
export async function getLesson(partitionKey, sortKey) {
  if (USE_MOCK) {
    await simulateDelay(200);
    return videos.find((v) => v.ID === sortKey || v.id === sortKey) || null;
  }

  try {
    const res = await apiClient.request({
      method: 'GET',
      url: '/lesson',
      data: { partitionKey, sortKey },
    });
    return res;
  } catch (err) {
    console.warn('[courseService] Lỗi gọi GET /lesson:', err.message);
    throw err;
  }
}

/**
 * 4. Thêm một khóa học mới vào CSDL
 * Backend: POST /api/v1/course
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
    await simulateDelay(500);
    courses.unshift(newCourse);
    return newCourse;
  }

  try {
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

  // Cập nhật bộ nhớ đệm UI để phản hồi tức thì
  if (!courses.some((c) => (c.ID || c.id) === generatedId)) {
    courses.unshift(newCourse);
  }

  return newCourse;
}

/**
 * 5. Cập nhật thông tin khóa học
 * Backend: POST /api/v1/updateCourse
 * Payload: { id, title, description, instructor, prices }
 */
export async function updateCourse({ id, title, description, prices, price, instructor, owner }) {
  const priceNum = Number(prices ?? price) >= 0 ? Number(prices ?? price) : 0;
  const instructorName = instructor || owner || 'Instructor';
  const payload = {
    id,
    title: (title || '').trim(),
    description: (description || '').trim(),
    instructor: instructorName,
    prices: priceNum,
  };

  if (USE_MOCK) {
    await simulateDelay(400);
    const c = courses.find((item) => item.id === id || item.ID === id);
    if (c) {
      c.Title = payload.title;
      c.title = payload.title;
      c.Description = payload.description;
      c.description = payload.description;
      c.Price = priceNum;
      c.price = priceNum;
      c.prices = priceNum;
      c.Owner = instructorName;
      c.instructor = instructorName;
    }
    return { success: 'Courses updated successfully' };
  }

  try {
    const res = await apiClient.post('/updateCourse', payload);
    const c = courses.find((item) => item.id === id || item.ID === id);
    if (c) {
      c.Title = payload.title;
      c.title = payload.title;
      c.Description = payload.description;
      c.description = payload.description;
      c.Price = priceNum;
      c.price = priceNum;
      c.prices = priceNum;
      c.Owner = instructorName;
      c.instructor = instructorName;
    }
    return res;
  } catch (err) {
    console.error('[courseService] Lỗi gọi POST /updateCourse:', err);
    throw err;
  }
}

/**
 * 6. Xóa khóa học
 * Backend: DELETE /api/v1/course
 * Payload: { partitionKey }
 */
export async function deleteCourse(courseId) {
  if (USE_MOCK) {
    await simulateDelay(400);
    const idx = courses.findIndex((c) => c.ID === courseId || c.id === courseId);
    if (idx !== -1) courses.splice(idx, 1);
    return { success: 'Courses deleted successfully' };
  }

  try {
    const res = await apiClient.delete('/course', {
      data: { partitionKey: courseId },
    });
    const idx = courses.findIndex((c) => c.ID === courseId || c.id === courseId);
    if (idx !== -1) courses.splice(idx, 1);
    return res;
  } catch (err) {
    console.error('[courseService] Lỗi gọi DELETE /course:', err);
    throw err;
  }
}

/**
 * 7. Thêm một bài học mới vào khóa học
 * Backend: POST /api/v1/lesson
 * Payload: { id, chapter, title, description, videoURL }
 */
export async function createLesson({ id, courseId, chapter, title, description, videoURL }) {
  const payload = {
    id: id || courseId,
    chapter: chapter || `ch-${Date.now().toString().slice(-4)}`,
    title: (title || '').trim(),
    description: (description || '').trim(),
    videoURL: videoURL || '',
  };

  if (USE_MOCK) {
    await simulateDelay(400);
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
 * 8. Cập nhật bài học
 * Backend: POST /api/v1/updatelesson
 * Payload: { id, chapter, title, description, videoURL }
 */
export async function updateLesson({ id, courseId, chapter, title, description, videoURL }) {
  const payload = {
    id: id || courseId,
    chapter: chapter,
    title: (title || '').trim(),
    description: (description || '').trim(),
    videoURL: videoURL || '',
  };

  if (USE_MOCK) {
    await simulateDelay(400);
    return { success: 'Lesson update successfully' };
  }

  try {
    const res = await apiClient.post('/updatelesson', payload);
    return res;
  } catch (err) {
    console.error('[courseService] Lỗi gọi POST /updatelesson:', err);
    throw err;
  }
}

/**
 * 9. Xóa bài học / chương
 * Backend: DELETE /api/v1/lesson
 * Payload: { partitionKey, sortKey }
 */
export async function deleteLesson(courseId, chapter) {
  if (USE_MOCK) {
    await simulateDelay(400);
    return { success: 'Lesson deleted successfully' };
  }

  try {
    const res = await apiClient.delete('/lesson', {
      data: { partitionKey: courseId, sortKey: chapter },
    });
    return res;
  } catch (err) {
    console.error('[courseService] Lỗi gọi DELETE /lesson:', err);
    throw err;
  }
}

/**
 * Thêm một chương mới cho khóa học (Tạo bản ghi Lesson trên BE)
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
    await simulateDelay(400);
    chapters.push(newChapter);
    return newChapter;
  }

  try {
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
    await simulateDelay(400);
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
 * Backend: POST /api/v1/updatelesson
 */
export async function updateVideoTitle(videoId, newTitle, courseId = null, chapter = null) {
  let cId = courseId;
  let chId = chapter;

  if (!cId || !chId) {
    const foundVid = videos.find((v) => v.ID === videoId || v.id === videoId);
    if (foundVid) {
      cId = cId || foundVid.courseId || foundVid.CoursesID;
      chId = chId || foundVid.chapterId || foundVid.chapter;
    }
  }

  if (USE_MOCK) {
    await simulateDelay();
    const vid = videos.find((v) => v.ID === videoId);
    if (vid) {
      vid.Title = newTitle.trim();
      return vid;
    }
    return null;
  }

  if (cId && chId) {
    try {
      await updateLesson({
        courseId: cId,
        chapter: chId,
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
 * Backend: DELETE /api/v1/lesson
 */
export async function deleteVideo(videoId, courseId = null, chapter = null) {
  let cId = courseId;
  let chId = chapter;

  if (!cId || !chId) {
    const foundVid = videos.find((v) => v.ID === videoId || v.id === videoId);
    if (foundVid) {
      cId = cId || foundVid.courseId || foundVid.CoursesID;
      chId = chId || foundVid.chapterId || foundVid.chapter;
    }
  }

  if (USE_MOCK) {
    await simulateDelay();
    const idx = videos.findIndex((v) => v.ID === videoId);
    if (idx !== -1) {
      return videos.splice(idx, 1)[0];
    }
    return null;
  }

  if (cId && chId) {
    try {
      await deleteLesson(cId, chId);
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
export async function updateChapterTitle(chapterId, newTitle, newDesc, courseId = null) {
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

  let cId = courseId;
  if (!cId) {
    const chap = chapters.find((c) => c.ID === chapterId);
    if (chap) cId = chap.CoursesID || chap.courseId;
  }

  if (cId) {
    try {
      await updateLesson({
        courseId: cId,
        chapter: chapterId,
        title: (newTitle || '').trim(),
        description: (newDesc || '').trim(),
        videoURL: '',
      });
    } catch (e) {
      console.warn('[courseService] Lỗi update chapter trên BE:', e.message);
    }
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
 * Backend: DELETE /api/v1/lesson
 */
export async function deleteChapter(chapterId, courseId = null) {
  let cId = courseId;
  if (!cId) {
    const foundChap = chapters.find((c) => c.ID === chapterId || c.id === chapterId);
    if (foundChap) {
      cId = foundChap.CoursesID || foundChap.courseId;
    }
  }

  if (USE_MOCK) {
    await simulateDelay();
    const idx = chapters.findIndex((c) => c.ID === chapterId);
    if (idx !== -1) {
      return chapters.splice(idx, 1)[0];
    }
    return null;
  }

  if (cId) {
    try {
      await deleteLesson(cId, chapterId);
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
