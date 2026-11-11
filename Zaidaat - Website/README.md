# ZAIDAAT — All-India Property & Professional Services Marketplace

A complete, full-stack web platform combining an **All-India Property Marketplace** (Buy, Rent, Sell, Compare, Save, Enquire), **Professional Marketplace** (19+ skilled trades across India with portfolios, ratings & verification), **Work Marketplace** (Post jobs, apply, send itemized quotations, compare & hire), and **Project Hub** (budget tracking, hired pros, milestone updates, site photos & project messaging).

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite 6, Tailwind CSS, React Router, Lucide Icons (`http://localhost:3000`)
- **Backend:** Node.js + Express 4, TypeScript, Zod validation, Multer uploads, Helmet, CORS, Express Rate Limit (`http://127.0.0.1:4000`)
- **Database:** Built-in `node:sqlite` (`DatabaseSync`, WAL mode, Foreign Keys enforced) with versioned SQL migrations (`./data/zaidaat.db`)
- **Auth & Security:** HttpOnly JWT session cookies (`auth_sessions` revocation table), `bcryptjs` password hashing, Phone OTP flow (with dev fallback), Password Reset flow, optional Google OAuth 2.0, backend RBAC (`customer`, `professional`, `admin`) & ownership checks

---

## Quick Start on Windows (Double-Click)

1. Double-click **`START.bat`** in the project folder.
2. It automatically installs dependencies (if needed), runs database migrations + seed data (non-destructive), starts both the backend API (`4000`) and Vite frontend (`3000`), and opens **`http://localhost:3000`** in your browser.
3. To stop the servers: press `Ctrl + C` in the terminal window or double-click **`STOP.bat`**.

### Manual CLI Commands

```bash
npm install
npm --prefix client install
npm run migrate
npm run seed
npm run dev          # Starts API (:4000) + Frontend (:3000)
```

Production build & run (serves everything on port 3000):

```bash
npm run build
NODE_ENV=production npm start
```

Automated integration tests:

```bash
npm run test:api
```

---

## Seeded Demo Accounts (Local Development)

| Role | Email / Identifier | Password | Notes |
| --- | --- | --- | --- |
| Customer | `ananya.sharma@zaidaat.in` | `Zaidaat@123` | Has properties, jobs & active Bandra Project Hub |
| Customer 2 | `rohit.verma@zaidaat.in` | `Zaidaat@123` | Has Bengaluru villa & enquiries |
| Professional (Carpenter) | `vikram.carpenter@zaidaat.in` | `Zaidaat@123` | Verified profile, quotes & active project |
| Professional (Contractor) | `rajesh.thekedar@zaidaat.in` | `Zaidaat@123` | Delhi NCR turnkey contractor |
| Administrator | `admin@zaidaat.in` | `AdminZaidaat@123` | Full Admin Console access (`/admin`) |

*(You can also register brand-new accounts or use Mobile OTP login on `/login`.)*

---

## Environment Variables & Optional Integrations (`.env`)

See `.env.example` for all configuration options:

- **Core (pre-configured for localhost in `.env`):** `PORT=4000`, `CLIENT_PORT=3000`, `APP_URL=http://localhost:3000`, `DATABASE_PATH=./data/zaidaat.db`, `JWT_SECRET`
- **Google OAuth 2.0 (Optional):** Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to activate live Google Sign-In.
- **Phone SMS OTP (Optional):** Set `SMS_PROVIDER=twilio` (with `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) or `msg91`. In local development (`ALLOW_DEV_OTP=true`), OTP codes are safely logged to server console and previewed in the dev login banner.
- **Razorpay Subscriptions (Optional):** Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` for live payment checkout; defaults to safe development sandbox activation.
