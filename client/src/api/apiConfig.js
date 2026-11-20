/**
 * Where each part of the API lives during the Lambda migration.
 *
 * - LAMBDA_API_URL: groups already moved to AWS Lambda behind API Gateway (auth, admin).
 * - LOCAL_API_URL:  everything else (course, enrollment, playback, payment, upload, ai)
 *                   still runs on the local Spring Boot backend + local Postgres.
 *
 * Override either with VITE_LAMBDA_API_URL / VITE_API_URL (e.g. in .env.local for `npm run dev`).
 * The fallbacks below are what the Docker build (run.bat) uses, because .dockerignore keeps .env.* out.
 */
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const LAMBDA_API_URL =
  env.VITE_LAMBDA_API_URL || 'https://1rvav1l53e.execute-api.ap-southeast-1.amazonaws.com/api/v1';

export const LOCAL_API_URL = env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Paths (relative to /api/v1) served by Lambda. Add a prefix here when its group goes live.
const LAMBDA_PREFIXES = ['/auth/', '/admin/'];

/** Base URL for a request path such as '/admin/user' or 'admin/user'. */
export function baseUrlFor(path = '') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return LAMBDA_PREFIXES.some((prefix) => normalized.startsWith(prefix)) ? LAMBDA_API_URL : LOCAL_API_URL;
}
