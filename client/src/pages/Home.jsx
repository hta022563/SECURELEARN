import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Lock,
  Play,
  PlayCircle,
  GraduationCap,
  Film,
  Calendar,
  User,
  ShieldCheck,
  Fingerprint,
  Cpu,
  Cloud,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { checkCourseAccess, getEntitledCourseIds } from '../services/entitlementService';
import { getCourses } from '../services/courseService';
import LearningTimeline from '../components/LearningTimeline';
import HeroStatsCard from '../components/home/HeroStatsCard';

// Danh sách câu hỏi thường gặp về SecureLearn (Bản quyền số, DRM, Mã hóa HLS & Hệ thống AI)
const FAQ_ITEMS = [
  {
    question: 'Khóa học tại SecureLearn được bảo vệ bản quyền như thế nào?',
    answer: 'Toàn bộ video bài giảng tại SecureLearn được mã hóa phân đoạn theo chuẩn HLS AES-128. Mỗi phân đoạn đều yêu cầu khóa giải mã bí mật được cấp phát theo phiên (session) hợp lệ, kết hợp với chữ ký số Signed URL ngăn chặn hoàn toàn việc tải trộm hay trích xuất qua DevTools và tiện ích mở rộng trình duyệt.',
  },
  {
    question: 'Watermark động hiển thị trên màn hình video có tác dụng gì?',
    answer: 'Trong suốt quá trình phát video, hệ thống tự động hiển thị mờ mã định danh cá nhân (StudentID / Timestamp) chuyển động ngẫu nhiên trên màn hình phát. Nếu có hành vi quay lén màn hình để phát tán ra ngoài, hệ thống sẽ truy vết chính xác nguồn gốc tài khoản để xử lý vi phạm bản quyền.',
  },
  {
    question: 'Tôi có thể tải video về máy để xem khi không có mạng (offline) không?',
    answer: 'Để bảo vệ an toàn tuyệt đối tài sản trí tuệ và quyền tác giả của Giảng viên, video bài giảng chỉ có thể phát trực tuyến bảo mật trên nền tảng SecureLearn thông qua trình phát DRM chuyên dụng. Nền tảng được tối ưu hóa qua Cloudflare R2 CDN giúp bạn xem mượt mà với độ trễ thấp ngay cả khi kết nối mạng không ổn định.',
  },
  {
    question: 'Hệ thống AI Anomaly Detection (Isolation Forest) hoạt động ra sao?',
    answer: 'Thuật toán Machine Learning Isolation Forest liên tục phân tích nhật ký truy cập (Access Log) theo thời gian thực nhằm phát hiện các hành vi bất thường như: chia sẻ tài khoản, đăng nhập đồng thời từ nhiều địa chỉ IP khác nhau, hoặc tua bài giảng bất thường. Khi phát hiện rủi ro, hệ thống sẽ lập tức cảnh báo và kích hoạt biện pháp bảo vệ tài khoản của bạn.',
  },
  {
    question: 'Làm thế nào để được cấp quyền xem một khóa học sau khi đăng ký?',
    answer: 'Khi bạn đăng ký khóa học thành công, hệ thống quản trị sẽ kích hoạt quyền truy cập (Entitlement) tương ứng cho tài khoản. Bạn chỉ cần điều hướng đến mục "Khóa học của tôi" là có thể truy cập ngay vào toàn bộ các chương và video bài giảng có bản quyền.',
  },
  {
    question: 'Giảng viên có thể đăng tải và quản lý khóa học bảo mật trên SecureLearn như thế nào?',
    answer: 'Giảng viên có Studio quản lý riêng để tải lên bài giảng. Hệ thống tự động mã hóa và lưu trữ an toàn trên hạ tầng Cloudflare R2, đồng thời cung cấp công cụ xem trước (Preview) nội dung và theo dõi số lượng học viên ghi danh theo thời gian thực.',
  },
  {
    question: 'Sau khi hoàn thành khóa học, tôi có nhận được chứng chỉ xác thực không?',
    answer: 'Có. Khi hoàn thành 100% thời lượng bài giảng và các đồ án thực chiến, học viên sẽ được cấp Chứng nhận số kèm mã định danh duy nhất. Nhà tuyển dụng và doanh nghiệp có thể tra cứu và xác thực tính hợp lệ của chứng chỉ trực tiếp trên cổng thông tin SecureLearn.',
  },
];

const FAQ_ITEMS_EN = [
  {
    question: 'How are courses at SecureLearn protected against piracy?',
    answer: 'All video lectures at SecureLearn are encrypted segment by segment according to the HLS AES-128 standard. Each segment requires a secret decryption key issued on a valid session, combined with a Signed URL preventing downloading via DevTools and browser extensions.',
  },
  {
    question: 'What is the purpose of the dynamic watermark on the video screen?',
    answer: 'During video playback, the system automatically displays a faint personal identifier (StudentID / Timestamp) moving randomly on the screen. If screen recording occurs, the system accurately traces the source account to address copyright violations.',
  },
  {
    question: 'Can I download videos to watch offline?',
    answer: 'To protect intellectual property and instructor copyrights, video lectures can only be streamed securely on the SecureLearn platform through our dedicated DRM player. Cloudflare R2 CDN optimization ensures low-latency playback even with unstable networks.',
  },
  {
    question: 'How does the AI Anomaly Detection (Isolation Forest) system work?',
    answer: 'The Isolation Forest Machine Learning algorithm continuously analyzes access logs in real time to detect anomalies such as account sharing, simultaneous logins from multiple IPs, or suspicious skipping. When a risk is detected, the system immediately alerts and activates account protection.',
  },
  {
    question: 'How do I get access to a course after enrolling?',
    answer: 'Once enrolled successfully, administrators activate the corresponding Entitlement for your account. You can then navigate to "My Courses" to access all copyrighted chapters and video lectures.',
  },
  {
    question: 'How can instructors publish and manage secure courses on SecureLearn?',
    answer: 'Instructors have a dedicated Studio to upload lectures. The system automatically encrypts and stores files safely on Cloudflare R2, providing content preview tools and real-time student enrollment tracking.',
  },
  {
    question: 'Will I receive a verified certificate upon course completion?',
    answer: 'Yes. Upon completing 100% of the lectures and practical projects, students are issued a digital Certificate with a unique identifier that employers can verify directly on SecureLearn.',
  },
];

/**
 * =============================================================================
 * PAGE: Home (Trang Chủ - 100% Dữ Liệu Mềm)
 * =============================================================================
 */
export default function Home() {
  const { lang } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [coursesList, setCoursesList] = useState([]);
  const [blockedModalCourse, setBlockedModalCourse] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [showAllFaq, setShowAllFaq] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getCourses()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setCoursesList(data);
        }
      })
      .catch((err) => console.warn('[Home] Lỗi nạp khóa học:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  // Thống kê động (100% dữ liệu thực từ Backend)
  const totalCourses = coursesList?.length || 0;
  // Entitlement/enrollment data is not available from the backend yet.
  const totalEnrollments = 0;

  // Lọc số câu hỏi hiển thị (hỗ trợ đa ngôn ngữ vi/en)
  const faqList = lang === 'en' ? FAQ_ITEMS_EN : FAQ_ITEMS;
  const visibleFaqs = showAllFaq ? faqList : faqList.slice(0, 5);

  // Danh sách ID các khóa học đã được cấp quyền cho người dùng hiện tại
  const entitledIds = useMemo(() => {
    return getEntitledCourseIds(user, coursesList);
  }, [user, coursesList]);

  // Chỉ hiển thị 3 khóa học mới nhất — sắp xếp mềm theo "Creation Time" giảm dần
  const latestCourses = useMemo(() => {
    return [...coursesList]
      .sort((a, b) => new Date(b["Creation Time"] || b.createdAt || 0) - new Date(a["Creation Time"] || a.createdAt || 0))
      .slice(0, 3);
  }, [coursesList]);

  const handleCourseAction = (course) => {
    const cId = course.ID || course.id;
    const access = checkCourseAccess(user, cId);

    if (access.hasAccess) {
      if (user?.role === 'Instructor') {
        navigate(`/${lang}/instructor/preview/${cId}`);
      } else {
        navigate(`/${lang}/student/player/${cId}`);
      }
    } else {
      setBlockedModalCourse({
        ...course,
        ID: cId,
        reasonMessage: access.message,
      });
    }
  };

  return (
    <div className="relative py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        {/* =====================================================================
         * 1. HERO SECTION (SECURELEARN EXCLUSIVE - BẢN QUYỀN SỐ & E-LEARNING)
         * ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-16 pb-6">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-semibold mb-4 shadow-xs">
              <span>{t('home.hero_badge')}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4 leading-tight">
              {t('home.hero_title')}
              <span className="text-blue-600 dark:text-blue-400">{t('home.hero_title_highlight')}</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-8 max-w-2xl leading-relaxed">
              {t('home.hero_desc')}
            </p>

            <div className="flex flex-wrap items-center gap-3.5">
              {!isAuthenticated ? (
                <>
                  <Link
                    to={`/${lang}/register`}
                    className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200 no-underline"
                  >
                    {t('common.register')}
                  </Link>
                  <Link
                    to={`/${lang}/catalog`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm border border-slate-200 dark:border-slate-700 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5 transition-all duration-200 no-underline"
                  >
                    <span>{t('common.explore_courses')}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              ) : (
                <>
                  {user?.role === 'Student' && (
                    <Link
                      to={`/${lang}/student/courses`}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200 no-underline"
                    >
                      <GraduationCap className="h-4 w-4" />
                      <span>{t('common.my_courses')}</span>
                    </Link>
                  )}
                  {user?.role === 'Instructor' && (
                    <Link
                      to={`/${lang}/instructor/videos`}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200 no-underline"
                    >
                      <Film className="h-4 w-4" />
                      <span>{t('common.video_management')}</span>
                    </Link>
                  )}
                  {user?.role === 'Administrator' && (
                    <Link
                      to={`/${lang}/admin/alerts`}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200 no-underline"
                    >
                      <span>{t('common.ai_dashboard')}</span>
                    </Link>
                  )}
                  <Link
                    to={`/${lang}/catalog`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm border border-slate-200 dark:border-slate-700 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5 transition-all duration-200 no-underline"
                  >
                    <span>{t('common.explore_more')}</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Cột phải: Thẻ Thống Kê Nền Tảng (Pure Tailwind CSS + Lucide Icons) */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <HeroStatsCard
              totalCourses={totalCourses}
              totalEnrollments={totalEnrollments}
              lang={lang}
            />
          </div>
        </div>

        {/* =====================================================================
         * LỘ TRÌNH HỌC TẬP TIMELINE
         * ===================================================================== */}
        <LearningTimeline />

        {/* =====================================================================
         * 2. SECTION: VIDEO & BÀI GIẢNG MỚI NHẤT (CHỈ HIỂN THỊ TOP 3 MỚI NHẤT)
         * ===================================================================== */}
        <section className="mb-16 pb-4">
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-3 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t('home.latest_videos')}
                <span className="text-blue-600 dark:text-blue-400">{t('home.latest_videos_highlight')}</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
                {t('home.latest_videos_desc')}
              </p>
            </div>

            <Link
              to={`/${lang}/catalog`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-all no-underline"
            >
              <span>
                {t('home.view_all')} ({coursesList.length})
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestCourses.length === 0 ? (
              <div className="col-span-full rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center shadow-sm">
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
                    onClick={() => navigate(`/${lang}/instructor/upload`)}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-blue-700 transition-all"
                  >
                    {t('home.upload_course_now')}
                  </button>
                )}
              </div>
            ) : (
              latestCourses.map((course) => {
                const cId = course.ID || course.id;
                const title = course.Title || course.title || 'Khóa học';
                const desc = course.Description || course.description || '';
                const price = course.Price ?? course.price;
                const instructorName = course.Instructor || course.instructor || course.Owner || course.owner;
                const isEntitled = entitledIds.includes(cId);

                return (
                  <div
                    key={cId}
                    onClick={() => handleCourseAction(course)}
                    className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  >
                    {/* Header Khóa học */}
                    <div
                      className={`p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col justify-between ${
                        isEntitled ? 'bg-blue-50/70 dark:bg-blue-950/40' : 'bg-slate-50/70 dark:bg-slate-800/40'
                      }`}
                      style={{ minHeight: '120px' }}
                    >
                      <div className="flex items-center justify-between">
                        {isEntitled ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {t('home.entitled')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 dark:bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <Lock className="h-3.5 w-3.5" />
                            {t('home.not_entitled')}
                          </span>
                        )}
                        <span className="font-mono text-xs text-slate-400">{cId}</span>
                      </div>

                      {(course['Creation Time'] || course.createdAt) && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {t('home.created_at')} {(course['Creation Time'] || course.createdAt).split('T')[0]}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="flex flex-1 flex-col p-5">
                      <h3
                        className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 mb-1.5"
                        title={title}
                      >
                        {title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed flex-1 mb-4">
                        {desc}
                      </p>

                      {instructorName && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 mb-3">
                          <User className="h-3.5 w-3.5 text-blue-500" />
                          <span>{instructorName}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-medium">
                            {lang === 'vi' ? 'Học phí' : 'Tuition'}
                          </span>
                          <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                            {price === 0
                              ? t('home.free')
                              : `${price?.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US') ?? '?'} ${
                                  lang === 'vi' ? 'đ' : 'VND'
                                }`}
                          </span>
                        </div>

                        {isEntitled ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCourseAction(course);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <span>{t('home.start_learning')}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCourseAction(course);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors"
                          >
                            <Lock className="h-3 w-3" />
                            <span>{t('home.not_entitled')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* =====================================================================
         * 3. SECTION: CÔNG NGHỆ BẢO VỆ BẢN QUYỀN ĐỘC QUYỀN
         * ===================================================================== */}
        <section className="mb-16 pb-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-2">
              <span>{t('home.architecture_badge')}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('home.architecture_title')}{' '}
              <span className="text-blue-600 dark:text-blue-400">SecureLearn</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto mt-1">
              {t('home.architecture_desc')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mx-auto mb-4">
                <Lock className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1.5">{t('home.hls_title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t('home.hls_desc')}</p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 mx-auto mb-4">
                <Fingerprint className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1.5">{t('home.watermark_title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t('home.watermark_desc')}</p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 mx-auto mb-4">
                <Cpu className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1.5">{t('home.ai_title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t('home.ai_desc')}</p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto mb-4">
                <Cloud className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1.5">{t('home.cdn_title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t('home.cdn_desc')}</p>
            </div>
          </div>
        </section>

        {/* =====================================================================
         * 4. SECTION: CÂU HỎI THƯỜNG GẶP (FAQ VỀ SECURELEARN)
         * ===================================================================== */}
        <section className="mb-16 pb-4">
          <div className="text-center mb-8">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
              {t('home.faq_badge')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('home.faq_title')}
            </h2>
          </div>

          <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl space-y-3">
            {visibleFaqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left font-bold text-xs sm:text-sm text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-50 dark:border-slate-800/50">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="text-center pt-3">
              <button
                type="button"
                onClick={() => setShowAllFaq(!showAllFaq)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
              >
                <span>{showAllFaq ? t('home.show_less_faq') : t('home.show_more_faq')}</span>
                {showAllFaq ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================================
         * 5. BANNER KÊU GỌI HÀNH ĐỘNG (CTA)
         * ===================================================================== */}
        {!isAuthenticated ? (
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-8 sm:p-12 text-center shadow-xl">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
              {t('home.cta_guest_title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-6">
              {t('home.cta_guest_desc')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to={`/${lang}/register`}
                className="rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 no-underline"
              >
                {t('common.register')}
              </Link>
              <Link
                to={`/${lang}/catalog`}
                className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 no-underline"
              >
                {t('common.explore_courses')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-8 sm:p-12 text-center shadow-xl">
            <div className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 mb-3 border border-blue-200">
              {t('home.cta_user_badge')} {user?.name} ({user?.role})
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
              {t('home.cta_user_title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-6">
              {t('home.cta_user_desc')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {user?.role === 'Student' && (
                <Link
                  to={`/${lang}/student/courses`}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 no-underline"
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>{t('common.my_courses')}</span>
                </Link>
              )}
              {user?.role === 'Instructor' && (
                <Link
                  to={`/${lang}/instructor/videos`}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 no-underline"
                >
                  <Film className="h-4 w-4" />
                  <span>{t('common.video_management')}</span>
                </Link>
              )}
              {user?.role === 'Administrator' && (
                <Link
                  to={`/${lang}/admin/alerts`}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 no-underline"
                >
                  <span>{t('common.ai_dashboard')}</span>
                </Link>
              )}
              <Link
                to={`/${lang}/catalog`}
                className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 no-underline"
              >
                {t('common.explore_more')}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* MODAL THÔNG BÁO CHƯA ĐƯỢC CẤP QUYỀN XEM */}
      {Boolean(blockedModalCourse) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-amber-500">
                <Lock className="h-5 w-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Chưa Được Cấp Quyền Xem
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBlockedModalCourse(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs">
              <div className="font-bold text-amber-800 dark:text-amber-200">{blockedModalCourse?.Title}</div>
              <small className="text-amber-700/70 font-mono">Mã khóa học: {blockedModalCourse?.ID}</small>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Khóa học này hiện tại <strong>chưa được cấp quyền xem</strong> cho tài khoản của bạn.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Quy định bảo mật SecureLearn:</strong> Khóa học trong danh mục chưa được cấp quyền thì chưa thể xem video. Chỉ các khóa học đã được ghi danh trong <strong>"Khóa học của tôi"</strong> mới có thể phát nội dung.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBlockedModalCourse(null)}
                className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              >
                Đóng
              </button>
              {isAuthenticated && user?.role === 'Student' ? (
                <button
                  type="button"
                  onClick={() => {
                    setBlockedModalCourse(null);
                    navigate(`/${lang}/student/courses`);
                  }}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-1.5 text-xs font-semibold text-white shadow-xs"
                >
                  Vào Khóa Học Của Tôi
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setBlockedModalCourse(null);
                    navigate(`/${lang}/login`);
                  }}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-1.5 text-xs font-semibold text-white shadow-xs"
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
