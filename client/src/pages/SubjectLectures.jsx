import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  X,
  ChevronLeft,
  BookOpen,
  Play,
  Lock,
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Info,
  LogIn,
  Layers,
  User,
  Filter,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  checkCourseAccess,
  getEntitledCourseIds,
  fetchMyEnrollments,
  enrollInCourse,
} from '../services/entitlementService';
import { getCourses, getChapters, getLessons } from '../services/courseService';
import {
  loadSubjects,
  getSubjectById,
  getCoursesForSubject,
  assignCourseToSubject,
} from '../services/subjectService';
import CreateCourseModal from '../components/CreateCourseModal';

export default function SubjectLectures() {
  const { lang, subjectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentLang = lang || 'vi';
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [allCourses, setAllCourses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [subjectVersion, setSubjectVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLectures, setIsLoadingLectures] = useState(false);

  const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get('courseId') || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAccess, setFilterAccess] = useState('ALL'); // 'ALL' | 'ENTITLED' | 'UNENTITLED'

  const [enrolledCourseIds, setEnrolledCourseIds] = useState(null);
  const [blockedModalCourse, setBlockedModalCourse] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentPaymentInfo, setEnrollmentPaymentInfo] = useState(null);
  const [enrollmentError, setEnrollmentError] = useState(null);
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);

  const subjectMeta = useMemo(() => {
    if (subjectId === 'unassigned') {
      return {
        id: 'unassigned',
        name: t('catalog.unassigned_subject', 'Khóa học chưa phân môn'),
        description: t(
          'catalog.unassigned_subject_desc',
          'Các khóa học hiện chưa được gán vào môn học cụ thể.'
        ),
        isVirtual: true,
      };
    }
    return getSubjectById(subjectId);
  }, [subjectId, subjectVersion, allSubjects, t]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      setAllSubjects(await loadSubjects());
      const coursesList = await getCourses();
      const safeCourses = Array.isArray(coursesList) ? coursesList : [];
      setAllCourses(safeCourses);

      const subjectCourses = getCoursesForSubject(subjectId, safeCourses);

      if (isAuthenticated && subjectCourses.length > 0) {
        setIsLoadingLectures(true);
        try {
          const perCourseResults = await Promise.all(
            subjectCourses.map(async (course) => {
              const cId = course.id || course.ID;
              const chapters = await getChapters(cId).catch(() => []);
              const lessonsPerChapter = await Promise.all(
                chapters.map(async (chap, chIdx) => {
                  const chapId = chap.id || chap.ID;
                  const lessons = await getLessons(chapId).catch(() => []);
                  return lessons.map((l) => ({
                    id: l.id || l.ID,
                    title: l.title || l.Title,
                    description: l.description || l.Description || '',
                    chapterId: chapId,
                    chapterTitle: chap.title || chap.Title || `Chương ${chIdx + 1}`,
                    courseId: cId,
                    courseTitle: course.title || course.Title,
                    courseInstructor: course.instructor || course.Instructor || '',
                    coursePrice: course.price ?? course.Price ?? 0,
                  }));
                })
              );
              return lessonsPerChapter.flat();
            })
          );
          setLectures(perCourseResults.flat());
        } finally {
          setIsLoadingLectures(false);
        }
      } else {
        setLectures([]);
      }
    } catch (err) {
      console.warn('[SubjectLectures] Lỗi nạp dữ liệu:', err);
      setAllCourses([]);
      setLectures([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subjectId, isAuthenticated, subjectVersion]);

  useEffect(() => {
    const queryCourseId = searchParams.get('courseId') || '';
    setSelectedCourseId(queryCourseId);
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    if (!isAuthenticated || !user) {
      setEnrolledCourseIds([]);
      return () => {
        isMounted = false;
      };
    }

    fetchMyEnrollments(user)
      .then((res) => {
        if (isMounted && res) {
          setEnrolledCourseIds(res.courseIds || []);
        }
      })
      .catch(() => {
        if (isMounted) setEnrolledCourseIds([]);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user]);

  const courses = useMemo(() => {
    return getCoursesForSubject(subjectId, allCourses);
  }, [subjectId, allCourses, subjectVersion]);

  const lessonCountByCourse = useMemo(() => {
    const counts = new Map();
    lectures.forEach((l) => {
      const key = String(l.courseId);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [lectures]);

  const entitledIds = useMemo(() => {
    return getEntitledCourseIds(user, courses, enrolledCourseIds);
  }, [user, courses, enrolledCourseIds]);

  const isCourseEntitled = (courseId) =>
    entitledIds.some((id) => String(id).toLowerCase() === String(courseId).toLowerCase());

  const handleSelectCourse = (courseId) => {
    setSelectedCourseId(courseId);
    if (courseId) {
      setSearchParams({ courseId });
    } else {
      setSearchParams({});
    }
  };

  const handleAssignCourseSubject = async (courseId, newSubjectId) => {
    const course = allCourses.find((c) => String(c.id || c.ID) === String(courseId));
    if (!course || !newSubjectId) return;
    try {
      await assignCourseToSubject(course, newSubjectId);
      setSubjectVersion((v) => v + 1);
      if (showToast) {
        showToast(
          t('subject_lectures.course_moved', 'Đã cập nhật môn học cho khóa học.'),
          'success'
        );
      }
    } catch (err) {
      if (showToast) showToast(err.message, 'danger');
    }
  };

  const filteredLectures = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return lectures.filter((lecture) => {
      if (selectedCourseId && String(lecture.courseId) !== String(selectedCourseId)) {
        return false;
      }

      if (term) {
        const matchTitle = (lecture.title || '').toLowerCase().includes(term);
        const matchDesc = (lecture.description || '').toLowerCase().includes(term);
        const matchChapter = (lecture.chapterTitle || '').toLowerCase().includes(term);
        const matchCourse = (lecture.courseTitle || '').toLowerCase().includes(term);
        if (!matchTitle && !matchDesc && !matchChapter && !matchCourse) {
          return false;
        }
      }

      const entitled = isCourseEntitled(lecture.courseId);
      if (filterAccess === 'ENTITLED') return entitled;
      if (filterAccess === 'UNENTITLED') return !entitled;
      return true;
    });
  }, [lectures, selectedCourseId, searchTerm, filterAccess, entitledIds]);

  const handleLectureAction = (lecture) => {
    const access = checkCourseAccess(user, lecture.courseId, enrolledCourseIds);
    if (access.hasAccess) {
      if (user?.role === 'Instructor') {
        navigate(`/${currentLang}/instructor/preview/${lecture.id}`);
      } else {
        navigate(`/${currentLang}/student/player/${lecture.id}`);
      }
      return;
    }

    const matchedCourse = courses.find((c) => String(c.id || c.ID) === String(lecture.courseId));
    setEnrollmentPaymentInfo(null);
    setEnrollmentError(null);
    setBlockedModalCourse({
      ID: lecture.courseId,
      id: lecture.courseId,
      Title: matchedCourse?.title || lecture.courseTitle,
      title: matchedCourse?.title || lecture.courseTitle,
      Price: matchedCourse?.price ?? lecture.coursePrice ?? 0,
      reasonMessage: access.message,
    });
  };

  const handleOpenEnrollCourse = (course) => {
    const cId = course.id || course.ID;
    const access = checkCourseAccess(user, cId, enrolledCourseIds);
    if (access.hasAccess) {
      if (user?.role === 'Instructor') {
        navigate(`/${currentLang}/instructor/preview/${cId}`);
      } else {
        navigate(`/${currentLang}/student/player/${cId}`);
      }
      return;
    }
    setEnrollmentPaymentInfo(null);
    setEnrollmentError(null);
    setBlockedModalCourse({
      ...course,
      ID: cId,
      Title: course.title || course.Title,
      Price: course.price ?? course.Price ?? 0,
    });
  };

  const handleEnrollCourse = async (course) => {
    if (!isAuthenticated || !user) {
      setBlockedModalCourse(null);
      navigate(`/${currentLang}/login`);
      return;
    }

    const courseId = course?.ID || course?.id;
    if (!courseId) return;

    setIsEnrolling(true);
    setEnrollmentError(null);

    try {
      const result = await enrollInCourse(courseId, user);
      const refreshed = await fetchMyEnrollments(user);
      const updatedIds = refreshed.courseIds || [];
      setEnrolledCourseIds(updatedIds);

      if (result.paymentUrl && !result.qrCode) {
        window.location.href = result.paymentUrl;
        return;
      }

      const isNowEnrolled = updatedIds.some(
        (id) => String(id).toLowerCase() === String(courseId).toLowerCase()
      );

      if (isNowEnrolled && !result.paymentUrl && !result.qrCode) {
        if (showToast) {
          showToast(
            `Đăng ký khóa học "${course.Title || course.title}" thành công!`,
            'success',
            'Đăng Ký Thành Công'
          );
        }
        setBlockedModalCourse(null);
        return;
      }

      setEnrollmentPaymentInfo({
        ...result,
        courseId,
        isNowEnrolled,
      });
    } catch (err) {
      setEnrollmentError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Không thể tạo thông tin đăng ký/thanh toán cho khóa học này.'
      );
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerifyEnrollment = async (courseId) => {
    setIsEnrolling(true);
    setEnrollmentError(null);
    try {
      const refreshed = await fetchMyEnrollments(user);
      const updatedIds = refreshed.courseIds || [];
      setEnrolledCourseIds(updatedIds);

      const hasAccessNow = updatedIds.some(
        (id) => String(id).toLowerCase() === String(courseId).toLowerCase()
      );
      if (hasAccessNow) {
        if (showToast) {
          showToast('Đã xác nhận quyền học tập thành công!', 'success', 'Hoàn Tất Đăng Ký');
        }
        setBlockedModalCourse(null);
        setEnrollmentPaymentInfo(null);
      } else {
        setEnrollmentError(
          'Hệ thống chưa ghi nhận hoàn tất thanh toán cho khóa học này. Vui lòng hoàn tất thanh toán rồi thử lại.'
        );
      }
    } catch (err) {
      setEnrollmentError(err?.message || 'Không thể kiểm tra trạng thái đăng ký.');
    } finally {
      setIsEnrolling(false);
    }
  };

  const canManage =
    isAuthenticated && (user?.role === 'Instructor' || user?.role === 'Administrator');

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20 px-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-3" />
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {t('subject_lectures.loading', 'Đang tải danh sách bài giảng của môn học...')}
        </p>
      </div>
    );
  }

  if (!subjectMeta) {
    return (
      <div className="py-20 text-center max-w-md mx-auto px-4">
        <BookOpen className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <h5 className="text-base font-bold text-slate-900 dark:text-white mb-2">
          {t('subject_lectures.not_found', 'Không tìm thấy môn học')}
        </h5>
        <button
          type="button"
          onClick={() => navigate(`/${currentLang}/catalog`)}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-xs font-semibold text-white shadow-xs"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>{t('subject_lectures.back_to_subjects', 'Quay lại Danh Sách Môn Học')}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 1. BREADCRUMB & SUBJECT HEADER */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 dark:border-slate-800 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link
              to={`/${currentLang}/catalog`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline no-underline mb-3"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{t('subject_lectures.back_to_subjects', 'Quay lại Danh Sách Môn Học')}</span>
            </Link>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
              {subjectMeta.name}
            </h1>
            {subjectMeta.description && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                {subjectMeta.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200/60 dark:border-blue-800">
              <Layers className="h-3.5 w-3.5" />
              <span>
                {courses.length} {t('subject_lectures.courses_label', 'khóa học')}
              </span>
            </span>

            {isAuthenticated && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200/60 dark:border-emerald-800">
                <Play className="h-3.5 w-3.5" />
                <span>
                  {lectures.length} {t('subject_lectures.lectures_label', 'bài giảng')}
                </span>
              </span>
            )}

            {canManage && subjectId !== 'unassigned' && (
              <button
                type="button"
                onClick={() => setShowCreateCourseModal(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>{t('catalog.add_course', 'Thêm Khóa Học Mới')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. BỘ LỌC & TÌM KIẾM THEO KHÓA HỌC */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder={t(
                'subject_lectures.search_placeholder',
                'Tìm kiếm bài giảng, chương hoặc tên khóa học...'
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 min-w-[230px]">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedCourseId}
              onChange={(e) => handleSelectCourse(e.target.value)}
              aria-label={t('subject_lectures.filter_by_course', 'Lọc theo khóa học')}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">
                {t('subject_lectures.all_courses', 'Tất cả khóa học')} ({courses.length})
              </option>
              {courses.map((course) => {
                const cId = course.id || course.ID;
                const count = lessonCountByCourse.get(String(cId)) || 0;
                return (
                  <option key={cId} value={cId}>
                    {course.title}
                    {isAuthenticated ? ` (${count} ${t('subject_lectures.lectures_label', 'bài giảng')})` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {courses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              {t('subject_lectures.filter_course_pills', 'Khóa học:')}
            </span>
            <button
              type="button"
              onClick={() => handleSelectCourse('')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                !selectedCourseId
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t('catalog.filter_all', 'Tất cả')}
              {isAuthenticated ? ` (${lectures.length})` : ''}
            </button>

            {courses.map((course) => {
              const cId = course.id || course.ID;
              const active = String(selectedCourseId) === String(cId);
              const entitled = isCourseEntitled(cId);
              const count = lessonCountByCourse.get(String(cId)) || 0;
              return (
                <button
                  key={cId}
                  type="button"
                  onClick={() => handleSelectCourse(active ? '' : cId)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {!entitled && isAuthenticated && user?.role === 'Student' && (
                    <Lock className="h-3 w-3 opacity-70" />
                  )}
                  <span>{course.title}</span>
                  {isAuthenticated && <span className="opacity-75">({count})</span>}
                </button>
              );
            })}
          </div>
        )}

        {isAuthenticated && user?.role === 'Student' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              {t('subject_lectures.access_status', 'Quyền học:')}
            </span>
            {[
              { id: 'ALL', label: t('catalog.filter_all', 'Tất cả') },
              { id: 'ENTITLED', label: t('catalog.filter_entitled', 'Đã cấp quyền') },
              { id: 'UNENTITLED', label: t('catalog.filter_unentitled', 'Chưa cấp quyền') },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilterAccess(item.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  filterAccess === item.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. THẺ KHÓA HỌC THUỘC MÔN */}
      {courses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {courses
            .filter((c) => {
              const cId = c.id || c.ID;
              if (selectedCourseId && String(cId) !== String(selectedCourseId)) return false;
              const term = searchTerm.trim().toLowerCase();
              if (!isAuthenticated && term) {
                return (
                  (c.title || '').toLowerCase().includes(term) ||
                  (c.description || '').toLowerCase().includes(term) ||
                  (c.instructor || '').toLowerCase().includes(term)
                );
              }
              return true;
            })
            .map((course) => {
              const cId = course.id || course.ID;
              const entitled = isCourseEntitled(cId);
              return (
                <div
                  key={cId}
                  className="flex flex-col justify-between rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                          entitled
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {entitled
                          ? t('catalog.entitled', 'Đã Cấp Quyền')
                          : t('catalog.not_entitled', 'Chưa cấp quyền')}
                      </span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {course.price === 0
                          ? t('catalog.free', 'Miễn Phí')
                          : `${course.price?.toLocaleString(currentLang === 'vi' ? 'vi-VN' : 'en-US')} đ`}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1 line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                      {course.description}
                    </p>

                    {/* Cho phép Giảng viên/Admin gán nhanh khóa học vào môn khác */}
                    {canManage && allSubjects.length > 0 && (
                      <div className="mb-3">
                        <select
                          value={subjectId}
                          onChange={(e) => handleAssignCourseSubject(cId, e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-200"
                        >
                          {allSubjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <User className="h-3.5 w-3.5 text-blue-500" />
                      <span>{course.instructor}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEnrollCourse(course)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold text-white cursor-pointer ${
                        entitled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'
                      }`}
                    >
                      {entitled ? (
                        <>
                          <Play className="h-3 w-3 fill-white" />
                          <span>{t('catalog.start_learning', 'Vào học ngay')}</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-3 w-3" />
                          <span>{currentLang === 'en' ? 'Enroll Now' : 'Đăng Ký Học'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* 4. DANH SÁCH BÀI GIẢNG THUỘC MÔN HỌC */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {t('subject_lectures.lectures_heading', 'Danh Sách Bài Giảng')}
            {isAuthenticated ? ` (${filteredLectures.length})` : ''}
          </h2>
        </div>

        {!isAuthenticated ? (
          <div className="text-center py-14 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <Lock className="h-10 w-10 mx-auto text-blue-500 mb-3" />
            <h5 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              {t('subject_lectures.login_to_view_lectures', 'Đăng nhập để xem danh sách bài giảng chi tiết')}
            </h5>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
              {t(
                'subject_lectures.login_to_view_desc',
                'Bạn cần đăng nhập tài khoản để xem chi tiết các chương, bài giảng và đăng ký khóa học.'
              )}
            </p>
            <button
              type="button"
              onClick={() => navigate(`/${currentLang}/login`)}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-xs font-semibold text-white shadow-xs cursor-pointer"
            >
              <LogIn className="h-4 w-4" />
              <span>{t('common.login', 'Đăng Nhập')}</span>
            </button>
          </div>
        ) : isLoadingLectures ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('subject_lectures.loading', 'Đang tải danh sách bài giảng của môn học...')}
            </p>
          </div>
        ) : filteredLectures.length === 0 ? (
          <div className="text-center py-16 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <BookOpen className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {t('subject_lectures.no_lectures', 'Không tìm thấy bài giảng nào phù hợp')}
            </h5>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
              {t(
                'subject_lectures.no_lectures_desc',
                'Thử thay đổi bộ lọc khóa học hoặc từ khóa tìm kiếm khác.'
              )}
            </p>
            {(searchTerm || selectedCourseId || filterAccess !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  handleSelectCourse('');
                  setFilterAccess('ALL');
                }}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white shadow-xs"
              >
                {t('catalog.clear_filter', 'Xóa Bộ Lọc')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLectures.map((lecture, idx) => {
              const entitled = isCourseEntitled(lecture.courseId);
              return (
                <div
                  key={lecture.id}
                  onClick={() => handleLectureAction(lecture)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800 transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                        entitled
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {entitled ? <Play className="h-4 w-4 fill-current" /> : <Lock className="h-4 w-4" />}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {lecture.title}
                        </h3>
                      </div>

                      {lecture.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {lecture.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                          <Layers className="h-3 w-3" />
                          <span>{lecture.courseTitle}</span>
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {lecture.chapterTitle}
                        </span>
                        {lecture.courseInstructor && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <User className="h-3 w-3" />
                            <span>{lecture.courseInstructor}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 sm:pl-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        entitled
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {entitled ? t('catalog.entitled', 'Đã Cấp Quyền') : t('catalog.not_entitled', 'Chưa cấp quyền')}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLectureAction(lecture);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer ${
                        entitled
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-amber-500 hover:bg-amber-600'
                      }`}
                    >
                      {entitled ? (
                        <>
                          <Play className="h-3.5 w-3.5 fill-white" />
                          <span>{t('subject_lectures.watch_lecture', 'Xem bài giảng')}</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>{currentLang === 'en' ? 'Enroll Course' : 'Đăng Ký Khóa'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. MODAL ĐĂNG KÝ KHÓA HỌC & THANH TOÁN */}
      {Boolean(blockedModalCourse) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-amber-500">
                <Lock className="h-5 w-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {enrollmentPaymentInfo
                    ? currentLang === 'en'
                      ? 'Course Payment Information'
                      : 'Thông Tin Thanh Toán Khóa Học'
                    : t('catalog.modal_denied_title')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBlockedModalCourse(null);
                  setEnrollmentPaymentInfo(null);
                  setEnrollmentError(null);
                }}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs flex items-center justify-between gap-2">
              <div>
                <div className="font-bold text-amber-800 dark:text-amber-200">
                  {blockedModalCourse?.Title || blockedModalCourse?.title}
                </div>
                <small className="text-amber-700/70 font-mono">ID: {blockedModalCourse?.ID}</small>
              </div>
              <div className="text-right shrink-0">
                <span className="block text-[10px] text-amber-700/70 uppercase">Học phí</span>
                <span className="font-extrabold text-sm text-blue-600 dark:text-blue-400">
                  {blockedModalCourse?.Price === 0
                    ? t('catalog.free')
                    : `${blockedModalCourse?.Price?.toLocaleString('vi-VN')} đ`}
                </span>
              </div>
            </div>

            {enrollmentError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300">
                {enrollmentError}
              </div>
            )}

            {enrollmentPaymentInfo ? (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold mb-0.5">{enrollmentPaymentInfo.message}</div>
                    <p className="text-[11px] opacity-90">
                      Vui lòng hoàn tất thanh toán theo thông tin bên dưới để kích hoạt quyền học tập.
                    </p>
                  </div>
                </div>

                {enrollmentPaymentInfo.qrCode && (
                  <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <img
                      src={enrollmentPaymentInfo.qrCode}
                      alt="QR Thanh Toán"
                      className="max-w-[200px] rounded-xl shadow-xs mb-2"
                    />
                    <span className="text-[11px] text-slate-500">Quét mã QR để thanh toán</span>
                  </div>
                )}

                {enrollmentPaymentInfo.raw &&
                  typeof enrollmentPaymentInfo.raw === 'object' && (
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-1.5">
                      {Object.entries(enrollmentPaymentInfo.raw)
                        .filter(
                          ([key, val]) =>
                            val !== null &&
                            val !== undefined &&
                            typeof val !== 'object' &&
                            !['qrCode', 'qrDataURL', 'qrUrl', 'qrImage', 'paymentUrl', 'checkoutUrl'].includes(key)
                        )
                        .map(([key, val]) => (
                          <div key={key} className="flex justify-between gap-2 text-xs">
                            <span className="text-slate-500 capitalize">{key}:</span>
                            <span className="font-semibold text-slate-900 dark:text-white break-all text-right">
                              {String(val)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                {enrollmentPaymentInfo.paymentUrl && (
                  <a
                    href={enrollmentPaymentInfo.paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white no-underline shadow-xs"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Mở Trang Cổng Thanh Toán</span>
                  </a>
                )}
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t('catalog.modal_denied_desc')}
                </p>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>{t('catalog.modal_denied_policy')}</span>
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setBlockedModalCourse(null);
                  setEnrollmentPaymentInfo(null);
                  setEnrollmentError(null);
                }}
                className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t('common.close')}
              </button>

              {isAuthenticated ? (
                enrollmentPaymentInfo ? (
                  <button
                    type="button"
                    disabled={isEnrolling}
                    onClick={() => handleVerifyEnrollment(blockedModalCourse?.ID)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-5 py-1.5 text-xs font-semibold text-white shadow-xs cursor-pointer"
                  >
                    {isEnrolling ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span>Kiểm Tra Quyền & Vào Học</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isEnrolling}
                    onClick={() => handleEnrollCourse(blockedModalCourse)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-1.5 text-xs font-semibold text-white shadow-xs cursor-pointer"
                  >
                    {isEnrolling ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    <span>
                      {isEnrolling
                        ? 'Đang tạo thanh toán...'
                        : currentLang === 'en'
                        ? 'Enroll & Pay Now'
                        : 'Đăng Ký Khóa Học'}
                    </span>
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setBlockedModalCourse(null);
                    navigate(`/${currentLang}/login`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-1.5 text-xs font-semibold text-white shadow-xs cursor-pointer"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{t('common.login')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL TẠO KHÓA HỌC MỚI TRONG MÔN HỌC */}
      <CreateCourseModal
        show={showCreateCourseModal}
        onHide={() => setShowCreateCourseModal(false)}
        defaultSubjectId={subjectId}
        onCourseCreated={() => {
          loadData();
        }}
      />
    </div>
  );
}
