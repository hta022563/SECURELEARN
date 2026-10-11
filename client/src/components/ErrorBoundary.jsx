import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container py-5 text-center">
          <div className="card shadow-sm border-0 p-5 mx-auto" style={{ maxWidth: '600px' }}>
            <div className="text-warning mb-3" style={{ fontSize: '3rem' }}>
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
            <h4 className="fw-bold text-dark mb-2">Đã xảy ra lỗi giao diện</h4>
            <p className="text-secondary small mb-3">
              {this.state.error?.message || 'Có lỗi bất ngờ xảy ra khi tải trang.'}
            </p>
            <div>
              <button
                className="btn btn-primary rounded-pill px-4"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
              >
                <i className="bi bi-arrow-clockwise me-1"></i> Tải lại trang
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
