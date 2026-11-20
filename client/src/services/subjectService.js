import apiClient from '../api/axiosClient.js';
import { updateCourse } from './courseService.js';

/**
 * =============================================================================
 * SERVICE: subjectService (BACKEND SPRING BOOT API)
 * =============================================================================
 * Backend:
 *    - GET    /api/v1/subject        -> [{ id, name }]
 *    - POST   /api/v1/subject        -> { name }            (tên phải duy nhất)
 *    - PUT    /api/v1/subject/{id}   -> { name }
 *    - DELETE /api/v1/subject/{id}   -> XÓA LUÔN mọi khóa học thuộc môn này
 *
 * Mỗi khóa học BẮT BUỘC thuộc một môn học. Khóa học từ BE có trường `subjectId`.
 * Gán khóa học sang môn khác = PUT /api/v1/course/{id} kèm { subjectId }.
 *
 * Danh sách môn được giữ trong bộ nhớ (cache) để các hàm đọc vẫn đồng bộ:
 * gọi `loadSubjects()` (async) trước khi dùng `getSubjects()` / `getSubjectById()`.
 */

let subjectsCache = [];
// { [courseId]: subjectId } — được cập nhật mỗi khi danh sách khóa học đi qua service này
let courseSubjectMap = {};

function errorMessage(err) {
  return err?.response?.data?.error || err?.message || 'Lỗi không xác định';
}

function normalizeSubject(item) {
  return { id: String(item.id), name: item.name || '' };
}

function rememberCourses(courses = []) {
  (Array.isArray(courses) ? courses : []).forEach((c) => {
    const cId = String(c.id || c.ID || '');
    if (cId && c.subjectId) courseSubjectMap[cId] = String(c.subjectId);
  });
}

/**
 * Nạp danh sách Môn học từ Backend vào cache
 */
export async function loadSubjects() {
  try {
    const data = await apiClient.get('/subject');
    subjectsCache = Array.isArray(data) ? data.map(normalizeSubject) : [];
  } catch (err) {
    console.warn('[subjectService] GET /subject lỗi:', errorMessage(err));
  }
  return subjectsCache;
}

/**
 * Danh sách Môn học trong cache (gọi loadSubjects() trước)
 */
export function getSubjects() {
  return subjectsCache;
}

export function getSubjectById(subjectId) {
  if (!subjectId) return null;
  return subjectsCache.find((s) => String(s.id) === String(subjectId)) || null;
}

export async function createSubject({ name }) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) throw new Error('Tên môn học không được để trống.');
  try {
    const created = normalizeSubject(await apiClient.post('/subject', { name: trimmedName }));
    subjectsCache = [created, ...subjectsCache];
    return created;
  } catch (err) {
    throw new Error(errorMessage(err));
  }
}

export async function updateSubject(subjectId, { name }) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) throw new Error('Tên môn học không được để trống.');
  try {
    const updated = normalizeSubject(await apiClient.put(`/subject/${subjectId}`, { name: trimmedName }));
    subjectsCache = subjectsCache.map((s) => (String(s.id) === String(subjectId) ? updated : s));
    return updated;
  } catch (err) {
    throw new Error(errorMessage(err));
  }
}

/**
 * Xóa Môn học — Backend xóa luôn TẤT CẢ khóa học (và chương, bài học) thuộc môn này
 */
export async function deleteSubject(subjectId) {
  try {
    await apiClient.delete(`/subject/${subjectId}`);
  } catch (err) {
    throw new Error(errorMessage(err));
  }
  subjectsCache = subjectsCache.filter((s) => String(s.id) !== String(subjectId));
  Object.keys(courseSubjectMap).forEach((cId) => {
    if (courseSubjectMap[cId] === String(subjectId)) delete courseSubjectMap[cId];
  });
}

export function getCourseSubjectId(courseId) {
  if (!courseId) return null;
  return courseSubjectMap[String(courseId)] || null;
}

/**
 * Lấy Subject của một khóa học (nhận object khóa học hoặc courseId)
 */
export function getSubjectForCourse(courseOrId) {
  const sId =
    courseOrId && typeof courseOrId === 'object'
      ? courseOrId.subjectId
      : getCourseSubjectId(courseOrId);
  return sId ? getSubjectById(sId) : null;
}

/**
 * Chuyển khóa học sang môn khác (PUT /course/{id} cần đầy đủ thông tin khóa học)
 */
export async function assignCourseToSubject(course, subjectId) {
  if (!course || !subjectId) return;
  try {
    await updateCourse(course.id || course.ID, { ...course, subjectId });
  } catch (err) {
    throw new Error(errorMessage(err));
  }
  courseSubjectMap[String(course.id || course.ID)] = String(subjectId);
}

/**
 * Gom nhóm danh sách khóa học theo Môn học (dựa trên course.subjectId từ BE)
 */
export function groupCoursesBySubjects(allCourses = []) {
  rememberCourses(allCourses);
  return subjectsCache.map((subject) => {
    const subCourses = getCoursesForSubject(subject.id, allCourses);
    return { ...subject, courses: subCourses, courseCount: subCourses.length };
  });
}

export function getCoursesForSubject(subjectId, allCourses = []) {
  rememberCourses(allCourses);
  return (Array.isArray(allCourses) ? allCourses : []).filter(
    (course) => String(course.subjectId || '') === String(subjectId)
  );
}
