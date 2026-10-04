import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import MeshGradientBackground from './MeshGradientBackground';

export default function LearningTimeline() {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(1);

  const STICKY_STEPS = [
    {
      id: 1,
      title: t('home.timeline.step1_title', 'Khám phá khóa học'),
      desc: t('home.timeline.step1_desc', 'Tìm kiếm và lựa chọn lộ trình học tập phù hợp từ danh sách các khóa học chất lượng cao trên nền tảng.'),
      image: '/images/timeline/timeline_step1_1791094283433.jpg'
    },
    {
      id: 2,
      title: t('home.timeline.step2_title', 'Không gian học tập'),
      desc: t('home.timeline.step2_desc', 'Trải nghiệm môi trường học tập tĩnh lặng, tập trung, với giao diện quản lý tiến trình cá nhân thân thiện.'),
      image: '/images/timeline/timeline_step2_1791094295409.jpg'
    },
    {
      id: 3,
      title: t('home.timeline.step3_title', 'Bài giảng trực quan'),
      desc: t('home.timeline.step3_desc', 'Tiếp thu kiến thức hiệu quả thông qua video giảng dạy sắc nét, cấu trúc bài học rõ ràng và tài liệu phong phú.'),
      image: '/images/timeline/timeline_step3_1791094304858.jpg'
    },
    {
      id: 4,
      title: t('home.timeline.step4_title', 'Luyện tập & Đánh giá'),
      desc: t('home.timeline.step4_desc', 'Áp dụng ngay lý thuyết vào thực hành thông qua các bài tập và củng cố kỹ năng sau mỗi chương học.'),
      image: '/images/timeline/timeline_step4_1791094316191.jpg'
    },
    {
      id: 5,
      title: t('home.timeline.step5_title', 'Chứng nhận hoàn thành'),
      desc: t('home.timeline.step5_desc', 'Tổng kết quá trình nỗ lực, nhận chứng chỉ hoàn thành để nâng cấp hồ sơ năng lực và mở rộng cơ hội.'),
      image: '/images/timeline/timeline_step5_1791094326365.jpg',
      isFinal: true
    }
  ];

  return (
    <section className="bg-white position-relative py-5 my-5">
      <Container className="mb-5 text-center">
        <div className="badge-pill-soft mb-3 mx-auto">
          <span>{t('home.timeline.badge', 'Hành trình chinh phục tri thức')}</span>
        </div>
        <h2 className="display-5 fw-bold text-dark mb-2" style={{ letterSpacing: '-0.02em' }}>
          {t('home.timeline.main_title_part1', 'Từ bước khởi đầu đến khi ')}<span className="text-primary">{t('home.timeline.main_title_part2', 'làm chủ')}</span>
        </h2>
        <p className="text-secondary mx-auto mb-0" style={{ maxWidth: '600px', fontSize: '1.1rem' }}>
          {t('home.timeline.main_desc', 'Trải nghiệm lộ trình học tập tiêu chuẩn: từ chọn môn, vào không gian học tập, xem bài giảng, thực hành cho đến khi nhận chứng nhận.')}
        </p>
      </Container>

      <Container className="position-relative">
        <Row className="g-5">
          {/* Cột trái: Timeline dọc có thể click */}
          <Col lg={5} className="position-relative">
            {/* Đường kẻ dọc mờ kết nối các bước */}
            <div 
              className="position-absolute bg-light border-start border-2 border-dashed" 
              style={{ width: '2px', left: '39px', top: '20px', bottom: '40px', zIndex: 0 }}
            ></div>

            <div className="d-flex flex-column gap-3 position-relative" style={{ zIndex: 1 }}>
              {STICKY_STEPS.map((step) => {
                const isActive = activeStep === step.id;
                const isFinal = step.isFinal;
                const colorClass = isFinal ? 'success' : 'primary';
                
                return (
                  <div
                    key={step.id}
                    className={`d-flex align-items-start gap-3 p-3 rounded-4 cursor-pointer transition-all ${
                      isActive 
                        ? `bg-${colorClass} bg-opacity-10 border border-${colorClass} border-opacity-50 shadow-sm` 
                        : 'border border-transparent hover-bg-light'
                    }`}
                    onMouseEnter={() => setActiveStep(step.id)}
                    onClick={() => setActiveStep(step.id)}
                    style={{ cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
                  >
                    {/* Vòng tròn số */}
                    <div 
                      className={`d-flex align-items-center justify-content-center flex-shrink-0 fw-bold rounded-circle transition-all ${
                        isActive 
                          ? `bg-${colorClass} text-white shadow-sm` 
                          : 'bg-light text-secondary border'
                      }`}
                      style={{ width: '28px', height: '28px', fontSize: '0.85rem', marginTop: '2px' }}
                    >
                      {step.id}
                    </div>

                    {/* Văn bản */}
                    <div>
                      <h6 className={`fw-bold mb-1 transition-all ${
                        isActive ? `text-${colorClass}` : 'text-dark'
                      }`}>
                        {step.title}
                      </h6>
                      <p className={`small mb-0 transition-all ${
                        isActive ? `text-${colorClass} text-opacity-75` : 'text-secondary'
                      }`} style={{ lineHeight: '1.6' }}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Col>

          {/* Cột phải: Hình ảnh/Widget thay đổi tương ứng */}
          <Col lg={7} className="d-none d-lg-block position-relative">
            <div className="position-sticky d-flex align-items-center justify-content-center" style={{ top: '15vh', height: '70vh' }}>
              <div 
                className="w-100 h-100 rounded-5 d-flex align-items-center justify-content-center position-relative overflow-hidden shadow-sm border"
                style={{ backgroundColor: '#fafcff' }}
              >
                {/* Background trang trí động */}
                <MeshGradientBackground className="position-absolute w-100 h-100" style={{ opacity: 0.5 }} />

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="d-flex flex-column align-items-center text-center position-relative z-1 w-100 px-5"
                  >
                    {/* Hình ảnh minh họa 3D */}
                    <div 
                      className="rounded-circle d-flex align-items-center justify-content-center mb-4 position-relative overflow-hidden"
                      style={{ 
                        width: '320px', height: '320px',
                        boxShadow: '0 30px 60px rgba(0,0,0,0.1), inset 0 0 0 8px rgba(255,255,255,0.8)'
                      }}
                    >
                      <img 
                        src={STICKY_STEPS.find(s => s.id === activeStep)?.image} 
                        alt="Illustration"
                        className="w-100 h-100 object-fit-cover"
                        style={{ transform: 'scale(1.05)' }}
                      />
                    </div>
                    
                    {/* Floating Text mô phỏng ảnh yêu cầu */}
                    <p 
                      className="text-secondary fw-medium mx-auto mt-2" 
                      style={{ fontSize: '1.25rem', maxWidth: '80%', lineHeight: '1.6' }}
                    >
                      {STICKY_STEPS.find(s => s.id === activeStep)?.desc}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
}
