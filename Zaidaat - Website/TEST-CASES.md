# ZAIDAAT Marketplace — Executed Test Cases & Results

Every test case listed below was executed after the final source edit during this audit session.

---

## 1. Automated Integration & Destruction Suite (`npm.cmd run test:api` & `npm.cmd run test:audit`)

- **`npm.cmd run test:api`** (`server/tests/integration.test.ts`): **PASS** (exit code `0`) against isolated temp DB (`50642`), covering migrations `001`–`005`, DB seeding, auth OTP/reset, properties CRUD, work/quotations, projects, and security checks.
- **`npm.cmd run test:audit`** (`server/tests/destruction.test.ts`): **35 / 35 PASS** (`PASS=35 | WARN=0 | FAIL=0`, exit code `0`):

| Test ID | Description | Expected | Observed Outcome | Result |
|---|---|---|---|---|
| `CORE-01` | `GET /api/health` availability & DB connectivity | `200`, `dbOk=true` | `status=200, dbOk=true (77ms)` | **PASS** |
| `AUTH-01` | Seeded Admin login | `200` | `status=200` | **PASS** |
| `AUTH-02` | Multi-persona registration (seller, buyer, pro) | `201` each | `seller=201, buyer=201, pro=201` | **PASS** |
| `AUTH-03` | Per-phone OTP rate throttle (`POST /api/auth/otp/send`) | `429` after 4 rapid sends | `statuses=200,200,200,200,429` | **PASS** |
| `SEC-01` | Reject self-registration with `role=admin` | `400` | `status=400` | **PASS** |
| `SEC-02` | Reject `javascript:` URL in `PATCH /api/auth/me` `avatarUrl` | `400` | `status=400` | **PASS** |
| `SEC-03` | SQL injection payloads across 3 search endpoints | Safely parameterized, no 500 | 3 payloads x 3 endpoints clean | **PASS** |
| `SEC-04` | Reject polyglot HTML disguised as `image/png` | `400` | `status=400` | **PASS** |
| `SEC-05` | Reject SVG XSS upload | `400` | `status=400` | **PASS** |
| `SEC-06` | IDOR: prevent Buyer editing Seller property | `403` | `status=403` | **PASS** |
| `SEC-07` | KYC static block, cross-user IDOR, owner access, traversal block | `403, 403, 200, 400` | `static=403, idor=403, owner=200, traversal=400` | **PASS** |
| `SEC-08` | IDOR: prevent linking another user `propertyId` in `POST /api/projects` | `403` | `status=403` | **PASS** |
| `SEC-09` | IDOR: prevent outsider messaging private project thread | `403` | `status=403` | **PASS** |
| `SEC-10` | CSRF cross-site `Origin` and `Sec-Fetch-Site` rejection | `403` | `origin=403, fetchSite=403` | **PASS** |
| `SEC-11` | Revoked session cookie rejected after logout | `401` | `status=401` | **PASS** |
| `SEC-12` | Suspended user existing token immediately rejected | `401` | `status=401` | **PASS** |
| `SEC-13` | Prevent unengaged user posting verified review | `403` | `status=403` | **PASS** |
| `SEC-14` | `Content-Security-Policy` header enforced | `cspPresent=true` | `cspPresent=true` | **PASS** |
| `CRUD-01` | Valid PNG image upload & static retrieval | `201` upload, `200` fetch | `upload=201, fetch=200` | **PASS** |
| `CRUD-02` | Create property with Unicode + strip XSS `<` `>` + no default amenities | `201`, `sanitized=true` | `status=201, id=10, sanitized=true` | **PASS** |
| `EDGE-01` | Negative `limit=-1` on properties clamped safely | `200` | `status=200, returned=9` | **PASS** |
| `EDGE-02` | Non-numeric query params (`limit=abc&offset=xyz&minPrice=abc`) | `200` | `status=200` | **PASS** |
| `EDGE-03` | Non-numeric/negative pagination on Professionals & Work | `200` | `proStatus=200, workStatus=200` | **PASS** |
| `EDGE-04` | Non-numeric entity ID `GET /api/properties/notanumber` | `404` | `status=404` | **PASS** |
| `EDGE-05` | Admin PATCH non-existent property ID returns `404` | `404` | `status=404` | **PASS** |
| `EDGE-06` | Malformed JSON body returns `400` instead of `500` | `400` | `status=400` | **PASS** |
| `EDGE-07` | `PUT /api/properties/:id` rejects invalid status | `400` | `status=400` | **PASS** |
| `CONC-01` | Concurrent double save property does not 500 | `200, 200` | `statuses=200,200` | **PASS** |
| `CONC-02` | Concurrent double accept quotation allows only one winner | `200, 409` | `statuses=200,409, projectId=3` | **PASS** |
| `CONC-03` | Concurrent double complaint report allows only one winner | `201, 409` | `statuses=201,409` | **PASS** |
| `SEO-01` | `/robots.txt` returns `text/plain` with `Sitemap:` | `200`, `text/plain` | `status=200, ct=text/plain; charset=utf-8` | **PASS** |
| `SEO-02` | `/sitemap.xml` returns `application/xml` with approved property URL | `200`, `application/xml` | `status=200, hasProp=true` | **PASS** |
| `NOTIF-01` | Accepted quotation notification links to `/dashboard` | `/dashboard` | `links=/dashboard` | **PASS** |
| `PERF-01` | Core public GET endpoints respond under 150ms locally | `< 150ms` | `latenciesMs=6,4,2,2` | **PASS** |
| `DB-01` | Zero orphaned `property_images` rows | `orphans=0` | `orphans=0` | **PASS** |

---

## 2. Live Browser E2E & Responsive Verification (`http://localhost:3000`)

| Case | Route / Target | Viewport | Verified Behavior | Result |
|---|---|---|---|---|
| `UI-01` | `/` | `1366x768` | Title & canonical set (`http://localhost:3000/`). Clicking PropertyCard Compare button adds `"Compare (1/4)"` with toast, keeps route on `/`, zero nested-interactive warnings. | **PASS** |
| `UI-02` | `/properties/1`, `/properties/2` | `1366x768` | Rapid navigation returns HTTP `200`, updates `<title>` & `<link rel="canonical">`, long descriptions wrap (`740.26px` container width), zero HTTP >= 500. | **PASS** |
| `UI-03` | `/buy?city=Mumbai` -> `/buy` | `1366x768` | Initial filter `"Mumbai"` (`1 of 1`); clicking `Buy` navbar resets city filter to `""` (`5 of 5`). | **PASS** |
| `UI-04` | `/professionals?city=Bengaluru` -> `/professionals` | `1366x768` | Initial filter `"Bengaluru"` (`1 of 1`); clicking `Find Professionals` resets to `12 of 12 specialists`. | **PASS** |
| `UI-05` | `/login`, `/forgot-password` | `1366x768` | Single `<h1>` on desktop `/login`; `/forgot-password` shows friendly inline notice on submission with zero crashes. | **PASS** |
| `UI-06` | `/plans` | `1366x768` | Renders 4 membership plans; sandbox notice shows neutral text with zero raw `.env` key names exposed. | **PASS** |
| `MOB-01` | `/`, `/buy`, `/plans`, `/properties/1` | `320x568` & `375x812` | `scrollWidth <= innerWidth` across all 4 routes (`304.8px` at `320px`; `360.0px` at `375px`); CompareBar (`267.0px`) fits cleanly inside `320px`. | **PASS** |
| `A11Y-01` | Navbar Mobile Drawer | `320x568` | Toggle updates `aria-expanded` `"false"` -> `"true"`; pressing `Escape` closes drawer and restores `aria-expanded="false"`. | **PASS** |
