# Smart EVM – Online Voting System

> **A complete, production-quality Electronic Voting Machine (EVM) simulation** built as a full-stack web application. This system simulates a real EVM with a secure administrative portal, election officer interface, and a touchscreen voting machine UI.

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Folder Structure](#3-project-folder-structure)
4. [Prerequisites](#4-prerequisites)
5. [Installation Guide](#5-installation-guide)
6. [Environment Variables](#6-environment-variables)
7. [Database Setup](#7-database-setup)
8. [Running the Project](#8-running-the-project)
9. [Opening the Web Application](#9-opening-the-web-application)
10. [Build for Production](#10-build-for-production)
11. [API Documentation](#11-api-documentation)
12. [Database Documentation](#12-database-documentation)
13. [User Manual](#13-user-manual)
14. [Security Features](#14-security-features)
15. [Troubleshooting](#15-troubleshooting)
16. [Future Enhancements](#16-future-enhancements)

---

## 1. Project Overview

**Smart EVM** is an educational simulation of an Electronic Voting Machine system. It demonstrates how a real-world government-grade voting platform could be architected and built.

### Main Objectives
- Simulate a complete election lifecycle from creation to result publication
- Provide three independent, role-specific interfaces
- Implement strong security practices (JWT, bcrypt, SHA-256 vote hashing)
- Generate verifiable digital VVPAT (Voter Verified Paper Audit Trail)
- Enable real-time monitoring and reporting

### Key Features
- ✅ Commissioner dashboard with 12 management modules
- ✅ Election officer portal with machine controls
- ✅ Full-screen touchscreen voting machine UI
- ✅ Simulated Aadhaar + OTP + biometric verification
- ✅ SHA-256 vote hashing for integrity
- ✅ Digital VVPAT with 7-second auto-display
- ✅ PDF and Excel report generation
- ✅ Complete audit trail
- ✅ Role-Based Access Control

> **Disclaimer**: All Aadhaar verification, fingerprint verification, face recognition, and OTP verification are simulations only. No real government databases or services are accessed.

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | ^18.3.1 | UI framework |
| TypeScript | ^5.2.2 | Type safety |
| Vite | ^5.3.1 | Build tool |
| Tailwind CSS | ^3.4.4 | Styling |
| React Router | ^6.24.0 | Client routing |
| React Hook Form | ^7.52.0 | Form management |
| Framer Motion | ^11.2.14 | Animations |
| Axios | ^1.7.2 | HTTP client |
| Recharts | ^2.12.7 | Charts |
| Zod | ^3.23.8 | Validation |
| Lucide React | ^0.395.0 | Icons |
| React Hot Toast | ^2.4.1 | Notifications |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | ≥18 | Runtime |
| Express.js | ^4.19.2 | HTTP framework |
| TypeScript | ^5.5.2 | Type safety |
| Prisma | ^5.14.0 | ORM |
| MySQL | 8.x | Database |
| JWT | jsonwebtoken ^9 | Authentication |
| bcryptjs | ^2.4.3 | Password hashing |
| PDFKit | ^0.15.0 | PDF generation |
| ExcelJS | ^4.4.0 | Excel generation |
| Multer | ^1.4.5 | File uploads |
| Winston | ^3.13.0 | Logging |
| Zod | ^3.23.8 | API validation |
| Helmet | ^7.1.0 | Security headers |

---

## 3. Project Folder Structure

```
DBMS_project/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/             # Shared UI components (Modal, StatCard, etc.)
│   │   ├── hooks/              # Custom React hooks (useAsync, useMutation, etc.)
│   │   ├── layouts/            # AdminLayout, OfficerLayout
│   │   ├── lib/                # Axios instance
│   │   ├── pages/
│   │   │   ├── admin/          # All admin management pages
│   │   │   ├── auth/           # Login page
│   │   │   ├── officer/        # Officer dashboard
│   │   │   └── voting/         # Voting machine UI
│   │   ├── services/           # API service layer (api.service.ts)
│   │   ├── App.tsx             # Router configuration
│   │   ├── main.tsx            # Entry point
│   │   └── index.css           # Global styles + Tailwind
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── postcss.config.js
│
├── server/                     # Express backend
│   ├── src/
│   │   ├── config/             # Config loader, Prisma client
│   │   ├── controllers/        # Request handlers
│   │   ├── middleware/         # Auth, error, upload, validation
│   │   ├── repositories/       # Database access layer
│   │   ├── routes/             # Express routers
│   │   ├── services/           # Business logic
│   │   ├── utils/              # JWT, crypto, logger, response
│   │   ├── app.ts              # Express app configuration
│   │   └── index.ts            # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma       # Full database schema (17 tables)
│   │   └── seed.ts             # Database seeder
│   ├── uploads/                # Uploaded files (auto-created)
│   ├── logs/                   # Application logs (auto-created)
│   ├── .env                    # Environment variables
│   ├── .env.example            # Template
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

---

## 4. Prerequisites

Before running the project, ensure you have the following installed:

| Requirement | Minimum Version | Download |
|------------|-----------------|---------|
| Node.js | 18.x LTS | https://nodejs.org |
| npm | 9.x | (bundled with Node) |
| MySQL Server | 8.0+ | https://dev.mysql.com/downloads |
| Git | Latest | https://git-scm.com |

**Recommended Tools:**
- VS Code: https://code.visualstudio.com
- MySQL Workbench (optional): https://www.mysql.com/products/workbench
- Postman (optional, for API testing): https://www.postman.com

---

## 5. Installation Guide

### Step 1 – Clone the Repository
```bash
git clone <your-repo-url>
cd DBMS_project
```

### Step 2 – Install Server Dependencies
```bash
cd server
npm install
```

### Step 3 – Install Client Dependencies
```bash
cd ../client
npm install
```

### Step 4 – Configure Environment Variables
```bash
cd ../server
copy .env.example .env
```
Open `.env` and update the `DATABASE_URL` with your MySQL credentials.

### Step 5 – Create MySQL Database
```sql
CREATE DATABASE voting_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 6 – Run Prisma Migrations
```bash
cd server
npx prisma migrate dev --name init
```

### Step 7 – Generate Prisma Client
```bash
npx prisma generate
```

### Step 8 – Seed the Database
```bash
npm run db:seed
```

---

## 6. Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `DATABASE_URL` | MySQL connection string | `mysql://root:password@localhost:3306/voting_system` |
| `JWT_SECRET` | JWT signing key (min 32 chars) | *(must change)* |
| `JWT_EXPIRES_IN` | Access token expiry | `8h` |
| `JWT_REFRESH_SECRET` | Refresh token key | *(must change)* |
| `JWT_REFRESH_EXPIRES_IN` | Refresh expiry | `7d` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `UPLOAD_PATH` | File upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `5242880` (5 MB) |
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Max requests per window | `200` |
| `LOG_LEVEL` | Winston log level | `info` |
| `LOG_FILE` | Log file path | `./logs/app.log` |

> ⚠️ **Important**: Change `JWT_SECRET` and `JWT_REFRESH_SECRET` to secure random strings before production deployment.

---

## 7. Database Setup

### Create Database
```sql
-- Connect to MySQL and run:
CREATE DATABASE voting_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'evm_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON voting_system.* TO 'evm_user'@'localhost';
FLUSH PRIVILEGES;
```

### Run Migrations
```bash
cd server
npx prisma migrate dev --name init
```

### Generate Prisma Client
```bash
npx prisma generate
```

### Seed Initial Data
```bash
npm run db:seed
```

This creates:
- Default Commissioner account
- Default Election Officer account
- Sample election, constituency, polling station
- 3 political parties + 4 candidates
- 20 sample voters

### Open Prisma Studio (Optional)
```bash
npm run db:studio
# Opens browser UI at http://localhost:5555
```

---

## 8. Running the Project

### Start Backend Server
```bash
cd server
npm run dev
# Server starts at http://localhost:5000
```

### Start Frontend Development Server
```bash
cd client
npm run dev
# Client starts at http://localhost:5173
```

### Verify Both Are Running
- Backend health check: http://localhost:5000/health → `{"status":"ok"}`
- Frontend: http://localhost:5173 → Login page

---

## 9. Opening the Web Application

Open **http://localhost:5173** in your browser.

You will see the **Login page** with a role selector:

### Default Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Election Commissioner | commissioner@evm.gov.in | Admin@12345 |
| Election Officer | officer1@evm.gov.in | Officer@12345 |

### Available Interfaces

1. **Election Commissioner** → `/admin` → Full management dashboard
2. **Election Officer** → `/officer` → Station management + machine controls
3. **Touchscreen Voting Machine** → `/voting-machine` → Full-screen EVM UI

---

## 10. Build for Production

### Build Backend
```bash
cd server
npm run build
# Compiled to server/dist/
npm start   # Run production build
```

### Build Frontend
```bash
cd client
npm run build
# Output in client/dist/
```

---

## 11. API Documentation

### Base URL: `http://localhost:5000/api`

#### Authentication
| Method | URL | Description | Auth |
|--------|-----|-------------|------|
| POST | `/auth/login` | Login (commissioner or officer) | ❌ |
| POST | `/auth/logout` | Logout | ✅ |
| GET | `/auth/profile` | Get current user profile | ✅ |

#### Elections
| Method | URL | Description | Role |
|--------|-----|-------------|------|
| GET | `/elections` | List all elections | Any |
| GET | `/elections/:id` | Get election details | Any |
| GET | `/elections/:id/stats` | Get election statistics | Any |
| GET | `/elections/:id/results` | Get election results | Any |
| GET | `/elections/stats/dashboard` | Dashboard statistics | Any |
| POST | `/elections` | Create election | Commissioner |
| PUT | `/elections/:id` | Update election | Commissioner |
| PATCH | `/elections/:id/status` | Change status | Commissioner |
| POST | `/elections/:id/publish-results` | Publish results | Commissioner |
| DELETE | `/elections/:id` | Delete election | Commissioner |

#### Constituencies
| Method | URL | Description | Role |
|--------|-----|-------------|------|
| GET | `/constituencies` | List constituencies | Any |
| POST | `/constituencies` | Create constituency | Commissioner |
| PUT | `/constituencies/:id` | Update | Commissioner |
| DELETE | `/constituencies/:id` | Delete | Commissioner |

#### Polling Stations
| Method | URL | Description | Role |
|--------|-----|-------------|------|
| GET | `/polling-stations` | List stations | Any |
| GET | `/polling-stations/:id/turnout` | Get turnout stats | Any |
| POST | `/polling-stations` | Create | Commissioner |
| PATCH | `/polling-stations/:id/machine-status` | Update machine status | Any |
| DELETE | `/polling-stations/:id` | Delete | Commissioner |

#### Candidates & Parties
| Method | URL | Description | Role |
|--------|-----|-------------|------|
| GET | `/candidates` | List candidates | Any |
| POST | `/candidates` | Register candidate | Commissioner |
| POST | `/candidates/:id/photo` | Upload photo | Commissioner |
| GET | `/parties` | List parties | Any |
| POST | `/parties` | Create party | Commissioner |
| POST | `/parties/:id/symbol` | Upload symbol | Commissioner |

#### Officers
| Method | URL | Description | Role |
|--------|-----|-------------|------|
| GET | `/officers` | List officers | Commissioner |
| POST | `/officers` | Register officer | Commissioner |
| PUT | `/officers/:id` | Update officer | Commissioner |
| DELETE | `/officers/:id` | Delete officer | Commissioner |

#### Voters
| Method | URL | Description | Role |
|--------|-----|-------------|------|
| GET | `/voters` | List voters (paginated) | Any |
| POST | `/voters` | Register voter | Commissioner |
| DELETE | `/voters/:id` | Remove voter | Commissioner |

#### Voting Machine
| Method | URL | Description | Auth |
|--------|-----|-------------|------|
| POST | `/voting/verify/initiate` | Start verification | ❌ |
| POST | `/voting/verify/otp` | Verify OTP | ❌ |
| POST | `/voting/verify/biometric` | Biometric simulation | ❌ |
| POST | `/voting/cast` | Cast vote | ❌ |
| GET | `/voting/vvpat/:referenceNumber` | Get VVPAT | ❌ |

#### Reports (Commissioner only)
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/reports/election/:id/summary/pdf` | Election summary PDF |
| GET | `/reports/election/:id/results/excel` | Results Excel |
| GET | `/reports/station/:id/voters/excel` | Voters list Excel |
| GET | `/reports/audit-log/pdf` | Audit log PDF |

---

## 12. Database Documentation

### Tables Overview

| Table | Purpose |
|-------|---------|
| `users` | Authentication credentials and role |
| `election_commissioners` | Commissioner profiles |
| `election_officers` | Officer profiles + station assignment |
| `elections` | Election definitions and status |
| `constituencies` | Geographic constituencies |
| `polling_stations` | Voting locations + machine status |
| `political_parties` | Party registry |
| `candidates` | Election candidates |
| `voters` | Voter register |
| `votes` | Cast votes (anonymized) |
| `digital_vvpat` | VVPAT audit trail |
| `otp_verifications` | OTP records |
| `audit_logs` | System-wide audit trail |
| `login_logs` | Login attempt history |
| `notifications` | System notifications |
| `settings` | Application configuration |

### Key Relationships
- `Election → Constituency → PollingStation`
- `Constituency → Candidate ← PoliticalParty`
- `PollingStation → Voter → Vote → DigitalVVPAT`
- `User → ElectionOfficer → PollingStation`

---

## 13. User Manual

### Election Commissioner

#### Create an Election
1. Log in at http://localhost:5173 with Commissioner credentials
2. Navigate to **Elections** in the sidebar
3. Click **New Election**, fill in name, type, and scheduled date
4. Click **Create Election**

#### Full Election Setup Workflow
1. Create **Constituencies** (link to election)
2. Create **Polling Stations** (link to constituency)
3. Create **Political Parties** (upload symbols)
4. Register **Candidates** (link to constituency + party, upload photos)
5. Register **Election Officers** (assign to polling stations)
6. Register **Voters** (assign to constituency + station)
7. Change election status to **Scheduled → Active**
8. Monitor via Dashboard

#### Publish Results
1. Wait for election status to become **Closed**
2. Navigate to **Elections**, click the **BarChart** icon
3. Results immediately become visible on the **Results** page

### Election Officer

#### Start Voting Session
1. Log in with Officer credentials
2. Click **Start Voting** on the dashboard
3. Machine status changes to **ACTIVE**

#### Machine Controls
- **Lock Machine**: Temporarily prevent voting
- **Pause Voting**: Suspend session (can resume)
- **Close Polling**: Permanently end the session

### Voter

1. Open Voting Machine at http://localhost:5173/voting-machine
2. Click **BEGIN VOTING**
3. Select **Aadhaar** or **Voter ID** verification
4. Enter your details and click **Verify & Send OTP**
5. Enter the displayed OTP (simulation shows it on screen)
6. Select your candidate and click **VOTE FOR [NAME]**
7. Review the confirmation screen → click **Confirm Vote**
8. View the **Digital VVPAT slip** (auto-dismisses in 7 seconds)

---

## 14. Security Features

| Feature | Implementation |
|---------|---------------|
| JWT Authentication | HS256 signed tokens, 8-hour expiry |
| Password Hashing | bcrypt with 12 rounds |
| Role-Based Access Control | Commissioner / Officer roles enforced per route |
| SQL Injection Prevention | Prisma ORM parameterized queries |
| Input Validation | Zod schemas on all API endpoints |
| Security Headers | Helmet.js (CSP, HSTS, etc.) |
| Rate Limiting | 200 requests per 15 minutes |
| SHA-256 Vote Hash | Each vote generates a unique cryptographic hash |
| One Voter One Vote | Database unique constraint on `votes.voterId` |
| Audit Logging | All actions logged with user, IP, timestamp |
| Result Locking | Results only visible after commissioner publishes |
| CORS | Restricted to `CLIENT_URL` only |
| Vote Integrity | Votes cast inside a database transaction (ACID) |

---

## 15. Troubleshooting

### Port already in use
```bash
# Change PORT in server/.env
PORT=5001
# Change port in client/vite.config.ts → server.port
```

### MySQL connection failed
- Verify MySQL is running: `net start MySQL80`
- Check `DATABASE_URL` in `server/.env`
- Ensure database `voting_system` exists

### Prisma migration errors
```bash
cd server
npx prisma migrate reset   # Reset all migrations (dev only)
npx prisma migrate dev
```

### Missing Prisma client
```bash
cd server
npx prisma generate
```

### Environment variable issues
- Ensure `server/.env` exists (not just `.env.example`)
- Restart the server after changing `.env`

### CORS errors
- Verify `CLIENT_URL=http://localhost:5173` in `server/.env`
- Ensure frontend and backend are running on correct ports

### Voting machine shows "Machine not active"
- Officer must log in and click **Start Voting** first
- Or Commissioner must set polling station machine status to ACTIVE

### Voter not found during verification
- Ensure voter is seeded: `npm run db:seed`
- Use Voter ID format: `DL/01/001/0001` through `DL/01/001/0020`

---

## 16. Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| Real Aadhaar API | Integrate with UIDAI sandbox for real verification |
| Fingerprint Device | Connect physical biometric scanner |
| QR Code Verification | Scan voter QR code instead of manual entry |
| SMS OTP | Integrate Twilio/AWS SNS for real SMS delivery |
| Live Analytics | WebSocket-powered real-time dashboard |
| Multi-language | Hindi, Tamil, Telugu, Bengali support |
| PWA | Progressive Web App for offline resilience |
| Cloud Deployment | AWS/Azure Kubernetes deployment guide |
| Multi-factor Auth | TOTP (Google Authenticator) for commissioners |
| Blockchain Audit | Immutable vote ledger using blockchain |
| AI Anomaly Detection | Flag suspicious voting patterns |
| Accessibility | Screen reader support, high contrast mode |

---

## License

This project is built for **educational purposes** as a Database Management Systems demonstration.

© 2025 Smart EVM – Educational Simulation. Not affiliated with Election Commission of India.
