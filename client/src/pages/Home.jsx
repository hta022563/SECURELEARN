import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Lock,
  Play,
  GraduationCap,
  Film,
  User,
  Users,
  ShieldCheck,
  BookOpen,
  Layers,
  Clock,
  Award,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  X,
  Info,
  CreditCard,
  Loader2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Mail,
  PlayCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  checkCourseAccess,
  getEntitledCourseIds,
  fetchMyEnrollments,
  enrollInCourse,
} from '../services/entitlementService';
import { getCourses } from '../services/courseService';

const TESTIMONIALS_VI = [
  {
    quote:
      'Cách sắp xếp khóa học theo từng môn học và chương bài trên SecureLearn cực kỳ rõ ràng. Mình dễ dàng tìm đúng môn cần ôn tập, xem lại từng bài giảng ngắn gọn và lưu ghi chú ngay bên dưới video.',
    name: 'Nguyễn Minh Quân',
    role: 'Sinh viên Kỹ thuật Phần mềm',
    initials: 'MQ',
  },
  {
    quote:
      'Giao diện học tập gọn gàng, tập trung và phát video rất mượt. Các khóa học được chia lộ trình từ cơ bản đến nâng cao giúp mình hoàn thành dự án môn học nhanh hơn rất nhiều.',
    name: 'Trần Thảo Vy',
    role: 'Học viên Phát triển Web',
    initials: 'TV',
  },
  {
    quote:
      'Điểm mình thích nhất là có thể lọc nhanh theo môn học, xem trước cấu trúc chương bài và chủ động học lại bất kỳ lúc nào. Rất phù hợp cho sinh viên đại học tự học thêm.',
    name: 'Lê Hoàng Nam',
    role: 'Sinh viên Khoa học Máy tính',
    initials: 'HN',
  },
];

const TESTIMONIALS_EN = [
  {
    quote:
      'Organizing courses by subject and structured chapters makes SecureLearn super intuitive. I can quickly filter the exact subject I need, follow concise video lectures, and keep notes right alongside each lesson.',
    name: 'Minh Quan Nguyen',
    role: 'Software Engineering Student',
    initials: 'MQ',
  },
  {
    quote:
      'The learning workspace is clean, focused, and streams smoothly. Having a clear progression from fundamentals to practical projects helped me master new topics much faster.',
    name: 'Thao Vy Tran',
    role: 'Web Development Learner',
    initials: 'TV',
  },
  {
    quote:
      'I love being able to browse by subject, inspect the curriculum chapters upfront, and study at my own pace whenever my schedule allows.',
    name: 'Hoang Nam Le',
    role: 'Computer Science Student',
    initials: 'HN',
  },
];

const COURSE_GRADIENTS = [
  'from-blue-600 via-blue-700 to-indigo-800',
  'from-indigo-600 via-blue-700 to-cyan-700',
  'from-sky-600 via-blue-600 to-indigo-700',
  'from-blue-700 via-indigo-700 to-slate-800',
];

/**
 * =============================================================================
 * PAGE: Home (Landing Page theo bố cục Bean Scene — Giữ nguyên sắc thái SecureLearn)
 * =============================================================================
 */
export default function Home() {
  const { lang } = useParams();
  const currentLang = lang || 'vi';
  const isEn = currentLang === 'en';
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [coursesList, setCoursesList] = useState([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState(null);
  const [blockedModalCourse, setBlockedModalCourse] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentPaymentInfo, setEnrollmentPaymentInfo] = useState(null);
  const [enrollmentError, setEnrollmentError] = useState(null);

  // Testimonial carousel & newsletter state
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [subscribeEmail, setSubscribeEmail] = useState('');

  useEffect(() => {
    let isMounted = true;
    setIsLoadingCourses(true);
    getCourses()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setCoursesList(data);
        }
      })
      .catch((err) => console.warn('[Home] Lỗi nạp khóa học:', err))
      .finally(() => {
        if (isMounted) setIsLoadingCourses(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Đóng Modal thanh toán khi nhấn phím Escape
  useEffect(() => {
    if (!blockedModalCourse) return undefined;
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setBlockedModalCourse(null);
        setEnrollmentPaymentInfo(null);
        setEnrollmentError(null);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [blockedModalCourse]);

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

  const totalCourses = coursesList?.length || 0;
  const totalEnrollments = enrolledCourseIds?.length || 0;

  const entitledIds = useMemo(() => {
    return getEntitledCourseIds(user, coursesList, enrolledCourseIds);
  }, [user, coursesList, enrolledCourseIds]);

  // Hiển thị tối đa 4 khóa học nổi bật (khớp bố cục 4 cột của layout tham chiếu)
  const featuredCourses = useMemo(() => {
    return [...coursesList]
      .sort(
        (a, b) =>
          new Date(b['Creation Time'] || b.creationTime || b.createdAt || 0) -
          new Date(a['Creation Time'] || a.creationTime || a.createdAt || 0)
      )
      .slice(0, 4);
  }, [coursesList]);

  const testimonials = isEn ? TESTIMONIALS_EN : TESTIMONIALS_VI;
  const activeTestimonial = testimonials[testimonialIndex % testimonials.length];

  const handlePrevTestimonial = () => {
    setTestimonialIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleNextTestimonial = () => {
    setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    const cleaned = subscribeEmail.trim();
    if (!cleaned || !cleaned.includes('@')) {
      showToast(
        isEn ? 'Please enter a valid email address.' : 'Vui lòng nhập địa chỉ email hợp lệ.',
        'warning'
      );
      return;
    }
    setSubscribeEmail('');
    showToast(
      isEn
        ? `Subscribed ${cleaned} for new course updates!`
        : `Đã đăng ký nhận thông báo khóa học mới qua ${cleaned}!`,
      'success',
      isEn ? 'Subscribed' : 'Đăng Ký Thành Công'
    );
  };

  const handleCourseAction = (course) => {
    const cId = course.ID || course.id;
    const access = checkCourseAccess(user, cId, enrolledCourseIds);

    if (access.hasAccess) {
      if (user?.role === 'Instructor') {
        navigate(`/${currentLang}/instructor/preview/${cId}`);
      } else {
        navigate(`/${currentLang}/student/player/${cId}`);
      }
    } else {
      setEnrollmentPaymentInfo(null);
      setEnrollmentError(null);
      setBlockedModalCourse({
        ...course,
        ID: cId,
        reasonMessage: access.message,
      });
    }
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
        navigate(`/${currentLang}/student/player/${courseId}`);
        return;
      }

      setEnrollmentPaymentInfo(result);
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
        navigate(`/${currentLang}/student/player/${courseId}`);
      } else {
        setEnrollmentError(
          'Hệ thống chưa ghi nhận hoàn tất thanh toán. Vui lòng hoàn tất thanh toán rồi thử lại.'
        );
      }
    } catch (err) {
      setEnrollmentError(err?.message || 'Không thể kiểm tra trạng thái đăng ký.');
    } finally {
      setIsEnrolling(false);
    }
  };

  const valueCards = [
    {
      icon: BookOpen,
      title: isEn ? 'Organized by Subject' : 'Phân Loại Môn Học',
      desc: isEn
        ? 'Every course belongs to a clear subject so you can find the right lectures fast.'
        : 'Mỗi khóa học thuộc một môn học rõ ràng, giúp tìm và theo dõi bài giảng dễ dàng.',
    },
    {
      icon: Layers,
      title: isEn ? 'Structured Curriculum' : 'Giáo Trình Bài Bản',
      desc: isEn
        ? 'Lessons are organized into focused chapters with clear learning progression.'
        : 'Nội dung chia thành từng chương và bài học ngắn gọn, mạch lạc, dễ tiếp thu.',
    },
    {
      icon: Clock,
      title: isEn ? 'Learn Anytime' : 'Học Linh Hoạt 24/7',
      desc: isEn
        ? 'Study at your own pace with smooth playback and personal notes per lesson.'
        : 'Chủ động sắp xếp lịch học mọi lúc, xem lại bài giảng và lưu ghi chú cá nhân.',
    },
    {
      icon: Award,
      title: isEn ? 'Accessible Tuition' : 'Chi Phí Hợp Lý',
      desc: isEn
        ? 'High-quality courses designed to be practical and affordable for learners.'
        : 'Nhiều khóa học chất lượng với học phí tối ưu cho sinh viên và người đi làm.',
    },
  ];

  return (
    <div className="relative overflow-x-clip">
      {/* =====================================================================
       * 1. HERO BANNER (DEEP BLUE STAGE + FRAMED BRIGHT LEARNING PHOTO)
       * ===================================================================== */}
      <section className="relative bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white overflow-hidden">
        {/* Soft ambient glows */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-8 h-[28rem] w-[28rem] rounded-full bg-cyan-500/15 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #93c5fd 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-22 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Editorial Content */}
            <div className="lg:col-span-6 space-y-6">
              <p className="text-sm sm:text-base font-medium text-blue-200/90 tracking-wide">
                {isEn
                  ? "We've got your learning journey covered with"
                  : 'Đồng hành cùng hành trình chinh phục tri thức với'}
              </p>

              <h1 className="text-5xl sm:text-6xl lg:text-[4.25rem] font-black tracking-tight leading-[1.06] text-white">
                Secure
                <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                  Learn
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                {isEn
                  ? 'It is best to build your future with structured courses. Explore subjects, watch clear chapter-by-chapter video lectures, and grow your skills every single day.'
                  : 'Nền tảng học trực tuyến giúp bạn tiếp cận kho môn học phong phú, theo dõi bài giảng chia theo từng chương mạch lạc và nâng cao kỹ năng chuyên môn mỗi ngày.'}
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                {!isAuthenticated ? (
                  <>
                    <Link
                      to={`/${currentLang}/catalog`}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/25 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-950/40 hover:shadow-blue-600/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 no-underline"
                    >
                      <span>{t('common.explore_courses')}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/${currentLang}/register`}
                      className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 hover:bg-white/15 backdrop-blur-sm px-6 py-3.5 text-sm font-semibold text-white transition-all no-underline"
                    >
                      {t('common.register')}
                    </Link>
                  </>
                ) : (
                  <>
                    {user?.role === 'Student' && (
                      <Link
                        to={`/${currentLang}/student/courses`}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/25 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-950/40 hover:shadow-blue-600/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 no-underline"
                      >
                        <GraduationCap className="h-4 w-4" />
                        <span>{t('common.my_courses')}</span>
                      </Link>
                    )}
                    {user?.role === 'Instructor' && (
                      <Link
                        to={`/${currentLang}/instructor/videos`}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/25 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-950/40 hover:shadow-blue-600/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 no-underline"
                      >
                        <Film className="h-4 w-4" />
                        <span>{t('common.video_management')}</span>
                      </Link>
                    )}
                    {user?.role === 'Administrator' && (
                      <Link
                        to={`/${currentLang}/admin/alerts`}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/25 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-950/40 hover:shadow-blue-600/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 no-underline"
                      >
                        <span>{t('common.ai_dashboard')}</span>
                      </Link>
                    )}
                    <Link
                      to={`/${currentLang}/catalog`}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/15 backdrop-blur-sm px-6 py-3.5 text-sm font-semibold text-white transition-all no-underline"
                    >
                      <span>{t('common.explore_more')}</span>
                    </Link>
                  </>
                )}
              </div>

              {/* Minimalist horizontal stats strip */}
              <div className="pt-6 mt-2 border-t border-white/10 flex flex-wrap items-center gap-x-7 gap-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-400/20 text-blue-300">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-white leading-none tabular-nums">
                      {Number(totalCourses || 0).toLocaleString(isEn ? 'en-US' : 'vi-VN')}
                    </div>
                    <div className="text-[11px] font-medium text-blue-200/70 mt-1">
                      {isEn ? 'Courses' : 'Khóa học'}
                    </div>
                  </div>
                </div>

                <div className="hidden sm:block h-8 w-px bg-white/15" />

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-400/20 text-cyan-300">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-white leading-none tabular-nums">
                      {Number(totalEnrollments || 0).toLocaleString(isEn ? 'en-US' : 'vi-VN')}
                    </div>
                    <div className="text-[11px] font-medium text-blue-200/70 mt-1">
                      {isEn ? 'Students' : 'Học viên'}
                    </div>
                  </div>
                </div>

                <div className="hidden sm:block h-8 w-px bg-white/15" />

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-400/20 text-indigo-300">
                    <PlayCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-white leading-none">
                      24/7
                    </div>
                    <div className="text-[11px] font-medium text-blue-200/70 mt-1">
                      {isEn ? 'Online Access' : 'Học trực tuyến'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Framed Editorial Learning Photo */}
            <div className="lg:col-span-6">
              <div className="relative mx-auto max-w-xl">
                {/* Soft blue halo behind photo */}
                <div className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-tr from-blue-500/25 via-indigo-500/15 to-cyan-400/25 blur-2xl" />

                <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl shadow-slate-950/70 ring-1 ring-blue-400/20">
                  <div className="aspect-[16/10] w-full overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=85"
                      alt={isEn ? 'Students learning online on SecureLearn' : 'Học viên học tập trực tuyến trên SecureLearn'}
                      className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-[1.03]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
       * 2. DISCOVER SECTION (SPLIT 2-COL STORY — "DISCOVER THE BEST...")
       * ===================================================================== */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                {isEn ? (
                  <>
                    Discover the best{' '}
                    <span className="text-blue-600 dark:text-blue-400">learning experience</span>
                  </>
                ) : (
                  <>
                    Khám phá trải nghiệm{' '}
                    <span className="text-blue-600 dark:text-blue-400">học tập tốt nhất</span>
                  </>
                )}
              </h2>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {isEn
                  ? 'SecureLearn brings together structured subjects and practical courses designed to boost your knowledge and career readiness. Browse by subject, dive into well-organized chapters, and master complex topics at your own pace.'
                  : 'SecureLearn mang đến hệ thống môn học và khóa học trực tuyến được xây dựng bài bản, giúp bạn hệ thống hóa kiến thức nhanh chóng. Dễ dàng lọc đúng môn học, theo dõi tiến trình từng chương và chủ động học mọi lúc.'}
              </p>

              <div className="pt-2">
                <Link
                  to={`/${currentLang}/catalog`}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-7 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:-translate-y-0.5 transition-all no-underline"
                >
                  <span>{isEn ? 'Learn More' : 'Tìm Hiểu Thêm'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Right Stylized Learning Visual */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="relative w-full max-w-lg">
                <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-tr from-blue-500/15 via-cyan-400/10 to-indigo-500/15 blur-2xl pointer-events-none" />
                <div className="relative rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-6 sm:p-7 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          {isEn ? 'Structured Path' : 'Lộ Trình Chuẩn Hóa'}
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {isEn ? 'Subject → Course → Chapters' : 'Môn Học → Khóa Học → Chương Bài'}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 px-3 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                      {totalCourses} {isEn ? 'Courses' : 'Khóa học'}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        step: '01',
                        title: isEn ? 'Choose Your Subject' : 'Chọn đúng Môn học',
                        sub: isEn
                          ? 'Filter catalog by subject in one click'
                          : 'Lọc nhanh kho khóa học theo từng môn học cụ thể',
                      },
                      {
                        step: '02',
                        title: isEn ? 'Follow Chapter-by-Chapter' : 'Học theo từng Chương bài',
                        sub: isEn
                          ? 'Concise video lessons with personal notes'
                          : 'Video bài giảng rõ nét kèm khung ghi chú cá nhân',
                      },
                      {
                        step: '03',
                        title: isEn ? 'Track Your Progress' : 'Theo dõi tiến độ học tập',
                        sub: isEn
                          ? 'Mark completed lessons and pick up anytime'
                          : 'Đánh dấu hoàn thành bài giảng và ôn tập linh hoạt',
                      },
                    ].map((row) => (
                      <div
                        key={row.step}
                        className="flex items-center gap-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3.5"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/80 text-xs font-black text-blue-700 dark:text-blue-300">
                          {row.step}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {row.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {row.sub}
                          </div>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
       * 3. FEATURED COURSES GRID (4-CARD FORMAT WITH OVERLAPPING PILL BUTTON)
       * ===================================================================== */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
              {isEn ? 'Explore Our Featured Courses' : 'Khám Phá Các Khóa Học Nổi Bật'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {isEn
                ? 'Explore all subjects and structured courses on SecureLearn. There is always a new skill worth mastering.'
                : 'Chọn khóa học phù hợp từ danh sách các khóa học mới nhất và bắt đầu hành trình học tập của bạn ngay hôm nay.'}
            </p>
          </div>

          {isLoadingCourses ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-6" aria-busy="true">
              {[0, 1, 2, 3].map((sk) => (
                <div
                  key={sk}
                  className="rounded-3xl border border-blue-100/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm animate-pulse"
                >
                  <div className="h-40 bg-slate-200/80 dark:bg-slate-800" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-800 mx-auto" />
                    <div className="h-3 w-full rounded-lg bg-slate-100 dark:bg-slate-800/70" />
                    <div className="h-3 w-2/3 rounded-lg bg-slate-100 dark:bg-slate-800/70 mx-auto" />
                    <div className="h-5 w-1/3 rounded-lg bg-slate-200 dark:bg-slate-800 mx-auto pt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredCourses.length === 0 ? (
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center shadow-sm">
              <GraduationCap className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <h4 className="font-bold text-slate-900 dark:text-white text-lg mb-1">
                {t('home.no_courses_title')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {t('home.no_courses_desc')}
              </p>
              {isAuthenticated && user?.role === 'Instructor' && (
                <button
                  type="button"
                  onClick={() => navigate(`/${currentLang}/instructor/upload`)}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-blue-700 transition-all cursor-pointer"
                >
                  {t('home.upload_course_now')}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 gap-y-12 pb-6">
              {featuredCourses.map((course, idx) => {
                const cId = course.ID || course.id;
                const title = course.Title || course.title || 'Khóa học';
                const desc = course.Description || course.description || '';
                const price = course.Price ?? course.price;
                const instructorName =
                  course.Instructor || course.instructor || course.Owner || course.owner;
                const isEntitled = entitledIds.some(
                  (id) => String(id).toLowerCase() === String(cId).toLowerCase()
                );
                const grad = COURSE_GRADIENTS[idx % COURSE_GRADIENTS.length];

                return (
                  <div
                    key={cId}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCourseAction(course)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCourseAction(course);
                      }
                    }}
                    className="group relative flex flex-col rounded-3xl border border-blue-100/90 dark:border-slate-800 bg-blue-50/35 dark:bg-slate-900 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  >
                    {/* Card Top Visual */}
                    <div
                      className={`relative h-40 rounded-t-3xl bg-gradient-to-br ${grad} p-5 flex flex-col justify-between overflow-hidden`}
                    >
                      <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-white/10 blur-xl" />
                      <div className="flex items-center justify-between relative z-10">
                        {isEntitled ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 backdrop-blur-sm border border-emerald-300/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-100">
                            <ShieldCheck className="h-3 w-3" />
                            <span>{t('home.entitled')}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                            <BookOpen className="h-3 w-3" />
                            <span>{isEn ? 'Course' : 'Khóa học'}</span>
                          </span>
                        )}
                      </div>

                      <div className="relative z-10 flex items-center justify-center my-auto">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white group-hover:scale-110 transition-transform">
                          <PlayCircle className="h-6 w-6" />
                        </div>
                      </div>
                    </div>

                    {/* Centered Card Body */}
                    <div className="flex flex-1 flex-col items-center text-center px-5 pt-5 pb-10">
                      <h3
                        className="text-base font-extrabold text-slate-900 dark:text-white line-clamp-1 mb-1.5"
                        title={title}
                      >
                        {title}
                      </h3>

                      {instructorName && (
                        <div className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-2">
                          <User className="h-3 w-3 text-blue-500" />
                          <span className="truncate max-w-[180px]">{instructorName}</span>
                        </div>
                      )}

                      {desc && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                          {desc}
                        </p>
                      )}

                      <div className="mt-auto text-base font-black text-blue-600 dark:text-blue-400">
                        {price === 0
                          ? t('home.free')
                          : `${price?.toLocaleString(isEn ? 'en-US' : 'vi-VN') ?? '?'} ${isEn ? 'VND' : 'đ'
                          }`}
                      </div>
                    </div>

                    {/* Overlapping Pill CTA Button at bottom edge */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCourseAction(course);
                      }}
                      className={`absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold text-white shadow-lg transition-all cursor-pointer ${isEntitled
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                        : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/30'
                        }`}
                    >
                      {isEntitled ? (
                        <>
                          <Play className="h-3 w-3 fill-current" />
                          <span>{t('home.start_learning')}</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-3 w-3" />
                          <span>{isEn ? 'Enroll Now' : 'Đăng Ký Ngay'}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {coursesList.length > 0 && (
            <div className="text-center mt-8">
              <Link
                to={`/${currentLang}/catalog`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 shadow-xs transition-all no-underline"
              >
                <span>
                  {t('home.view_all')} ({coursesList.length})
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
       * 4. WHY ARE WE DIFFERENT? (4 VALUE CARDS + CENTERED JOIN CTA)
       * ===================================================================== */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              {isEn ? 'Why are we different?' : 'Điều Gì Làm Nên Sự Khác Biệt?'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isEn
                ? "We don't just deliver lectures, we make your learning journey clear and effective."
                : 'Không chỉ là bài giảng trực tuyến — SecureLearn xây dựng lộ trình giúp bạn làm chủ kiến thức.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {valueCards.map((card, idx) => {
              const CardIcon = card.icon;
              return (
                <div
                  key={idx}
                  className="rounded-3xl border border-blue-100/90 dark:border-slate-800 bg-blue-50/40 dark:bg-slate-900/90 hover:bg-blue-50/90 dark:hover:bg-blue-950/30 p-7 text-center transition-all duration-200 hover:-translate-y-1 shadow-xs hover:shadow-md"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100/80 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
                    <CardIcon className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-2">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="text-center space-y-2">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isEn
                ? 'Great achievements start with the right course. Let us help you get there.'
                : 'Thành công lớn luôn bắt đầu từ một khóa học phù hợp.'}
            </p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white pb-2">
              {isEn ? 'Get started today.' : 'Bắt đầu ngay hôm nay.'}
            </h3>
            <Link
              to={isAuthenticated ? `/${currentLang}/catalog` : `/${currentLang}/register`}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-8 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:-translate-y-0.5 transition-all no-underline"
            >
              <span>{isAuthenticated ? t('common.explore_courses') : isEn ? 'Join Us' : 'Tham Gia Ngay'}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================================
       * 5. FULL-WIDTH HIGHLIGHT BANNER ("GET A CHANCE TO HAVE AN AMAZING...")
       * ===================================================================== */}
      <section className="relative bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white overflow-hidden my-6">
        <div className="pointer-events-none absolute -right-20 top-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="pointer-events-none absolute left-1/4 -top-24 h-72 w-72 rounded-full bg-blue-400/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
                {isEn
                  ? 'Get a chance to elevate your skills every day'
                  : 'Nâng tầm kỹ năng mỗi ngày cùng SecureLearn'}
              </h2>
              <p className="text-sm sm:text-base text-blue-100/85 max-w-xl leading-relaxed">
                {isEn
                  ? 'We give you a one-stop workspace to explore subjects, follow structured video lessons, and stay consistent with your learning goals.'
                  : 'Trải nghiệm không gian học tập trực quan: chọn môn học yêu thích, xem bài giảng sắc nét theo từng chương và lưu ghi chú riêng cho từng buổi học.'}
              </p>
              <div className="pt-2">
                <Link
                  to={`/${currentLang}/catalog`}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/25 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/40 hover:shadow-blue-600/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 no-underline"
                >
                  <span>{isEn ? 'Start Learning' : 'Khám Phá Ngay'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Right Floating Glass Visual */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/20 px-3 py-1 text-[11px] font-bold text-cyan-200">
                    <PlayCircle className="h-3.5 w-3.5" />
                    <span>{isEn ? 'Learning Studio' : 'Không Gian Học Tập'}</span>
                  </span>
                  <span className="text-xs font-mono text-blue-200/80">HD 1080p</span>
                </div>

                <div className="rounded-2xl bg-slate-950/60 border border-white/10 p-5 text-center space-y-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/40">
                    <Play className="h-6 w-6 fill-white ml-0.5" />
                  </div>
                  <div className="text-sm font-bold text-white">
                    {featuredCourses[0]?.Title ||
                      featuredCourses[0]?.title ||
                      (isEn ? 'Featured Video Lecture' : 'Bài Giảng Video Chất Lượng Cao')}
                  </div>
                  <div className="text-[11px] text-blue-200/75">
                    {isEn ? 'Clear chapters • Personal notes' : 'Chia chương rõ ràng • Ghi chú tiện lợi'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-blue-100/90">
                    <span>{isEn ? 'Structured Modules' : 'Hệ thống môn học'}</span>
                    <span className="font-bold">{totalCourses} {isEn ? 'courses' : 'khóa học'}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/15 overflow-hidden">
                    <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-blue-400 to-cyan-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
       * 6. TESTIMONIALS CAROUSEL ("OUR ... PERFECTION FEEDBACK")
       * ===================================================================== */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              {isEn ? 'Our Learners Feedback' : 'Cảm Nhận Từ Học Viên'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isEn
                ? 'Our students have amazing things to say about learning with SecureLearn'
                : 'Những chia sẻ thực tế từ học viên đang đồng hành cùng SecureLearn'}
            </p>
          </div>

          <div className="relative mx-auto max-w-3xl pb-10">
            <div className="relative rounded-3xl border border-blue-100 dark:border-slate-800 bg-blue-50/40 dark:bg-slate-900 px-8 sm:px-16 pt-12 pb-16 text-center shadow-sm">
              {/* Opening quote accent */}
              <div
                aria-hidden="true"
                className="select-none pointer-events-none absolute top-4 left-6 sm:left-10 text-6xl sm:text-7xl font-serif font-black leading-none text-blue-600/20 dark:text-blue-400/20"
              >
                &ldquo;
              </div>

              <p className="relative z-10 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-7">
                {activeTestimonial.quote}
              </p>

              <div className="relative z-10">
                <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {activeTestimonial.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeTestimonial.role}
                </p>
              </div>

              {/* Left Prev Button */}
              <button
                type="button"
                onClick={handlePrevTestimonial}
                aria-label="Previous feedback"
                className="absolute left-2 sm:-left-5 top-1/2 -translate-y-1/2 flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>

              {/* Right Next Button */}
              <button
                type="button"
                onClick={handleNextTestimonial}
                aria-label="Next feedback"
                className="absolute right-2 sm:-right-5 top-1/2 -translate-y-1/2 flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>

              {/* Overlapping Avatar at Bottom Center */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white text-lg font-extrabold shadow-lg ring-4 ring-white dark:ring-slate-950">
                {activeTestimonial.initials}
              </div>
            </div>

            {/* Pagination Dots */}
            <div className="mt-12 flex items-center justify-center gap-2">
              {testimonials.map((item, idx) => {
                const isCurrent = idx === testimonialIndex % testimonials.length;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setTestimonialIndex(idx)}
                    aria-label={`Feedback ${idx + 1}`}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      isCurrent
                        ? 'w-7 bg-blue-600 dark:bg-blue-400'
                        : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
       * 7. NEWSLETTER BANNER ("SUBSCRIBE TO GET THE LATEST NEWS")
       * ===================================================================== */}
      <section className="relative bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.18),transparent_65%)]" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2 text-white">
            {isEn ? 'Subscribe to get the Latest News' : 'Đăng Ký Nhận Thông Báo Khóa Học Mới'}
          </h2>
          <p className="text-xs sm:text-sm text-blue-200/80 max-w-lg mx-auto mb-8">
            {isEn
              ? "Don't miss out on our latest courses, subject updates, and learning tips."
              : 'Đừng bỏ lỡ các môn học mới, bài giảng cập nhật và thông tin ưu đãi từ SecureLearn.'}
          </p>

          <form
            onSubmit={handleSubscribe}
            className="mx-auto max-w-lg flex flex-col sm:flex-row items-stretch rounded-2xl sm:rounded-full bg-white/10 p-1.5 backdrop-blur-md border border-white/15 shadow-xl gap-2 sm:gap-0"
          >
            <div className="relative flex-1 flex items-center">
              <Mail className="h-4 w-4 text-blue-200/70 absolute left-4 pointer-events-none" />
              <input
                type="email"
                aria-label={isEn ? 'Email address' : 'Địa chỉ email'}
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                placeholder={isEn ? 'Enter your email...' : 'Nhập địa chỉ email của bạn...'}
                className="w-full bg-transparent pl-10 pr-4 py-2.5 text-base sm:text-sm text-white placeholder-blue-200/60 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl sm:rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/25 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-blue-600/30 active:scale-[0.98] transition-all duration-200 cursor-pointer shrink-0"
            >
              {isEn ? 'Subscribe' : 'Đăng Ký'}
            </button>
          </form>
        </div>
      </section>

      {/* =====================================================================
       * MODAL ĐĂNG KÝ KHÓA HỌC & THÔNG TIN THANH TOÁN (/api/v1/enrollment/{id})
       * ===================================================================== */}
      {Boolean(blockedModalCourse) && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setBlockedModalCourse(null);
            setEnrollmentPaymentInfo(null);
            setEnrollmentError(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-amber-500">
                <Lock className="h-5 w-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {enrollmentPaymentInfo
                    ? 'Thông Tin Thanh Toán Khóa Học'
                    : 'Chưa Đăng Ký Khóa Học'}
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

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs flex items-center justify-between gap-2">
              <div>
                <div className="font-bold text-amber-800 dark:text-amber-200">
                  {blockedModalCourse?.Title || blockedModalCourse?.title}
                </div>
                <small className="text-amber-700/70 font-mono">
                  Mã khóa học: {blockedModalCourse?.ID}
                </small>
              </div>
              {blockedModalCourse?.Price != null && (
                <div className="text-right shrink-0">
                  <span className="block text-[10px] text-amber-700/70 uppercase">Học phí</span>
                  <span className="font-extrabold text-sm text-blue-600 dark:text-blue-400">
                    {blockedModalCourse.Price === 0
                      ? 'Miễn phí'
                      : `${blockedModalCourse.Price.toLocaleString('vi-VN')} đ`}
                  </span>
                </div>
              )}
            </div>

            {enrollmentError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300">
                {enrollmentError}
              </div>
            )}

            {enrollmentPaymentInfo ? (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200">
                  <div className="font-bold mb-0.5">{enrollmentPaymentInfo.message}</div>
                  <p className="text-[11px] opacity-90">
                    Vui lòng hoàn tất thanh toán theo thông tin bên dưới để kích hoạt quyền học tập.
                  </p>
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

                {enrollmentPaymentInfo.raw && typeof enrollmentPaymentInfo.raw === 'object' && (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-1.5">
                    {Object.entries(enrollmentPaymentInfo.raw)
                      .filter(
                        ([key, val]) =>
                          val !== null &&
                          val !== undefined &&
                          typeof val !== 'object' &&
                          ![
                            'qrCode',
                            'qrDataURL',
                            'qrUrl',
                            'qrImage',
                            'paymentUrl',
                            'checkoutUrl',
                          ].includes(key)
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
                  Tài khoản của bạn hiện <strong>chưa đăng ký khóa học</strong> này.
                </p>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>
                    Đăng ký khóa học để kích hoạt quyền truy cập và xem toàn bộ chương bài giảng.
                  </span>
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
                className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                Đóng
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
                    <span>{isEnrolling ? 'Đang tạo thanh toán...' : 'Đăng Ký Khóa Học'}</span>
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setBlockedModalCourse(null);
                    navigate(`/${currentLang}/login`);
                  }}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-1.5 text-xs font-semibold text-white shadow-xs cursor-pointer"
                >
                  Đăng Nhập
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
