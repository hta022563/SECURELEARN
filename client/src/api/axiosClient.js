import axios from 'axios';

/**
 * Axios Client tập trung cho toàn bộ ứng dụng SecureLearn
 * - Tự động đính kèm JWT Bearer Token vào Header
 * - Tự động định tuyến baseURL theo biến môi trường
 */
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Gắn token xác thực
axiosClient.interceptors.request.use(
  (config) => {
    try {
      const stored = localStorage.getItem('securelearn_auth_user');
      if (stored) {
        const user = JSON.parse(stored);
        if (user?.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    } catch (e) {
      console.error('Không thể đọc auth token từ LocalStorage:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Trả về data trực tiếp hoặc xử lý lỗi
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Phiên đăng nhập hết hạn hoặc token không hợp lệ (401).');
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
