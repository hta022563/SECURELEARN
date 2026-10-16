import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import step1Img from '../assets/timeline/timeline_step1_1791094283433.jpg';
import step2Img from '../assets/timeline/timeline_step2_1791094295409.jpg';
import step3Img from '../assets/timeline/timeline_step3_1791094304858.jpg';
import step4Img from '../assets/timeline/timeline_step4_1791094316191.jpg';
import step5Img from '../assets/timeline/timeline_step5_1791094326365.jpg';

/**
 * =============================================================================
 * COMPONENT: LearningTimeline (Lộ Trình Học Tập - Pure Tailwind CSS)
 * =============================================================================
 */
export default function LearningTimeline() {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(1);

  const STICKY_STEPS = [
    {
      id: 1,
      title: t('home.timeline.step1_title', 'Khám phá khóa học'),
      desc: t('home.timeline.step1_desc', 'Tìm kiếm và lựa chọn lộ trình học tập phù hợp từ danh sách các khóa học chất lượng cao trên nền tảng.'),
      image: step1Img,
    },
    {
      id: 2,
      title: t('home.timeline.step2_title', 'Không gian học tập'),
      desc: t('home.timeline.step2_desc', 'Trải nghiệm môi trường học tập tĩnh lặng, tập trung, với giao diện quản lý tiến trình cá nhân thân thiện.'),
      image: step2Img,
    },
    {
      id: 3,
      title: t('home.timeline.step3_title', 'Bài giảng trực quan'),
      desc: t('home.timeline.step3_desc', 'Tiếp thu kiến thức hiệu quả thông qua video giảng dạy sắc nét, cấu trúc bài học rõ ràng và tài liệu phong phú.'),
      image: step3Img,
    },
    {
      id: 4,
      title: t('home.timeline.step4_title', 'Luyện tập & Đánh giá'),
      desc: t('home.timeline.step4_desc', 'Áp dụng ngay lý thuyết vào thực hành thông qua các bài tập và củng cố kỹ năng sau mỗi chương học.'),
      image: step4Img,
    },
    {
      id: 5,
      title: t('home.timeline.step5_title', 'Chứng nhận hoàn thành'),
      desc: t('home.timeline.step5_desc', 'Tổng kết quá trình nỗ lực, nhận chứng chỉ hoàn thành để nâng cấp hồ sơ năng lực và mở rộng cơ hội.'),
      image: step5Img,
      isFinal: true,
    },
  ];

  return (
    <section className="relative py-12 my-12 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-12 text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-semibold mb-3 shadow-xs">
          <span>{t('home.timeline.badge', 'Hành trình chinh phục tri thức')}</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
          {t('home.timeline.main_title_part1', 'Từ bước khởi đầu đến khi ')}
          <span className="text-blue-600 dark:text-blue-400">{t('home.timeline.main_title_part2', 'làm chủ')}</span>
        </h2>
        <p className="mx-auto max-w-2xl text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
          {t('home.timeline.main_desc', 'Trải nghiệm lộ trình học tập tiêu chuẩn: từ chọn môn, vào không gian học tập, xem bài giảng, thực hành cho đến khi nhận chứng nhận.')}
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Cột trái: Timeline dọc */}
          <div className="lg:col-span-5 relative">
            {/* Đường kẻ dọc mờ kết nối các bước */}
            <div
              className="absolute border-l-2 border-dashed border-slate-200 dark:border-slate-800"
              style={{ width: '2px', left: '26px', top: '24px', bottom: '40px', zIndex: 0 }}
            />

            <div className="relative z-10 flex flex-col gap-3.5">
              {STICKY_STEPS.map((step) => {
                const isActive = activeStep === step.id;
                const isFinal = step.isFinal;

                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-3.5 p-4 rounded-2xl cursor-pointer transition-all duration-200 ${
                      isActive
                        ? isFinal
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 shadow-sm'
                          : 'bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 shadow-sm'
                        : 'border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                    onMouseEnter={() => setActiveStep(step.id)}
                    onClick={() => setActiveStep(step.id)}
                  >
                    {/* Vòng tròn số */}
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isActive
                          ? isFinal
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-blue-600 text-white shadow-sm'
                          : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {step.id}
                    </div>

                    {/* Văn bản */}
                    <div>
                      <h4
                        className={`text-sm sm:text-base font-bold mb-1 transition-all ${
                          isActive
                            ? isFinal
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-blue-700 dark:text-blue-300'
                            : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {step.title}
                      </h4>
                      <p
                        className={`text-xs sm:text-sm leading-relaxed transition-all ${
                          isActive
                            ? isFinal
                              ? 'text-emerald-800/80 dark:text-emerald-200/80'
                              : 'text-blue-800/80 dark:text-blue-200/80'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cột phải: Hình ảnh/Widget thay đổi tương ứng */}
          <div className="hidden lg:block lg:col-span-7 relative">
            <div className="sticky top-28 flex items-center justify-center" style={{ height: '65vh' }}>
              <div className="w-full h-full rounded-3xl flex items-center justify-center relative overflow-hidden shadow-md border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                {/* Background trang trí động nhẹ nhàng */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-indigo-500/5 to-cyan-500/10 rounded-3xl pointer-events-none" />

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="flex flex-col items-center text-center relative z-10 w-full px-8"
                  >
                    {/* Hình ảnh minh họa */}
                    <div
                      className="rounded-full flex items-center justify-center mb-6 relative overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800"
                      style={{ width: '280px', height: '280px' }}
                    >
                      <img
                        src={STICKY_STEPS.find((s) => s.id === activeStep)?.image}
                        alt={STICKY_STEPS.find((s) => s.id === activeStep)?.title || 'Illustration'}
                        className="w-full h-full object-cover transform scale-105"
                      />
                    </div>

                    <p className="text-slate-700 dark:text-slate-200 font-medium text-base sm:text-lg max-w-lg leading-relaxed">
                      {STICKY_STEPS.find((s) => s.id === activeStep)?.desc}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
