import apiClient from '../api/axiosClient.js';

/**
 * =============================================================================
 * SERVICE: entitlementService (QUẢN LÝ GHI DANH & QUYỀN TRUY CẬP KHÓA HỌC)
 * =============================================================================
 * Tích hợp trực tiếp với Backend Enrollment API:
 * - GET        /api/v1/enrollment/me     : Kiểm tra danh sách khóa học học sinh đang đăng nhập đã đăng ký
 * - POST / GET /api/v1/enrollment/{id}   : Đăng ký khóa học & tạo thông tin thanh toán cho khóa học {id}
 * - PUT        /api/v1/course/{courseId}/entitlements/{userSub} (Admin cấp quyền)
 * - DELETE     /api/v1/course/{courseId}/entitlements/{userSub} (Admin thu hồi quyền)
 *
 * Quy tắc phân quyền:
 * - Giảng viên (Instructor) & Quản trị viên (Administrator/Admin): Toàn quyền xem mọi khóa học.
 * - Học viên (Student): CHỈ được vào học các khóa học đã đăng ký có trong /api/v1/enrollment/me.
 * =============================================================================
 */

const ENROLLMENTS_STORAGE_KEY = 'securelearn_user_enrollments';
const ENROLLMENTS_DETAILS_STORAGE_KEY = 'securelearn_user_enrollment_details';

// Bộ nhớ đệm trong phiên làm việc (in-memory cache) cho danh sách khóa học đã đăng ký
let memoryEnrolledIdsByUser = {};
let memoryEnrollmentRecordsByUser = {};

export function getEffectiveUserId(user) {
  if (!user) return '';
  return user.userId || user.sub || user.id || user.username || user.email || '';
}

/**
 * Đọc danh sách ID khóa học đã đăng ký được lưu cache của user
 */
export function getStoredEnrollments(userId) {
  if (!userId) return [];
  if (Array.isArray(memoryEnrolledIdsByUser[userId])) {
    return memoryEnrolledIdsByUser[userId];
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      const rawSession = sessionStorage.getItem(`${ENROLLMENTS_STORAGE_KEY}_${userId}`);
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (Array.isArray(parsed)) {
          memoryEnrolledIdsByUser[userId] = parsed;
          return parsed;
        }
      }
    }
    if (typeof localStorage !== 'undefined') {
      const rawLocal = localStorage.getItem(`${ENROLLMENTS_STORAGE_KEY}_${userId}`);
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed)) {
          memoryEnrolledIdsByUser[userId] = parsed;
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('[entitlementService] Không thể đọc cache danh sách ghi danh:', e);
  }
  return [];
}

/**
 * Lưu danh sách ID khóa học đã đăng ký từ Backend vào bộ nhớ cache
 */
export function setStoredEnrollments(userId, courseIds = [], enrollmentRecords = []) {
  if (!userId) return;
  const cleanIds = Array.from(
    new Set(
      (Array.isArray(courseIds) ? courseIds : [])
        .filter(Boolean)
        .map((id) => String(id).trim())
    )
  );
  memoryEnrolledIdsByUser[userId] = cleanIds;
  if (Array.isArray(enrollmentRecords)) {
    memoryEnrollmentRecordsByUser[userId] = enrollmentRecords;
  }

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`${ENROLLMENTS_STORAGE_KEY}_${userId}`, JSON.stringify(cleanIds));
      if (Array.isArray(enrollmentRecords)) {
        sessionStorage.setItem(
          `${ENROLLMENTS_DETAILS_STORAGE_KEY}_${userId}`,
          JSON.stringify(enrollmentRecords)
        );
      }
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${ENROLLMENTS_STORAGE_KEY}_${userId}`, JSON.stringify(cleanIds));
    }
  } catch (e) {
    console.warn('[entitlementService] Không thể lưu cache danh sách ghi danh:', e);
  }
}

/**
 * Thêm 1 khóa học vừa đăng ký thành công vào bộ nhớ cache của người dùng
 */
export function recordCourseEnrollment(userOrId, courseId) {
  const userId = typeof userOrId === 'object' ? getEffectiveUserId(userOrId) : String(userOrId || '').trim();
  if (!userId || !courseId) return;
  const current = getStoredEnrollments(userId);
  const normalizedTarget = String(courseId).trim();
  const exists = current.some((id) => String(id).toLowerCase() === normalizedTarget.toLowerCase());
  if (!exists) {
    setStoredEnrollments(userId, [...current, normalizedTarget]);
  }
}

/**
 * Chuẩn hóa dữ liệu trả về từ GET /api/v1/enrollment/me
 * Hỗ trợ mọi cấu trúc DTO từ Spring Boot:
 * - Mảng các đối tượng Enrollment: [{ id, courseId, course_id, course: { id, title... }, status, enrollmentDate }]
 * - Mảng các đối tượng Course: [{ id, title, description, instructor, prices }]
 * - Mảng các UUID string: ["uuid-1", "uuid-2"]
 * - Object bọc ngoài: { enrollments: [...], courses: [...], courseIds: [...], data: [...] }
 */
export function normalizeEnrollmentResponse(rawResponse) {
  if (!rawResponse) {
    return { courseIds: [], enrolledCourseIds: [], enrollments: [] };
  }

  const unwrapped =
    rawResponse?.data && !Array.isArray(rawResponse.data) && typeof rawResponse.data === 'object'
      ? rawResponse.data
      : rawResponse;

  let list = [];
  if (Array.isArray(unwrapped)) {
    list = unwrapped;
  } else if (typeof unwrapped === 'object') {
    if (Array.isArray(unwrapped.enrollments)) list = unwrapped.enrollments;
    else if (Array.isArray(unwrapped.courses)) list = unwrapped.courses;
    else if (Array.isArray(unwrapped.courseIds)) list = unwrapped.courseIds;
    else if (Array.isArray(unwrapped.data)) list = unwrapped.data;
    else if (Array.isArray(unwrapped.content)) list = unwrapped.content;
    else if (Array.isArray(unwrapped.result)) list = unwrapped.result;
  }

  const courseIds = [];
  const enrollments = [];
  const inactiveStatuses = new Set([
    'cancelled',
    'canceled',
    'failed',
    'expired',
    'revoked',
    'unpaid',
    'rejected',
    'pending_payment',
    'waiting_payment',
  ]);

  list.forEach((item) => {
    if (!item) return;

    // Trường hợp phần tử là chuỗi ID trực tiếp
    if (typeof item === 'string' || typeof item === 'number') {
      const strId = String(item).trim();
      if (strId) {
        courseIds.push(strId);
        enrollments.push({
          courseId: strId,
          status: 'ACTIVE',
          enrollmentDate: null,
          completionDate: null,
          course: null,
        });
      }
      return;
    }

    if (typeof item === 'object') {
      const rawStatus = String(
        item.currentStatus || item.status || item.paymentStatus || item.enrollmentStatus || 'ACTIVE'
      ).toLowerCase();

      if (inactiveStatuses.has(rawStatus)) {
        return;
      }

      // Xác định Course ID:
      // 1. Nếu là đối tượng Enrollment có chứa courseId / course_id / course.id
      let extractedCourseId =
        item.courseId ||
        item.course_id ||
        item.CoursesID ||
        item.coursesId ||
        item.course?.id ||
        item.course?.ID ||
        item.course?.courseId ||
        null;

      // 2. Nếu là đối tượng Course trả về trực tiếp từ /enrollment/me (có id và title, hoặc không có trường userId/enrollmentId riêng)
      if (!extractedCourseId && (item.id || item.ID)) {
        extractedCourseId = item.id || item.ID;
      }

      if (extractedCourseId) {
        const strCourseId = String(extractedCourseId).trim();
        courseIds.push(strCourseId);

        const courseObj = item.course || (item.title || item.Title ? item : null);
        enrollments.push({
          id: item.id || item.ID || strCourseId,
          courseId: strCourseId,
          status: item.currentStatus || item.status || 'ACTIVE',
          enrollmentDate:
            item.enrollmentDate ||
            item.enrollment_date ||
            item.joinDate ||
            item.createdAt ||
            item['Creation Time'] ||
            null,
          completionDate: item.completionDate || item.completion_date || null,
          course: courseObj,
        });
      }
    }
  });

  const uniqueCourseIds = Array.from(new Set(courseIds));
  return {
    courseIds: uniqueCourseIds,
    enrolledCourseIds: uniqueCourseIds,
    enrollments,
  };
}

/**
 * Gọi API Backend: GET /api/v1/enrollment/me
 * Lấy danh sách khóa học mà học viên đang đăng nhập đã đăng ký
 *
 * @param {Object|null} [user] - Thông tin người dùng hiện tại từ AuthContext
 * @returns {Promise<{ courseIds: string[], enrollments: Array }>}
 */
export async function fetchMyEnrollments(user = null) {
  const effectiveUserId = getEffectiveUserId(user);

  // Nếu là Instructor hoặc Admin thì không bắt buộc giới hạn bởi enrollment/me
  const role = String(user?.role || '').toLowerCase();
  if (role === 'instructor' || role === 'administrator' || role === 'admin') {
    return { courseIds: [], enrollments: [], isFullAccessRole: true };
  }

  try {
    const response = await apiClient.get('/enrollment/me');
    const normalized = normalizeEnrollmentResponse(response);

    if (effectiveUserId) {
      setStoredEnrollments(effectiveUserId, normalized.courseIds, normalized.enrollments);
    }

    return normalized;
  } catch (err) {
    console.warn('[entitlementService] Lỗi khi gọi GET /api/v1/enrollment/me:', err.message);
    if (effectiveUserId) {
      return {
        courseIds: getStoredEnrollments(effectiveUserId),
        enrollments: memoryEnrollmentRecordsByUser[effectiveUserId] || [],
      };
    }
    return { courseIds: [], enrollments: [] };
  }
}

/**
 * Gọi API Backend: /api/v1/enrollment/{id}
 * Tạo thông tin thanh toán / Đăng ký khóa học cho học sinh đang đăng nhập
 *
 * Hỗ trợ linh hoạt cả POST và GET /api/v1/enrollment/{id} tùy cấu hình Controller phía Backend.
 *
 * @param {string} courseId - UUID của khóa học cần đăng ký
 * @param {Object|null} [user] - Thông tin người dùng hiện tại
 * @returns {Promise<{
 *   raw: any,
 *   paymentUrl: string|null,
 *   qrCode: string|null,
 *   isImmediateSuccess: boolean,
 *   message: string
 * }>}
 */
export async function enrollInCourse(courseId, user = null) {
  if (!courseId) {
    throw new Error('400: Thiếu mã khóa học (courseId) để đăng ký.');
  }

  let response;
  try {
    response = await apiClient.post(`/enrollment/${courseId}`);
  } catch (postErr) {
    // Nếu Backend khai báo @GetMapping("/enrollment/{id}") thay vì @PostMapping (HTTP 405/400)
    const status = postErr?.status || postErr?.response?.status;
    if (status === 405 || status === 404 || postErr?.message?.includes('405') || postErr?.message?.includes('Method')) {
      response = await apiClient.get(`/enrollment/${courseId}`);
    } else {
      throw postErr;
    }
  }

  // Phân tích dữ liệu thanh toán / ghi danh trả về từ Backend
  let paymentUrl = null;
  let qrCode = null;
  let message = 'Đã khởi tạo thông tin đăng ký khóa học.';

  const payload =
    response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
      ? response.data.data && typeof response.data.data === 'object'
        ? response.data.data
        : response.data
      : response;

  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      paymentUrl = trimmed;
    } else if (trimmed) {
      message = trimmed;
    }
  } else if (payload && typeof payload === 'object') {
    const candidateUrl =
      payload.paymentUrl ||
      payload.checkoutUrl ||
      payload.payUrl ||
      payload.vnpayUrl ||
      payload.momoUrl ||
      payload.redirectUrl ||
      payload.orderUrl ||
      payload.url ||
      payload.data?.paymentUrl ||
      payload.data?.checkoutUrl ||
      payload.data?.url ||
      null;

    if (
      typeof candidateUrl === 'string' &&
      (candidateUrl.startsWith('http://') || candidateUrl.startsWith('https://'))
    ) {
      paymentUrl = candidateUrl;
    }

    qrCode =
      payload.qrCode ||
      payload.qrDataURL ||
      payload.qrUrl ||
      payload.qrImage ||
      payload.data?.qrCode ||
      null;

    if (payload.message || payload.msg || payload.success) {
      message = String(payload.message || payload.msg || payload.success);
    }
  }

  // Đồng bộ lại danh sách ghi danh từ /api/v1/enrollment/me
  const updated = await fetchMyEnrollments(user);
  const isNowEnrolled = updated.courseIds.some(
    (id) => String(id).toLowerCase() === String(courseId).toLowerCase()
  );

  // Nếu không có paymentUrl chuyển hướng riêng và Backend không báo trạng thái chờ thanh toán,
  // hoặc khóa học đã có trong /enrollment/me thì đánh dấu hoàn tất ghi danh
  const statusStr = String(payload?.status || payload?.currentStatus || '').toLowerCase();
  const isPendingPayment =
    Boolean(paymentUrl) ||
    Boolean(qrCode) ||
    statusStr === 'pending' ||
    statusStr === 'unpaid' ||
    Boolean(payload?.bankAccount || payload?.accountNumber || payload?.orderCode);

  if (isNowEnrolled || !isPendingPayment) {
    const effectiveUserId = getEffectiveUserId(user);
    if (effectiveUserId) {
      recordCourseEnrollment(effectiveUserId, courseId);
    }
  }

  return {
    raw: payload,
    paymentUrl,
    qrCode,
    isImmediateSuccess: isNowEnrolled || !isPendingPayment,
    message,
  };
}

/**
 * Kiểm tra xem người dùng có quyền xem video bài giảng của khóa học hay không
 * @param {Object|null} user - Thông tin người dùng hiện tại từ AuthContext
 * @param {string} courseId - ID của khóa học
 * @param {string[]|null} [enrolledIdsOverride] - Danh sách courseId lấy từ GET /api/v1/enrollment/me
 * @returns {{ hasAccess: boolean, reason: string, message: string }}
 */
export function checkCourseAccess(user, courseId, enrolledIdsOverride = null) {
  if (!user) {
    return {
      hasAccess: false,
      reason: 'NOT_AUTHENTICATED',
      message: 'Vui lòng đăng nhập để kiểm tra quyền truy cập khóa học.',
    };
  }

  const role = (user.role || '').toLowerCase();

  // Giảng viên hoặc Quản trị viên luôn có toàn quyền xem bài giảng
  if (role === 'instructor' || role === 'administrator' || role === 'admin') {
    return {
      hasAccess: true,
      reason: 'ROLE_OVERRIDE',
      message: 'Quyền xem được cấp theo vai trò quản trị/giảng viên.',
    };
  }

  const effectiveUserId = getEffectiveUserId(user);
  if (!effectiveUserId) {
    return {
      hasAccess: false,
      reason: 'NO_USER_ID',
      message: 'Không tìm thấy thông tin định danh học viên.',
    };
  }

  if (!courseId) {
    return {
      hasAccess: false,
      reason: 'NO_COURSE_ID',
      message: 'Không xác định được mã khóa học.',
    };
  }

  // Kiểm tra danh sách khóa học người dùng đã đăng ký từ /api/v1/enrollment/me
  const enrolledList = Array.isArray(enrolledIdsOverride)
    ? enrolledIdsOverride
    : getStoredEnrollments(effectiveUserId);

  const normalizedCourseId = String(courseId).trim().toLowerCase();
  const isEnrolled =
    Array.isArray(enrolledList) &&
    enrolledList.some((id) => String(id).trim().toLowerCase() === normalizedCourseId);

  if (isEnrolled) {
    return {
      hasAccess: true,
      reason: 'GRANTED',
      message: 'Đã cấp quyền truy cập hợp lệ.',
    };
  }

  // Học viên chưa đăng ký khóa học sẽ KHÔNG được vào xem khóa học
  return {
    hasAccess: false,
    reason: 'NOT_ENROLLED',
    message: 'Bạn chưa đăng ký khóa học này. Vui lòng đăng ký khóa học để xem nội dung bài giảng.',
  };
}

/**
 * Lấy danh sách ID các khóa học mà người dùng được quyền xem
 * @param {Object|null} user
 * @param {Array} allCourses
 * @param {string[]|null} [enrolledIdsOverride] - Danh sách courseId lấy từ GET /api/v1/enrollment/me
 * @returns {string[]}
 */
export function getEntitledCourseIds(user, allCourses = [], enrolledIdsOverride = null) {
  if (!user) return [];

  const role = (user.role || '').toLowerCase();
  if (role === 'instructor' || role === 'administrator' || role === 'admin') {
    if (Array.isArray(allCourses) && allCourses.length > 0) {
      return allCourses.map((c) => c.ID || c.id).filter(Boolean);
    }
    return [];
  }

  const effectiveUserId = getEffectiveUserId(user);
  const enrolledList = Array.isArray(enrolledIdsOverride)
    ? enrolledIdsOverride
    : getStoredEnrollments(effectiveUserId);

  if (!Array.isArray(enrolledList) || enrolledList.length === 0) {
    return [];
  }

  if (Array.isArray(allCourses) && allCourses.length > 0) {
    const enrolledLowerSet = new Set(enrolledList.map((id) => String(id).trim().toLowerCase()));
    return allCourses
      .map((c) => c.ID || c.id)
      .filter((cId) => cId && enrolledLowerSet.has(String(cId).trim().toLowerCase()));
  }

  return enrolledList;
}

/**
 * Cấp quyền xem khóa học cho người dùng (Role Admin)
 * Backend: PUT /api/v1/course/{courseId}/entitlements/{userSub}
 *
 * @param {string} courseId - UUID của khóa học
 * @param {string} userSub - Sub/ID của người dùng được cấp quyền
 */
export async function grantCourseEntitlement(courseId, userSub) {
  if (!courseId || !userSub) {
    throw new Error('400: Thiếu thông tin courseId hoặc userSub.');
  }
  const res = await apiClient.put(`/course/${courseId}/entitlements/${userSub}`);
  recordCourseEnrollment(userSub, courseId);
  return res;
}

/**
 * Thu hồi quyền xem khóa học của người dùng (Role Admin)
 * Backend: DELETE /api/v1/course/{courseId}/entitlements/{userSub}
 *
 * @param {string} courseId - UUID của khóa học
 * @param {string} userSub - Sub/ID của người dùng bị thu hồi quyền
 */
export async function revokeCourseEntitlement(courseId, userSub) {
  if (!courseId || !userSub) {
    throw new Error('400: Thiếu thông tin courseId hoặc userSub.');
  }
  return await apiClient.delete(`/course/${courseId}/entitlements/${userSub}`);
}
