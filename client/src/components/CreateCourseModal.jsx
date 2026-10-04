import React, { useState } from 'react';
import { Modal, Form, Button, FloatingLabel, InputGroup } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createCourse } from '../services/courseService';

/**
 * =============================================================================
 * COMPONENT: CreateCourseModal
 * =============================================================================
 * Modal tạo khóa học mới chuẩn 100% thuộc tính ERD:
 * - ID, Title, Description, Price, "Creation Time", Owner, AccessLogID, AnomalyAlertID
 * =============================================================================
 */
export default function CreateCourseModal({ show, onHide, onCourseCreated }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('499000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast('Vui lòng điền đầy đủ Tiêu đề và Mô tả khóa học.', 'warning', 'Thiếu Dữ Liệu');
      return;
    }

    setIsSubmitting(true);

    try {
      const newCourse = await createCourse({
        title: title.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        owner: user?.userId,
      });

      showToast(`Đã tạo thành công khóa học: "${newCourse.Title}"!`, 'success', 'Tạo Khóa Học Thành Công');

      // Reset form
      setTitle('');
      setDescription('');
      setPrice('499000');
      onHide();

      if (typeof onCourseCreated === 'function') {
        onCourseCreated(newCourse);
      }
    } catch (err) {
      showToast(`Không thể tạo khóa học: ${err.message}`, 'danger', 'Lỗi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="border-bottom-0 pb-0">
        <Modal.Title className="fs-5 fw-bold text-dark d-flex align-items-center gap-2">
          <i className="bi bi-mortarboard-fill text-primary"></i>
          <span>Thêm Khóa Học Mới</span>
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="pt-3">
          <p className="text-secondary small mb-3">
            Khởi tạo khóa học mới theo chuẩn bản quyền số DRM của SecureLearn. Sau khi tạo, bạn có thể thêm các Chương và tải lên video từng phần nhỏ.
          </p>

          {/* Tiêu đề khóa học */}
          <FloatingLabel
            controlId="newCourseTitle"
            label="Tiêu đề khóa học *"
            className="mb-3 text-secondary"
          >
            <Form.Control
              type="text"
              placeholder="Ví dụ: Lập trình Web Frontend WED201c"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="form-control-clean"
              autoFocus
            />
          </FloatingLabel>

          {/* Mô tả khóa học */}
          <FloatingLabel
            controlId="newCourseDesc"
            label="Mô tả tóm tắt nội dung khóa học *"
            className="mb-3 text-secondary"
          >
            <Form.Control
              as="textarea"
              placeholder="Mô tả nội dung bài giảng..."
              style={{ height: '100px' }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="form-control-clean"
            />
          </FloatingLabel>

          {/* Học phí */}
          <div className="mb-3">
            <label className="form-label small fw-bold text-dark">
              Học phí (VNĐ) <span className="text-muted fw-normal">(Nhập 0 nếu là khóa học miễn phí)</span>
            </label>
            <InputGroup>
              <Form.Control
                type="number"
                min="0"
                step="1000"
                placeholder="499000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="form-control-clean"
              />
              <InputGroup.Text className="bg-light text-muted">đ</InputGroup.Text>
            </InputGroup>
          </div>

          <div className="p-3 bg-light rounded-3 border small text-muted">
            <div className="d-flex justify-content-between mb-1">
              <span>Giảng viên sở hữu (Owner):</span>
              <strong className="text-dark font-monospace">{user?.email || user?.userId || 'u-002'}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span>Chuẩn bảo vệ:</span>
              <span className="badge-status-ready">HLS AES-128 & Watermark</span>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className="border-top-0 pt-0">
          <Button variant="light" onClick={onHide} disabled={isSubmitting} className="rounded-pill px-3">
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !title.trim() || !description.trim()}
            className="btn-primary-pill px-4"
          >
            {isSubmitting ? 'Đang tạo...' : 'Tạo Khóa Học'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
