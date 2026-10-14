import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  User,
  Play,
  AlertOctagon,
  RotateCw,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCourses } from '../services/courseService';

/**
 * Component: MyCourses
 * Trang hiển thị danh sách khóa học của Học viên (Student Dashboard)
 * Pure Tailwind CSS & Lucide Icons
 */
export default function MyCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { lang } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Hàm gọi API lấy danh sách khóa học
  const fetchStudentCourses = async () => {
    setLoading(true);
    setError(null);

    try {
      const allCourses = await getCourses();
      if (Array.isArray(allCourses) && allCourses.length > 0) {
        const formatted = allCourses.map((course) => ({
          id: course.ID || course.id,
          title: course.Title || course.title,
          description: course.Description || course.description,
          owner: course.Owner || course.owner || course.instructor || '',
          status: 'Active',
          joinDate: course['Creation Time'] || course.createdAt,
          completionDate: null,
          creationTime: course['Creation Time'] || course.createdAt,
          price: course.Price ?? course.price,
        }));
        setCourses(formatted);
      } else {
        setCourses([]);
      }
    } catch (err) {
      console.warn('[MyCourses] Lỗi nạp khóa học từ BE:', err.message);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentCourses();
  }, [user]);

  const handleWatchVideo = (videoId) => {
    navigate(`/${lang}/student/player/${videoId}`);
  };

  return (
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>{t('dashboard.personal_space')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
            {t('dashboard.title')}{' '}
            <span className="text-blue-600 dark:text-blue-400">
              {t('dashboard.title_highlight')}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t('dashboard.description')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900 text-xs font-bold text-blue-700 dark:text-blue-300">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            <span>{courses.length} {t('dashboard.enrolled_courses')}</span>
          </span>
        </div>
      </div>

      {/* 1. UI STATE: Đang tải */}
      {loading && (
        <div className="flex flex-col justify-center items-center py-24">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('dashboard.loading')}
          </p>
        </div>
      )}

      {/* 2. UI STATE: Lỗi gọi API */}
      {error && !loading && (
        <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-center max-w-lg mx-auto my-8">
          <AlertOctagon className="h-8 w-8 text-rose-500 mx-auto mb-2" />
          <h4 className="text-base font-bold text-rose-800 dark:text-rose-200 mb-1">
            {t('dashboard.error_title')}
          </h4>
          <p className="text-xs text-rose-600 dark:text-rose-300 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchStudentCourses}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 dark:border-rose-800 px-4 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>{t('dashboard.retry')}</span>
          </button>
        </div>
      )}

      {/* 3. UI STATE: Thành công */}
      {!loading && !error && (
        <>
          {courses.length === 0 ? (
            <div className="text-center py-16 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <BookOpen className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {t('dashboard.no_courses_title')}
              </h5>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                {t('dashboard.no_courses_desc')}
              </p>
              <button
                type="button"
                onClick={() => navigate(`/${lang}/catalog`)}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-xs font-semibold text-white shadow-xs transition-all"
              >
                {t('dashboard.explore_courses')}
              </button>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.08,
                  },
                },
                hidden: {},
              }}
            >
              {courses.map((course) => (
                <motion.div
                  key={course.id}
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
                  }}
                  className="flex flex-col rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
                >
                  {/* Header Banner thẻ Khóa học */}
                  <div
                    className="p-5 bg-blue-50/70 dark:bg-blue-950/30 border-b border-slate-100 dark:border-slate-800 flex flex-col justify-between"
                    style={{ minHeight: '120px' }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                          course.status === 'completed'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {course.status === 'completed'
                          ? t('dashboard.status_completed')
                          : course.status === 'active'
                          ? t('dashboard.status_active')
                          : course.status || t('dashboard.status_active')}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                        ID: {course.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-3">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {t('dashboard.joined_date')}{' '}
                        {course.joinDate ? course.joinDate.split('T')[0] : t('dashboard.learning')}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    {/* Tiêu đề Khóa học */}
                    <h3
                      className="font-bold text-base text-slate-900 dark:text-white mb-2 line-clamp-1"
                      title={course.title}
                    >
                      {course.title}
                    </h3>

                    {/* Mô tả tóm tắt */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 flex-1 leading-relaxed">
                      {course.description}
                    </p>

                    {/* Thông tin Giảng viên */}
                    {course.owner && (
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-blue-500" />
                          <span>{course.owner}</span>
                        </span>
                        {course.price != null && (
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {course.price === 0
                              ? t('dashboard.free_price')
                              : `${course.price.toLocaleString('vi-VN')} đ`}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Nút Xem Video */}
                    <button
                      type="button"
                      onClick={() => handleWatchVideo(course.id)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" />
                      <span>{t('dashboard.start_lecture')}</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
