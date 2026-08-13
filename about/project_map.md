# 🗺️ PROJECT MAP — Smart EVM (Online Voting System)
> Based on actual code inspection. Nothing is invented.

---

## 1. TECHNOLOGY STACK (CONFIRMED FROM CODE)

| Layer | Technology | Evidence |
|---|---|---|
| **Frontend Framework** | React 18 + TypeScript | `client/package.json`, `client/src/main.tsx` |
| **Frontend Build Tool** | Vite | `client/vite.config.ts` |
| **Frontend Styling** | Tailwind CSS | `client/tailwind.config.js`, `client/src/index.css` |
| **Frontend Routing** | React Router DOM | `client/src/App.tsx` – `BrowserRouter`, `Routes`, `Route` |
| **Frontend Forms** | react-hook-form + Zod | `client/src/pages/auth/LoginPage.tsx` |
| **Frontend HTTP** | Axios | `client/src/lib/axios.ts` |
| **Frontend Animation** | Framer Motion | `client/src/pages/voting/VotingMachinePage.tsx` |
| **Frontend Charts** | Recharts | `client/src/pages/admin/AdminDashboard.tsx` |
| **Backend Framework** | Express.js + TypeScript | `server/src/app.ts` |
| **ORM** | Prisma | `server/prisma/schema.prisma` |
| **Database** | MySQL | `server/prisma/schema.prisma` – `provider = "mysql"` |
| **Authentication** | JWT (jsonwebtoken) + bcryptjs | `server/src/utils/jwt.ts`, `server/src/utils/crypto.ts` |
| **Validation** | Zod (server-side) | `server/src/middleware/validation.middleware.ts` |
| **File Upload** | Multer | `server/src/middleware/upload.middleware.ts` |
| **PDF Reports** | PDFKit | `server/src/services/report.service.ts` |
| **Excel Reports** | ExcelJS | `server/src/services/report.service.ts` |
| **Rate Limiting** | express-rate-limit | `server/src/app.ts` |
| **Security Headers** | Helmet | `server/src/app.ts` |
| **Logging** | Winston | `server/src/utils/logger.ts` |
| **Request Logging** | Morgan | `server/src/app.ts` |

---

## 2. ENTRY POINTS

| Entry Point | File | What it does |
|---|---|---|
| **Main App Entry** | `client/src/main.tsx` | Mounts React app into `<div id="root">` in `index.html` |
| **Frontend HTML** | `client/index.html` | The single HTML page loaded by the browser |
| **React App Root** | `client/src/App.tsx` | Defines ALL routes; wraps everything in `<BrowserRouter>` |
| **Backend Entry** | `server/src/index.ts` | Connects to DB, starts Express server on port **5000** |
| **Express App** | `server/src/app.ts` | Registers all middleware and all API route groups |

---

## 3. FOLDER STRUCTURE

```
DBMS_project/
│
├── Database.sql                   ← Raw SQL: creates tables manually (alternative to Prisma migrations)
├── README.md                      ← Project readme
├── learning_journal.md            ← Your personal notes file
│
├── client/                        ← ✅ ENTIRE FRONTEND (React)
│   ├── index.html                 ← Single HTML file (SPA entry)
│   ├── vite.config.ts             ← Vite build config (also proxies /api → backend)
│   ├── tailwind.config.js         ← Tailwind CSS configuration
│   ├── package.json               ← Frontend dependencies
│   └── src/
│       ├── main.tsx               ← React mount point
│       ├── App.tsx                ← Route definitions + auth guards
│       ├── index.css              ← Global CSS (Tailwind directives + custom styles)
│       │
│       ├── pages/                 ← Every "screen" the user sees
│       │   ├── auth/
│       │   │   └── LoginPage.tsx          ← Shared login for Commissioner + Officer
│       │   ├── admin/                     ← All Commissioner pages
│       │   │   ├── AdminDashboard.tsx     ← Stats, charts, quick actions
│       │   │   ├── ElectionsPage.tsx      ← Create/manage elections
│       │   │   ├── ConstituenciesPage.tsx ← Add constituencies to election
│       │   │   ├── PollingStationsPage.tsx← Add polling stations
│       │   │   ├── PartiesPage.tsx        ← Add political parties
│       │   │   ├── CandidatesPage.tsx     ← Add candidates + photo upload
│       │   │   ├── OfficersPage.tsx       ← Create election officer accounts
│       │   │   ├── VotersPage.tsx         ← Register voters
│       │   │   ├── ResultsPage.tsx        ← View/publish results
│       │   │   ├── ReportsPage.tsx        ← Download PDF/Excel reports
│       │   │   └── AuditLogsPage.tsx      ← View system audit trail
│       │   ├── officer/
│       │   │   └── OfficerDashboard.tsx   ← Officer's control panel
│       │   └── voting/
│       │       └── VotingMachinePage.tsx  ← THE FULL EVM (touchscreen machine UI)
│       │
│       ├── components/
│       │   └── ui/                ← Reusable UI components (StatCard, Skeleton, Spinner, etc.)
│       │
│       ├── layouts/               ← Page wrappers with sidebars
│       │   ├── AdminLayout.tsx    ← Admin sidebar + header wrapper
│       │   └── OfficerLayout.tsx  ← Officer sidebar + header wrapper
│       │
│       ├── services/              ← All API call functions (frontend)
│       │   ├── api.service.ts     ← All API services (elections, voters, voting, parties…)
│       │   └── auth.service.ts    ← Login, logout, token storage in localStorage
│       │
│       ├── hooks/
│       │   └── useAsync.ts        ← Custom React hooks: useAsync, useMutation, useCountdown
│       │
│       └── lib/
│           └── axios.ts           ← Axios instance with JWT interceptor + 401 handler
│
└── server/                        ← ✅ ENTIRE BACKEND (Express)
    ├── .env                       ← Environment variables (DB URL, JWT secret, etc.)
    ├── package.json               ← Backend dependencies
    ├── tsconfig.json              ← TypeScript config
    │
    ├── prisma/
    │   ├── schema.prisma          ← ⭐ DATABASE SCHEMA — defines ALL tables as models
    │   ├── seed.ts                ← Seeds demo data (commissioner, officer, etc.)
    │   └── migrations/            ← Auto-generated SQL migration files
    │
    └── src/
        ├── index.ts               ← Server entry: DB connect → app.listen on port 5000
        ├── app.ts                 ← Express setup: middleware stack + route mounting
        │
        ├── config/                ← Configuration
        │   ├── index.ts           ← Reads .env values, exports config object
        │   └── database.ts        ← Exports prisma client singleton
        │
        ├── routes/                ← URL routing (maps URL → controller function)
        │   ├── auth.routes.ts         POST /api/auth/login, logout, GET /profile
        │   ├── election.routes.ts     GET/POST/PUT/PATCH/DELETE /api/elections/*
        │   ├── management.routes.ts   /api/candidates, parties, constituencies, stations, officers
        │   ├── voter.routes.ts        /api/voters/*
        │   ├── voting.routes.ts       /api/voting/verify/*, /api/voting/cast, /api/voting/vvpat/*
        │   └── report.routes.ts       /api/reports/* (PDF + Excel downloads)
        │
        ├── controllers/           ← Receive HTTP request → call service/repo → send response
        │   ├── auth.controller.ts         login, logout, getProfile
        │   ├── election.controller.ts     create/update/delete/status/results/publish
        │   ├── candidate.controller.ts    CRUD + photo upload
        │   ├── party.controller.ts        CRUD + symbol upload
        │   ├── location.controller.ts     constituency + polling station CRUD
        │   ├── officer.controller.ts      create/update/delete officers
        │   ├── voter.controller.ts        register + manage voters
        │   ├── voting.controller.ts       verify voter, verifyOTP, castVote, getVVPAT
        │   └── audit.controller.ts        fetch audit logs
        │
        ├── services/              ← Business logic
        │   ├── auth.service.ts        login logic: bcrypt compare → JWT generate → audit log
        │   ├── verification.service.ts voter verification: Aadhaar/VoterID lookup + OTP (SIMULATION)
        │   └── report.service.ts      PDFKit + ExcelJS report generation
        │
        ├── repositories/          ← All database queries (Prisma calls)
        │   ├── user.repository.ts         findByEmail, findById, logLogin, updateLastLogin
        │   ├── voter.repository.ts        findAll, findByVoterId, findByAadhaarHash, markVoted
        │   ├── vote.repository.ts         castVote (TRANSACTION), getResults, getDashboardStats
        │   ├── election.repository.ts     findAll, findActive, create, update, getStats
        │   ├── candidate.repository.ts    CRUD for candidates
        │   ├── party.repository.ts        CRUD for political parties
        │   ├── constituency.repository.ts CRUD for constituencies
        │   ├── polling-station.repository.ts CRUD + machine status
        │   └── audit.repository.ts        create audit log entries
        │
        ├── middleware/            ← Code that runs between request and controller
        │   ├── auth.middleware.ts     authenticate (JWT verify) + authorize (role check)
        │   ├── validation.middleware.ts  Zod schemas + validate() wrapper
        │   ├── upload.middleware.ts    Multer config for photos/symbols
        │   └── error.middleware.ts    Global error handler + AppError class
        │
        └── utils/                 ← Pure utility functions
            ├── jwt.ts             generateAccessToken, generateRefreshToken, verifyAccessToken
            ├── crypto.ts          hashPassword, comparePassword (bcrypt), generateVoteHash (SHA-256), generateOTP, generateReferenceNumber
            ├── logger.ts          Winston logger (logs to file + console)
            └── response.ts        sendSuccess(), sendError() — standard JSON response format
```

---

## 4. DATABASE SCHEMA — TABLES (from `schema.prisma`)

| Table | Maps to Prisma Model | Purpose |
|---|---|---|
| `users` | `User` | All login accounts (Commissioner + Officer) |
| `election_commissioners` | `ElectionCommissioner` | Commissioner profile details |
| `election_officers` | `ElectionOfficer` | Officer profile + assigned polling station |
| `elections` | `Election` | Each election event (status, dates, type) |
| `constituencies` | `Constituency` | Voting areas within an election |
| `polling_stations` | `PollingStation` | Physical voting locations within a constituency |
| `political_parties` | `PoliticalParty` | Party name, abbreviation, symbol, color |
| `candidates` | `Candidate` | Each candidate (linked to constituency + party) |
| `voters` | `Voter` | Registered voters (linked to constituency + station) |
| `votes` | `Vote` | Each cast vote (voterId is UNIQUE — one vote per voter) |
| `digital_vvpat` | `DigitalVVPAT` | Digital paper audit trail record for each vote |
| `otp_verifications` | `OTPVerification` | OTP records for voter identity verification |
| `audit_logs` | `AuditLog` | Every system action (login, vote, create, publish…) |
| `login_logs` | `LoginLog` | Every login attempt (success or failure) |
| `notifications` | `Notification` | System notifications linked to elections |
| `settings` | `Setting` | Key-value system settings |

---

## 5. API ROUTES SUMMARY

```
POST   /api/auth/login                          ← No auth required
POST   /api/auth/logout                         ← Needs JWT
GET    /api/auth/profile                        ← Needs JWT

GET    /api/elections                            ← Needs JWT (any role)
GET    /api/elections/stats/dashboard            ← Needs JWT
GET    /api/elections/:id
GET    /api/elections/:id/stats
GET    /api/elections/:id/results
POST   /api/elections                            ← COMMISSIONER only
PUT    /api/elections/:id                        ← COMMISSIONER only
PATCH  /api/elections/:id/status                 ← COMMISSIONER only
POST   /api/elections/:id/publish-results        ← COMMISSIONER only
DELETE /api/elections/:id                        ← COMMISSIONER only

GET    /api/candidates                           ← Needs JWT
POST   /api/candidates                           ← COMMISSIONER only
PUT    /api/candidates/:id                       ← COMMISSIONER only
POST   /api/candidates/:id/photo                 ← COMMISSIONER only (file upload)
DELETE /api/candidates/:id                       ← COMMISSIONER only

GET    /api/parties                              ← Needs JWT
POST   /api/parties                              ← COMMISSIONER only
PUT    /api/parties/:id                          ← COMMISSIONER only
POST   /api/parties/:id/symbol                   ← COMMISSIONER only (file upload)
DELETE /api/parties/:id                          ← COMMISSIONER only

GET    /api/constituencies                       ← Needs JWT
POST   /api/constituencies                       ← COMMISSIONER only
PUT    /api/constituencies/:id                   ← COMMISSIONER only
DELETE /api/constituencies/:id                   ← COMMISSIONER only

GET    /api/polling-stations                     ← Needs JWT
GET    /api/polling-stations/:id/turnout         ← Needs JWT
POST   /api/polling-stations                     ← COMMISSIONER only
PUT    /api/polling-stations/:id                 ← COMMISSIONER only
PATCH  /api/polling-stations/:id/machine-status  ← Needs JWT (officer can call)
DELETE /api/polling-stations/:id                 ← COMMISSIONER only

GET    /api/officers                             ← COMMISSIONER only
POST   /api/officers                             ← COMMISSIONER only
PUT    /api/officers/:id                         ← COMMISSIONER only
DELETE /api/officers/:id                         ← COMMISSIONER only

GET    /api/voters                               ← Needs JWT
GET    /api/voters/:id                           ← Needs JWT
POST   /api/voters                               ← COMMISSIONER only
PUT    /api/voters/:id                           ← COMMISSIONER only
DELETE /api/voters/:id                           ← COMMISSIONER only

POST   /api/voting/verify/initiate               ← PUBLIC (no JWT — voting machine)
POST   /api/voting/verify/otp                    ← PUBLIC
POST   /api/voting/verify/biometric              ← PUBLIC (SIMULATION)
POST   /api/voting/cast                          ← PUBLIC
GET    /api/voting/vvpat/:referenceNumber        ← PUBLIC

GET    /api/reports/election/:id/summary/pdf     ← Needs JWT
GET    /api/reports/election/:id/results/excel   ← Needs JWT
GET    /api/reports/station/:id/voters/excel     ← Needs JWT
GET    /api/reports/audit-log/pdf                ← Needs JWT

GET    /api/audit-logs                           ← Needs JWT

GET    /health                                   ← No auth (server health check)
```

---

## 6. FRONTEND PAGES + ROUTES

| URL Path | Component | Who can access |
|---|---|---|
| `/` | `LoginPage.tsx` | Everyone (public) |
| `/voting-machine` | `VotingMachinePage.tsx` | Everyone (public) |
| `/vvpat` | `VvpatPage` (inline in App.tsx) | Everyone (public) |
| `/admin` | `AdminDashboard.tsx` | COMMISSIONER only |
| `/admin/elections` | `ElectionsPage.tsx` | COMMISSIONER only |
| `/admin/constituencies` | `ConstituenciesPage.tsx` | COMMISSIONER only |
| `/admin/polling-stations` | `PollingStationsPage.tsx` | COMMISSIONER only |
| `/admin/parties` | `PartiesPage.tsx` | COMMISSIONER only |
| `/admin/candidates` | `CandidatesPage.tsx` | COMMISSIONER only |
| `/admin/officers` | `OfficersPage.tsx` | COMMISSIONER only |
| `/admin/voters` | `VotersPage.tsx` | COMMISSIONER only |
| `/admin/results` | `ResultsPage.tsx` | COMMISSIONER only |
| `/admin/reports` | `ReportsPage.tsx` | COMMISSIONER only |
| `/admin/audit-logs` | `AuditLogsPage.tsx` | COMMISSIONER only |
| `/admin/notifications` | `PlaceholderPage` | COMMISSIONER (NOT IMPLEMENTED) |
| `/admin/settings` | `PlaceholderPage` | COMMISSIONER (NOT IMPLEMENTED) |
| `/officer` | `OfficerDashboard.tsx` | OFFICER only |
| `/officer/voters` | `VotersPage.tsx` | OFFICER only |
| `/officer/machine` | `PlaceholderPage` | OFFICER (NOT IMPLEMENTED) |

> **⚠️ NOT IMPLEMENTED:** `/admin/notifications`, `/admin/settings`, `/officer/machine` show placeholder pages — the code explicitly says `"This page is fully implemented in the system"` but they are empty shells with no real functionality.

---

## 7. IMPORTANT CONFIG FILES

| File | Purpose | Key Values |
|---|---|---|
| `server/.env` | Server environment config | DB URL, JWT secret, port, bcrypt rounds |
| `server/prisma/schema.prisma` | Database schema | All 16 tables defined as Prisma models |
| `client/vite.config.ts` | Vite build config | Likely proxies `/api` to `localhost:5000` |
| `client/tailwind.config.js` | Tailwind CSS config | Custom colors, fonts |
| `server/package.json` | Backend dependencies | express, prisma, jsonwebtoken, bcryptjs, pdfkit, exceljs… |
| `client/package.json` | Frontend dependencies | react, react-router-dom, axios, framer-motion, recharts… |

**Environment variables in `server/.env` (values hidden for secrets):**
- `PORT` = 5000
- `DATABASE_URL` = MySQL connection string
- `JWT_EXPIRES_IN` = 8 hours
- `JWT_REFRESH_EXPIRES_IN` = 7 days
- `BCRYPT_ROUNDS` = 12
- `RATE_LIMIT_WINDOW_MS` = 900000 ms (15 minutes)
- `RATE_LIMIT_MAX` = 200 requests per window
- `MAX_FILE_SIZE` = 5 MB

---

## 8. VOTING MACHINE SCREENS (from `VotingMachinePage.tsx`)

The voting machine is a **single page** (`VotingMachinePage.tsx`) that uses React `useState` to switch between 8 internal screens:

```
'welcome'     → Welcome screen with BEGIN VOTING button
'method'      → Choose: Aadhaar OR Voter ID
'verify'      → Enter Aadhaar number / Voter ID card number
'otp'         → Enter 6-digit OTP (SIMULATION — OTP shown on screen)
'biometric'   → Fingerprint / Face scan (SIMULATION — always succeeds)
'candidates'  → List of candidates — voter selects one
'confirm'     → Review selection, confirm vote
'vvpat'       → Digital VVPAT slip shown for 7 seconds → auto-reset
```

> **⚠️ IMPORTANT NOTE:** The `POLLING_STATION_ID` is **hard-coded as `1`** in the current code:
> ```typescript
> const POLLING_STATION_ID = 1;  // line 481 of VotingMachinePage.tsx
> ```
> In production, this would come from the officer's login session.

---

## 9. ARCHITECTURE DIAGRAM (ACTUAL)

```
┌─────────────────────────────────────────────────────────┐
│                      BROWSER                            │
│                                                         │
│  React 18 + TypeScript + Vite (port 5173)               │
│                                                         │
│  Pages:  LoginPage | AdminDashboard | VotingMachine...  │
│  Hooks:  useAsync() | useCountdown()                    │
│  State:  useState | localStorage (for JWT token)        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │  HTTP/HTTPS requests
                       │  via Axios (client/src/lib/axios.ts)
                       │  Header: Authorization: Bearer <JWT>
                       │  BaseURL: /api  (proxied by Vite to :5000)
                       ▼
┌─────────────────────────────────────────────────────────┐
│              EXPRESS.JS SERVER (port 5000)               │
│              server/src/app.ts                           │
│                                                         │
│  Global Middleware (applied to every request):          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Helmet (security headers)                      │    │
│  │  CORS (allows client:5173)                      │    │
│  │  Rate Limiter (200 req / 15 min)                │    │
│  │  JSON body parser                               │    │
│  │  Morgan (HTTP request logger)                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Route Files:                                           │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────┐  │
│  │ auth.routes  │  │election.routes │  │voting.routes│  │
│  │ /api/auth/*  │  │/api/elections/*│  │/api/voting/*│  │
│  └──────┬───────┘  └───────┬────────┘  └─────┬──────┘  │
│         │                  │                  │         │
│  Route Middleware:          │                  │         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  authenticate() → reads JWT from header          │   │
│  │  authorize()    → checks role (COMMISSIONER etc) │   │
│  │  validate()     → Zod schema validation          │   │
│  └──────────────────────────────────────────────────┘   │
│         │                                               │
│  Controllers: (receive req, call service/repo, send res)│
│  ┌─────────────────────────────────────────────────┐    │
│  │  AuthController | ElectionController            │    │
│  │  VotingController | CandidateController ...     │    │
│  └──────────────────────┬──────────────────────────┘    │
│                         │                               │
│  Services + Repositories: (business logic + DB queries) │
│  ┌─────────────────────────────────────────────────┐    │
│  │  AuthService       → comparePassword, genJWT    │    │
│  │  VerificationService → OTP logic (SIMULATION)   │    │
│  │  ReportService     → PDF + Excel generation     │    │
│  │  VoteRepository    → castVote() TRANSACTION      │    │
│  │  ElectionRepository| VoterRepository | ...      │    │
│  └──────────────────────┬──────────────────────────┘    │
└─────────────────────────┼───────────────────────────────┘
                          │
                          │  Prisma ORM
                          │  (auto-generates SQL from schema.prisma)
                          ▼
┌─────────────────────────────────────────────────────────┐
│               MySQL DATABASE                             │
│               Database: voting_system                    │
│                                                         │
│  Tables (16 total):                                     │
│  users, election_commissioners, election_officers,      │
│  elections, constituencies, polling_stations,           │
│  political_parties, candidates, voters, votes,          │
│  digital_vvpat, otp_verifications, audit_logs,          │
│  login_logs, notifications, settings                    │
└─────────────────────────────────────────────────────────┘
```

---

## 10. SECURITY MECHANISMS (CONFIRMED IN CODE)

| Mechanism | Status | Where |
|---|---|---|
| **JWT Access Token** | ✅ Implemented | `server/src/utils/jwt.ts` – expires in 8h |
| **JWT Refresh Token** | ✅ Implemented | `server/src/utils/jwt.ts` – expires in 7d |
| **bcrypt password hashing** | ✅ Implemented | `server/src/utils/crypto.ts` – 12 rounds |
| **SHA-256 vote hash** | ✅ Implemented | `server/src/utils/crypto.ts` – `generateVoteHash()` |
| **Role-Based Access Control** | ✅ Implemented | `server/src/middleware/auth.middleware.ts` – `authorize()` |
| **Zod input validation** | ✅ Implemented | `server/src/middleware/validation.middleware.ts` |
| **Rate limiting** | ✅ Implemented | `server/src/app.ts` – 200 req / 15 min |
| **Helmet security headers** | ✅ Implemented | `server/src/app.ts` |
| **Audit trail** | ✅ Implemented | `server/src/repositories/audit.repository.ts` |
| **Aadhaar hashed in DB** | ✅ Implemented | SHA-256 hash stored, not raw Aadhaar |
| **OTP verification** | ✅ Implemented (SIMULATION) | `server/src/services/verification.service.ts` |
| **Fingerprint/Face scan** | ⚠️ SIMULATION ONLY | Always returns success — no real hardware |
| **CSRF protection** | ❌ NOT IMPLEMENTED | No CSRF tokens in codebase |
| **Session timeout (auto-logout)** | ❌ NOT IMPLEMENTED | JWT expiry handles it, no active timer in frontend |

---

## 11. WHAT IS SIMULATED vs REAL

| Feature | Real or Simulated? | Details |
|---|---|---|
| OTP generation | ✅ Real logic, ⚠️ Simulated delivery | OTP is generated and stored in DB. But **shown on screen** instead of sent via SMS. `simulatedOtp` is returned in the API response. |
| Fingerprint scan | ⚠️ SIMULATION | `simulateBiometric()` in `verification.service.ts` always returns `{ verified: true }`. No real hardware integration. |
| Face recognition | ⚠️ SIMULATION | Same function — always succeeds. |
| Aadhaar DB lookup | ⚠️ Simulated government API | Does a local DB lookup against `aadhaarHash`. In real life, would call UIDAI API. |
| Vote hash (SHA-256) | ✅ REAL | `crypto.createHash('sha256')` — actual cryptographic hash. |
| bcrypt hashing | ✅ REAL | `bcrypt.hash()` with 12 salt rounds — actual secure hashing. |
| JWT tokens | ✅ REAL | Actual `jsonwebtoken` library — real signed tokens. |
| PDF generation | ✅ REAL | Actual PDFKit library streams a real PDF file. |
| Excel generation | ✅ REAL | Actual ExcelJS library — real .xlsx file. |
| Database transaction for vote | ✅ REAL | `prisma.$transaction()` — actual atomic DB transaction. |

---

> **📌 STOP — Project Map Complete.**
> 
> Ready for your next instruction. Ask me to explain any specific part in detail.
