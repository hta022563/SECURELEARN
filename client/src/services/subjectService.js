/**
 * =============================================================================
 * SERVICE: subjectService (FRONTEND-ONLY SUBJECT MANAGEMENT VIA LOCALSTORAGE)
 * =============================================================================
 * Quản lý Môn học (Subject) và ánh xạ Khóa học -> Môn học thuần phía Frontend,
 * không yêu cầu thay đổi Backend hay Database.
 */

const SUBJECTS_STORAGE_KEY = 'securelearn_subjects_v1';
const COURSE_SUBJECT_MAP_KEY = 'securelearn_course_subject_map_v1';

function readJson(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (err) {
    console.warn(`[subjectService] Không thể đọc ${key}:`, err.message);
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[subjectService] Không thể lưu ${key}:`, err.message);
  }
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `subj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Lấy danh sách tất cả Môn học đã lưu trên Frontend
 */
export function getSubjects() {
  const list = readJson(SUBJECTS_STORAGE_KEY, []);
  return Array.isArray(list) ? list : [];
}

/**
 * Lấy thông tin một Môn học theo ID
 */
export function getSubjectById(subjectId) {
  if (!subjectId || subjectId === 'unassigned') return null;
  return getSubjects().find((s) => String(s.id) === String(subjectId)) || null;
}

/**
 * Tạo mới một Môn học
 */
export function createSubject({ name, description = '' }) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) {
    throw new Error('Tên môn học không được để trống.');
  }

  const subjects = getSubjects();
  const duplicate = subjects.some(
    (s) => (s.name || '').trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicate) {
    throw new Error(`Môn học "${trimmedName}" đã tồn tại.`);
  }

  const now = new Date().toISOString();
  const newSubject = {
    id: generateId(),
    name: trimmedName,
    description: (description || '').trim(),
    createdAt: now,
    updatedAt: now,
  };

  writeJson(SUBJECTS_STORAGE_KEY, [newSubject, ...subjects]);
  return newSubject;
}

/**
 * Cập nhật thông tin một Môn học
 */
export function updateSubject(subjectId, { name, description = '' }) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) {
    throw new Error('Tên môn học không được để trống.');
  }

  const subjects = getSubjects();
  const duplicate = subjects.some(
    (s) =>
      String(s.id) !== String(subjectId) &&
      (s.name || '').trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicate) {
    throw new Error(`Môn học "${trimmedName}" đã tồn tại.`);
  }

  let updatedSubject = null;
  const next = subjects.map((s) => {
    if (String(s.id) !== String(subjectId)) return s;
    updatedSubject = {
      ...s,
      name: trimmedName,
      description: (description || '').trim(),
      updatedAt: new Date().toISOString(),
    };
    return updatedSubject;
  });

  if (!updatedSubject) {
    throw new Error('Không tìm thấy môn học cần cập nhật.');
  }

  writeJson(SUBJECTS_STORAGE_KEY, next);
  return updatedSubject;
}

/**
 * Xóa một Môn học (các khóa học thuộc môn này sẽ trở thành chưa phân môn)
 */
export function deleteSubject(subjectId) {
  const subjects = getSubjects().filter((s) => String(s.id) !== String(subjectId));
  writeJson(SUBJECTS_STORAGE_KEY, subjects);

  const mapping = getCourseSubjectMap();
  const nextMapping = {};
  Object.entries(mapping).forEach(([courseId, sId]) => {
    if (String(sId) !== String(subjectId)) {
      nextMapping[courseId] = sId;
    }
  });
  writeJson(COURSE_SUBJECT_MAP_KEY, nextMapping);
}

/**
 * Lấy bảng ánh xạ { [courseId]: subjectId }
 */
export function getCourseSubjectMap() {
  const map = readJson(COURSE_SUBJECT_MAP_KEY, {});
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
}

/**
 * Lấy subjectId của một khóa học
 */
export function getCourseSubjectId(courseId) {
  if (!courseId) return null;
  const map = getCourseSubjectMap();
  const sId = map[String(courseId)] || null;
  if (!sId) return null;
  // Đảm bảo subjectId vẫn còn tồn tại trong danh sách môn học
  return getSubjectById(sId) ? sId : null;
}

/**
 * Lấy đối tượng Subject của một khóa học
 */
export function getSubjectForCourse(courseId) {
  const sId = getCourseSubjectId(courseId);
  return sId ? getSubjectById(sId) : null;
}

/**
 * Gán hoặc gỡ gán khóa học vào một môn học
 */
export function assignCourseToSubject(courseId, subjectId) {
  if (!courseId) return;
  const map = getCourseSubjectMap();
  const key = String(courseId);
  if (!subjectId || subjectId === 'unassigned') {
    delete map[key];
  } else {
    map[key] = String(subjectId);
  }
  writeJson(COURSE_SUBJECT_MAP_KEY, map);
}

/**
 * Gom nhóm danh sách khóa học từ Backend theo từng Môn học ở FE
 */
export function groupCoursesBySubjects(allCourses = [], unassignedMeta = null) {
  const subjects = getSubjects();
  const map = getCourseSubjectMap();
  const validSubjectIds = new Set(subjects.map((s) => String(s.id)));

  const coursesBySubject = new Map();
  subjects.forEach((s) => {
    coursesBySubject.set(String(s.id), []);
  });
  const unassignedCourses = [];

  (Array.isArray(allCourses) ? allCourses : []).forEach((course) => {
    const cId = String(course.id || course.ID || '');
    const mappedSubId = cId ? map[cId] : null;
    if (mappedSubId && validSubjectIds.has(String(mappedSubId))) {
      coursesBySubject.get(String(mappedSubId)).push(course);
    } else {
      unassignedCourses.push(course);
    }
  });

  const result = subjects.map((subject) => {
    const subCourses = coursesBySubject.get(String(subject.id)) || [];
    return {
      ...subject,
      courses: subCourses,
      courseCount: subCourses.length,
    };
  });

  if (unassignedCourses.length > 0) {
    result.push({
      id: 'unassigned',
      name: unassignedMeta?.name || 'Khóa học chưa phân môn',
      description:
        unassignedMeta?.description ||
        'Các khóa học hiện chưa được gán vào môn học cụ thể.',
      courses: unassignedCourses,
      courseCount: unassignedCourses.length,
      isVirtual: true,
    });
  }

  return result;
}

/**
 * Lấy danh sách khóa học thuộc một subjectId cụ thể ('unassigned' cho khóa chưa phân môn)
 */
export function getCoursesForSubject(subjectId, allCourses = []) {
  const map = getCourseSubjectMap();
  const validSubjectIds = new Set(getSubjects().map((s) => String(s.id)));

  return (Array.isArray(allCourses) ? allCourses : []).filter((course) => {
    const cId = String(course.id || course.ID || '');
    const mappedSubId = cId ? map[cId] : null;
    const isAssignedValid = Boolean(mappedSubId && validSubjectIds.has(String(mappedSubId)));

    if (subjectId === 'unassigned') {
      return !isAssignedValid;
    }
    return isAssignedValid && String(mappedSubId) === String(subjectId);
  });
}
