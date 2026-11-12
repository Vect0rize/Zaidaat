# ZAIDAAT Marketplace — Security & Penetration Audit Report

**Audit Date**: 2026-11-12  
**Scope**: Local API (`server/`), authentication & session layer, RBAC/IDOR controls, upload handling, database/SQLite security, HTTP security headers, CSRF, and deployment configuration  
**Secret Handling**: Zero credentials, private keys, or live tokens are reproduced in this report.

---

## 1. Security Posture Summary

| Domain | Status | Notes |
|---|---|---|
| Password Hashing | **PASS** | `bcryptjs` salted hashes; never returned in API payloads |
| Session Management & Logout | **PASS** | HttpOnly cookies backed by `auth_sessions`; logout invalidates server session (`SEC-11` -> 401); suspended users rejected immediately (`SEC-12` -> 401) |
| Privilege Escalation / RBAC | **PASS** | Self-registration rejects `admin` role (`SEC-01` -> 400); admin routes enforce admin role |
| OTP Brute-Force & Abuse | **PASS** | Attempt limits + per-phone send throttling enforced (`AUTH-03` -> 429 on 5th rapid request) |
| SQL Injection | **PASS** | Parameterized prepared statements (`better` / `node:sqlite`); negative/non-numeric query limits safely clamped/handled (`EDGE-01`..`04`, `SEC-03`) |
| XSS & Dangerous URLs | **PASS** | Input text sanitized (`sanitize.ts`); `javascript:` avatar/media URLs rejected (`SEC-02` -> 400); SVG uploads rejected (`SEC-05` -> 400); polyglot HTML-in-PNG rejected (`SEC-04` -> 400) |
| IDOR & Ownership Checks | **PASS** | Cross-user property edits (`SEC-06`), project `propertyId` linking (`SEC-08`), private project messaging (`SEC-09`), and KYC doc downloads (`SEC-07`) all return `403` |
| Private File / Path Traversal | **PASS** | Direct static KYC path blocked (`403`), path traversal rejected (`400`), only authorized owner/admin served via authenticated route (`200`) |
| CSRF Protection | **PASS** | State-changing `/api` requests enforce allowed `Origin` + block `Sec-Fetch-Site: cross-site` (`SEC-10` -> 403) |
| Race Conditions / Concurrency | **PASS** | Atomic transactions guard concurrent quotation acceptance (`CONC-02` -> 200 + 409) and duplicate complaint reports (`CONC-03` -> 201 + 409) |
| HTTP Security Headers & CSP | **PASS** | Helmet `Content-Security-Policy` (`SEC-14`) verified live on both Vite proxy (`localhost:3000`) and Express API (`127.0.0.1:4000`) |
| Production Dependency CVEs | **PASS** | `npm audit --omit=dev` reports `0` vulnerabilities (root & `client`) |

---

## 2. Hardening Applied During Audit

1. **Per-Phone OTP Throttle (`server/routes/auth.ts`)**: Added per-phone sliding throttle to `POST /api/auth/otp/send` returning HTTP `429` after 4 rapid sends (`AUTH-03`), complementing IP-based rate limiting.
2. **Strict Status & Media Validation (`server/utils/validation.ts`, `server/utils/sanitize.ts`)**: Rejects `javascript:` / unsafe URIs on profile/media fields (`SEC-02`), validates property statuses on `PUT /api/properties/:id` instead of silently ignoring invalid states (`EDGE-07`), and strips XSS angle brackets cleanly (`CRUD-02`).
3. **Malformed JSON Error Handling (`server/middleware/errorHandler.ts`)**: Returns structured HTTP `400` on malformed JSON request bodies instead of unhandled HTTP `500` (`EDGE-06`).
4. **Content-Security-Policy (`server/index.ts`)**: Configured Helmet CSP restricting `objectSrc: ["'none'"]`, `baseUri: ["'self'"]`, `frameAncestors: ["'self'"]`, and explicit `connectSrc` for self + Google OAuth endpoints (`SEC-14`).
5. **KYC Private Document Authorization (`server/routes/uploads.ts`, `server/routes/professionals.ts`)**: Enforced strict path sanitization and owner/admin checks; blocked direct unauthenticated static access (`SEC-07`).
6. **Admin Audit Accuracy (`server/routes/admin.ts`)**: Non-existent target property moderation returns `404` (`EDGE-05`) rather than fake `200`.
7. **Secrets & Information Leakage in UI (`client/src/pages/PlansPage.tsx`)**: Replaced internal gateway environment variable names shown in sandbox UI banner with neutral user-facing copy.

---

## 3. External & Production Configuration Findings

1. **Google OAuth `Error 400: redirect_uri_mismatch` (Observed in User Production Screenshot)**:
   - `server/routes/auth.ts` (`resolveGoogleOAuthContext`) dynamically builds `${requestOrigin}/api/auth/google/callback` when `GOOGLE_REDIRECT_URI` is unset.
   - Accessing the live site via `https://zaidaat.com` sends `redirect_uri=https://zaidaat.com/api/auth/google/callback`, whereas Google Cloud Console only had `https://www.zaidaat.com/api/auth/google/callback` configured.
   - **Remediation**: Add **both** `https://zaidaat.com/api/auth/google/callback` and `https://www.zaidaat.com/api/auth/google/callback` under *Authorised redirect URIs* in Google Cloud Console, or enforce a 301 canonical redirect in reverse proxy (`www` <-> apex) and set an explicit `GOOGLE_REDIRECT_URI` matching it.
2. **Production `.env` & Secret Hygiene**:
   - `server/config.ts` throws on startup if `NODE_ENV=production` still uses a `replace-with...` placeholder `JWT_SECRET`, disables `allowDevOtp` / `allowDevResetPreview` whenever `NODE_ENV=production`, and generates a `0600` key in `data/.jwt-secret` if unset.
   - Ensure live production deployment explicitly sets strong unique `JWT_SECRET`, `COOKIE_SECURE=true`, `NODE_ENV=production`, and real `RAZORPAY_*` / SMS provider credentials before opening paid checkouts or SMS OTP publicly.
3. **Hostinger `hostinger-deploy/.env` Hygiene**:
   - Keep `hostinger-deploy/.env` excluded from public version control (`.gitignore`) and rotate any credential if ever committed or shared externally.
