import axios from 'axios';

/**
 * Axios Client tập trung cho toàn bộ ứng dụng SecureLearn
 * - Tự động đính kèm JWT Bearer Token vào Header
 * - Tự động định tuyến baseURL theo biến môi trường
 * - Tự động refresh token khi gặp mã lỗi 401 qua POST /api/v1/auth/refresh
 */
const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8080/api/v1';
const STORAGE_KEY = 'securelearn_auth_user';

const axiosClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000000,
});

// Request Interceptor: Gắn token xác thực
axiosClient.interceptors.request.use(
  (config) => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          const user = JSON.parse(stored);
          if (user?.token) {
            config.headers.Authorization = `Bearer ${user.token}`;
          }
        }
      }
    } catch (e) {
      console.error('Không thể đọc auth token từ SessionStorage:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Trả về data trực tiếp hoặc tự động refresh token khi gặp 401
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      // Bỏ qua nếu lỗi xảy ra chính tại các API auth
      if (
        originalRequest?.url?.includes('/auth/login') ||
        originalRequest?.url?.includes('/auth/refresh') ||
        originalRequest?.url?.includes('/auth/logout')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        let refreshToken = null;
        let email = null;
        let parsed = null;

        const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null;
        if (stored) {
          parsed = JSON.parse(stored);
          refreshToken = parsed?.refreshToken;
          email = parsed?.email;
        }

        if (refreshToken && email) {
          // POST /api/v1/auth/refresh (Public permitAll)
          const refreshRes = await axios.post(
            `${BASE_URL}/auth/refresh`,
            { refreshToken, email },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { accessToken, idToken } = refreshRes.data || {};
          if (accessToken) {
            if (parsed) {
              parsed.token = accessToken;
              if (idToken) parsed.idToken = idToken;
              sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            }

            axiosClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;

            processQueue(null, accessToken);
            return axiosClient(originalRequest);
          }
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        console.warn('Phiên đăng nhập hết hạn và làm mới token thất bại:', refreshErr.message);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
