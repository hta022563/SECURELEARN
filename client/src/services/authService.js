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
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored)?.token ?? null;
  } catch {
    return null;
  }
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// ─── register ─────────────────────────────────────────────────────────────────

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
 * Globally invalidates the current user's Cognito tokens.
 * The frontend clears local storage regardless of whether this succeeds.
 * @returns {Promise<void>}
 */
export async function logout() {
  const token = getAccessToken();
  if (!token) return;

  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
  } catch {
    // Best-effort — frontend clears tokens regardless
  }
}

// ─── refresh ──────────────────────────────────────────────────────────────────

/**
 * Exchanges a refresh token for a new access token.
 * @param {{ refreshToken: string, email: string }} params
 * @returns {Promise<{ accessToken: string, idToken: string, expiresIn: number }>}
 */
export async function refreshToken({ refreshToken, email }) {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken, email }),
  });
  return handleResponse(res);
}

// ─── me ───────────────────────────────────────────────────────────────────────

/**
 * Returns the current user's claims from the backend using the stored access token.
 * @returns {Promise<{ sub: string, email: string, name: string, roles: string[] }>}
 */
export async function me() {
  const token = getAccessToken();
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
