/**
 * Where each part of the API lives during the Lambda migration.
 *
 * - LAMBDA_API_URL: groups already moved to AWS Lambda behind API Gateway
 *                   (auth, admin, course incl. subjects and /enrollment/me; course uses RDS).
 * - LOCAL_API_URL:  everything else (playback, payment, upload, ai)
 *                   still runs on the local Spring Boot backend + local Postgres.
 *
 * Override either with VITE_LAMBDA_API_URL / VITE_API_URL (e.g. in .env.local for `npm run dev`).
 * The fallbacks below are what the Docker build (run.bat) uses, because .dockerignore keeps .env.* out.
 */
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const LAMBDA_API_URL =
  env.VITE_LAMBDA_API_URL || 'https://1rvav1l53e.execute-api.ap-southeast-1.amazonaws.com/api/v1';

export const LOCAL_API_URL = env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Paths (relative to /api/v1) served by Lambda. Mirror the group's routes in backend/template.yaml
// when it goes live. `(?:[/?]|$)` = the path ends there or continues with a sub-path / query string.
const LAMBDA_ROUTES = [
  /^\/auth\//, // account
  /^\/admin\//, // admin
  // course group
  /^\/(?:courses?|subject|chapter)(?:[/?]|$)/,
  /^\/allcourses(?:\?|$)/,
  /^\/lesson(?:\/[^/?]+)?(?:\?|$)/, // POST /lesson and /lesson/{id} only; /lesson/{id}/playback etc. stay local
  /^\/enrollment\/me(?:\?|$)/, // POST /enrollment/{courseId} is payment, stays local
  /^\/upload\//
];

/** Base URL for a request path such as '/admin/user' or 'admin/user'. */
export function baseUrlFor(path = '') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return LAMBDA_ROUTES.some((route) => route.test(normalized)) ? LAMBDA_API_URL : LOCAL_API_URL;
}
