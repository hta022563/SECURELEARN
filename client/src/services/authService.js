/**
 * authService.js
 * =============================================================================
 * Handles all authentication API calls to the Spring Boot backend.
 *
 * Endpoints (all under /api/v1/auth):
 *   POST /register  — create a Cognito account with a role
 *   POST /login     — authenticate and receive Cognito JWTs
 *   POST /logout    — globally invalidate the caller's tokens
 *   POST /refresh   — exchange a refresh token for new tokens
 *   GET  /me        — return the current user's claims from their JWT
 *
 * The backend also supports OAuth2 Hosted UI login (browser redirect):
 *   GET  http://localhost:8080/oauth2/authorization/cognito
 * =============================================================================
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Storage key — keep in sync with AuthContext
const STORAGE_KEY = 'securelearn_auth_user';

// ─── helpers ──────────────────────────────────────────────────────────────────

function getAccessToken() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored)?.token ?? null;
  } catch {
    return null;
  }
}

async function handleResponse(res) {
  const text = await res.text().catch(() => '');
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  if (!res.ok) {
    const errorMsg = data.error || data.message || (typeof data === 'string' ? data : `Request failed (${res.status})`);
    throw new Error(errorMsg);
  }
  return data;
}

// ─── register & OTP verification ──────────────────────────────────────────────

/**
 * Creates a new Cognito account.
 * @param {{ fullName: string, email: string, password: string, role: 'student'|'instructor' }} payload
 * @returns {Promise<{ message: string, email: string }>}
 */
export async function register({ fullName, email, password, role }) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email, password, role }),
  });
  return handleResponse(res);
}

/**
 * Confirms Cognito registration with OTP code.
 * Endpoint: POST /api/v1/auth/otp
 * @param {{ email: string, otp: string }} payload
 * @returns {Promise<{ message?: string } | string>}
 */
export async function verifyRegisterOtp({ email, otp }) {
  const res = await fetch(`${BASE_URL}/auth/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  return handleResponse(res);
}

/**
 * Resends signup confirmation code (OTP).
 * Endpoint: POST /api/v1/auth/resend-otp
 * @param {{ email: string }} payload
 * @returns {Promise<{ message?: string }>}
 */
export async function resendOtp({ email }) {
  const res = await fetch(`${BASE_URL}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
}

// ─── forgot password & reset password ─────────────────────────────────────────

/**
 * Requests a password reset OTP for the given email.
 * Endpoint: POST /api/v1/auth/forgot-password
 * @param {{ email: string }} payload
 * @returns {Promise<{ message?: string }>}
 */
export async function forgotPassword({ email }) {
  const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
}

/**
 * Confirms password reset with OTP and sets the new password.
 * Endpoint: POST /api/v1/auth/reset-password
 * @param {{ email: string, otp: string, newPassword: string }} payload
 * @returns {Promise<{ message?: string }>}
 */
export async function resetPassword({ email, otp, newPassword }) {
  const res = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, newPassword }),
  });
  return handleResponse(res);
}


// ─── login ────────────────────────────────────────────────────────────────────

/**
 * Authenticates with Cognito USER_PASSWORD_AUTH.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ accessToken: string, idToken: string, refreshToken: string, expiresIn: number }>}
 */
export async function login({ email, password }) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

// ─── logout ───────────────────────────────────────────────────────────────────

/**
 * Globally invalidates the current user's Cognito tokens (GlobalSignOut).
 * Endpoint: POST /api/v1/auth/logout
 * Requires: Authorization: Bearer <accessToken>
 * @param {string} [tokenOverride]
 * @returns {Promise<{ message?: string }>}
 */
export async function logout(tokenOverride) {
  const token = tokenOverride || getAccessToken();
  if (!token) {
    return { message: 'Logged out locally' };
  }

  try {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(res);
  } catch (err) {
    console.warn('[authService] Backend GlobalSignOut notice:', err.message);
    return null;
  }
}

// ─── refresh ──────────────────────────────────────────────────────────────────

/**
 * Exchanges a refresh token for a new access token.
 * Endpoint: POST /api/v1/auth/refresh (Public / permitAll)
 * @param {{ refreshToken?: string, email?: string }} [params]
 * @returns {Promise<{ accessToken: string, idToken: string, expiresIn: number }>}
 */
export async function refreshToken(params = {}) {
  let { refreshToken: rToken, email } = params;

  // Auto-read from session if not explicitly provided
  if (!rToken || !email) {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        rToken = rToken || parsed?.refreshToken;
        email = email || parsed?.email;
      }
    } catch {
      // Ignore
    }
  }

  if (!rToken || !email) {
    throw new Error('Refresh token and email are required for /api/v1/auth/refresh');
  }

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rToken, email }),
  });
  const data = await handleResponse(res);

  // Automatically update the stored tokens in sessionStorage if available
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (data.accessToken) parsed.token = data.accessToken;
      if (data.idToken) parsed.idToken = data.idToken;
      if (data.expiresIn) parsed.expiresIn = data.expiresIn;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch {
    // Ignore
  }

  return data;
}

// ─── me ───────────────────────────────────────────────────────────────────────

/**
 * Returns the current user's claims from the backend using the stored access token.
 * Endpoint: GET /api/v1/auth/me
 * Requires: Authorization: Bearer <accessToken>
 * @param {string} [tokenOverride]
 * @returns {Promise<{ sub: string, email: string, name: string, roles: string[] }>}
 */
export async function me(tokenOverride) {
  const token = tokenOverride || getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${BASE_URL}/auth/me`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return handleResponse(res);
}

// ─── Cognito Hosted UI (browser redirect) ─────────────────────────────────────

export const COGNITO_LOGIN_URL  = 'http://localhost:8080/oauth2/authorization/cognito';
export const COGNITO_LOGOUT_URL = 'http://localhost:8080/logout';

export function redirectToCognitoLogin() {
  window.location.href = COGNITO_LOGIN_URL;
}

// ─── role helpers ─────────────────────────────────────────────────────────────

/**
 * Maps the Cognito group name (uppercase) to the display role used in the frontend.
 * e.g. "INSTRUCTOR" → "Instructor"
 */
export function mapCognitoRoleToDisplayRole(cognitoGroups = []) {
  if (cognitoGroups.includes('ADMIN'))      return 'Administrator';
  if (cognitoGroups.includes('INSTRUCTOR')) return 'Instructor';
  return 'Student';
}

export const ROLE_REDIRECT = {
  Administrator: '/admin',
  Instructor:    '/instructor/videos',
  Student:       '/student/courses',
};
