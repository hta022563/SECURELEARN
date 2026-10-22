import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { BookOpen, Users, Sparkles, Star } from 'lucide-react';

/**
 * =============================================================================
 * COMPONENT: HeroStatsCard (100% Pure Dynamic & Soft Data)
 * =============================================================================
 * - Tuyệt đối không hardcode số liệu giả định (như 1,200+, 98%, 4.9/5)
 * - Toàn bộ dữ liệu số và nhãn hiển thị đều lấy động từ props / i18n
 * - Phong cách Glassmorphism nhẹ nhàng, thanh lịch, phù hợp nền tảng EdTech
 */
export default function HeroStatsCard({
  totalCourses = 0,
  totalEnrollments = 0,
  stats = null,
  badgeText = null,
  statusText = null,
  slogan = null,
  rating = null,
  lang = 'vi',
}) {
  const { t } = useTranslation();
  const locale = lang === 'vi' ? 'vi-VN' : 'en-US';

  // Danh sách chỉ số động: ưu tiên mảng stats truyền từ ngoài, nếu không dùng cặp chỉ số thực
  const displayStats = Array.isArray(stats) && stats.length > 0
    ? stats
    : [
        {
          id: 'courses',
          value: Number(totalCourses || 0).toLocaleString(locale),
          label: t('common.courses_count', lang === 'vi' ? 'Khóa học' : 'Courses'),
          icon: BookOpen,
          iconBg: 'bg-blue-100/70 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
        },
        {
          id: 'enrollments',
          value: Number(totalEnrollments || 0).toLocaleString(locale),
          label: t('common.enrollments_count', lang === 'vi' ? 'Học viên' : 'Students'),
          icon: Users,
          iconBg: 'bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
        },
      ];

  const gridColsClass =
    displayStats.length === 1
      ? 'grid-cols-1'
      : displayStats.length === 2
      ? 'grid-cols-2'
      : displayStats.length === 3
      ? 'grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-4';

  const defaultBadge = t('home.hero_card_badge', lang === 'vi' ? 'Khóa học trực tuyến' : 'Live Online');
  const defaultSlogan = t(
    'home.hero_card_slogan',
    lang === 'vi'
      ? 'Nền tảng học trực tuyến chất lượng cao'
      : 'High quality online learning platform'
  );

  return (
    <div className="relative w-full max-w-md group">
      {/* Soft Ambient Depth Glow (Ánh sáng nền dịu nhẹ) */}
      <div className="absolute -inset-1 bg-gradient-to-tr from-blue-500/10 via-slate-200/20 to-blue-400/10 dark:from-blue-600/15 dark:to-indigo-600/10 rounded-[2rem] blur-xl opacity-80 pointer-events-none" />

      {/* Main Card Container */}
      <div className="relative rounded-3xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl p-6 sm:p-7 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-200/80 dark:border-slate-800 transition-all duration-300 hover:shadow-2xl hover:border-slate-300 dark:hover:border-slate-700">
        
        {/* Header: Huy hiệu mềm & Trạng thái động */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/70 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span>{badgeText || defaultBadge}</span>
          </div>

          {rating ? (
            <div className="flex items-center gap-1.5 text-xs">
              <div className="flex text-amber-400">
                <Star className="h-3.5 w-3.5 fill-current" />
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">{rating}</span>
            </div>
          ) : statusText ? (
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{statusText}</span>
            </div>
          ) : null}
        </div>

        {/* Dynamic Metric Columns: 100% Dữ liệu mềm */}
        <div className={`grid ${gridColsClass} gap-3 sm:gap-4 mb-6`}>
          {displayStats.map((item, idx) => {
            const ItemIcon = item.icon || BookOpen;
            return (
              <div
                key={item.id || item.label || idx}
                className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div
                  className={`w-10 h-10 mx-auto mb-2.5 rounded-xl flex items-center justify-center ${
                    item.iconBg || 'bg-blue-100/70 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  <ItemIcon className="h-5 w-5" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {item.value}
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Feature Bar: Thông điệp mềm từ props/i18n */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-slate-50/70 to-indigo-50/70 dark:from-slate-800/60 dark:via-slate-800/40 dark:to-slate-850/60 border border-blue-100/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {slogan || defaultSlogan}
          </span>
        </div>
      </div>
    </div>
  );
}

HeroStatsCard.propTypes = {
  totalCourses: PropTypes.number,
  totalEnrollments: PropTypes.number,
  stats: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.string,
      icon: PropTypes.elementType,
      iconBg: PropTypes.string,
    })
  ),
  badgeText: PropTypes.string,
  statusText: PropTypes.string,
  slogan: PropTypes.string,
  rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  lang: PropTypes.string,
};
