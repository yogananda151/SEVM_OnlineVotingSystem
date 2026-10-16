# Smart EVM – Full-Stack Online Voting System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.110-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10%2B%20%7C%203.14-3776AB.svg?logo=python&logoColor=white)](https://www.python.org)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Bundler-Vite%205-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![MySQL](https://img.shields.io/badge/Database-MySQL%208.x%2F9.x-4479A1.svg?logo=mysql&logoColor=white)](https://www.mysql.com)
[![OpenCV](https://img.shields.io/badge/AI%20Biometrics-OpenCV%20YuNet%20%2B%20SFace-5C3EE8.svg?logo=opencv&logoColor=white)](https://opencv.org)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

> **A secure, end-to-end Electronic Voting Machine (EVM) simulation and Electoral Management System** built with **FastAPI**, **SQLAlchemy 2.0**, **MySQL**, **React 18**, and **OpenCV Deep Learning Face Recognition**.
> 
> Developed as a comprehensive Database Management Systems (DBMS) project simulating a government-grade digital election infrastructure with 3 isolated role-specific portals, tamper-evident cryptographic voting, digital VVPAT, and multi-factor biometric authentication.

---

## 📋 Table of Contents

1. [Project Overview & Key Capabilities](#1-project-overview--key-capabilities)
2. [Architecture & Technology Stack](#2-architecture--technology-stack)
3. [Deep Learning Face Biometrics](#3-deep-learning-face-biometrics)
4. [Project Directory Structure](#4-project-directory-structure)
5. [Prerequisites](#5-prerequisites)
6. [Quick Start Guide](#6-quick-start-guide)
7. [Step-by-Step Installation](#7-step-by-step-installation)
8. [Configuration & Environment Variables](#8-configuration--environment-variables)
9. [Database Setup & Seeding](#9-database-setup--seeding)
10. [Default Credentials & Portals](#10-default-credentials--portals)
11. [Core Workflows & User Guides](#11-core-workflows--user-guides)
12. [Relational Database Schema (19 Tables)](#12-relational-database-schema-19-tables)
13. [API Documentation (Interactive Swagger)](#13-api-documentation-interactive-swagger)
14. [Security, Integrity & Auditing](#14-security-integrity--auditing)
15. [Troubleshooting & FAQs](#15-troubleshooting--faqs)
16. [Cloud Deployment Guide (Vercel + Render + TiDB Cloud)](#16-cloud-deployment-guide-vercel--render--tidb-cloud)
17. [Academic Disclaimer](#17-academic-disclaimer)

---

## 1. Project Overview & Key Capabilities

The **Smart EVM** project simulates an enterprise-scale electoral system designed to address voter identity verification, operational integrity, and real-time tabulation while preserving ballot secrecy.

### 🌟 Core Capabilities
- **Three Specialized Portals**:
  1. **Chief Election Commissioner Portal (`/admin`)**: Complete electoral lifecycle governance, geographic hierarchy management, candidate and party registration, voter roll administration with photo enrollment, Excel bulk operations, and real-time turnout analytics.
  2. **Polling Officer Console (`/officer`)**: Local polling station monitoring, biometric voter identity verification, and machine authorization (Lock, Activate, Pause, Close).
  3. **Touchscreen EVM Kiosk (`/voting-machine`)**: An intuitive, high-contrast, distraction-free ballot interface with audio cues, confirmation popups, and automated digital VVPAT generation.
- **Multi-Factor Biometric Voter Authentication**:
  - **Step 1**: Voter ID / Aadhaar Number lookup with strict uniqueness validation.
  - **Step 2**: Time-sensitive dynamic OTP verification.
  - **Step 3**: Real-time facial biometric matching using OpenCV YuNet face detection and SFace deep neural network 128D embeddings.
- **Strict Anti-Fraud & Uniqueness Rules**:
  - Enforced unique database constraints on `voterId` and `aadhaarHash` across manual registration, updates, and Excel bulk uploads.
  - Single-vote enforcement (`votes.voterId` unique constraint and `election_voter_statuses`).
- **Cryptographic Vote Integrity**:
  - Every cast ballot generates an irreversible SHA-256 digital signature computed from ballot reference, voter token, candidate ID, and timestamp.
  - Generates a **Digital VVPAT (Voter Verified Paper Audit Trail)** slip displayed for 7 seconds before being committed into the immutable audit repository.
- **Comprehensive Reporting & Export**:
  - Automated PDF generation for Election Summaries and Audit Trails via **ReportLab**.
  - Dynamic Excel spreadsheet import/export for Candidates, Polling Officers, and Voter Rosters via **OpenPyXL**.

---

## 2. Architecture & Technology Stack

```
┌───────────────────────────────────────────────────────────┐
│              Client Application (Port 5173)               │
│    React 18 • TypeScript • Tailwind CSS • Framer Motion   │
│       Vite Dev Proxy: /api/*  ──>  http://localhost:5000  │
└─────────────────────────────┬─────────────────────────────┘
                              │ HTTP / JSON REST
                              ▼
┌───────────────────────────────────────────────────────────┐
│               FastAPI Backend (Port 5000)                 │
│      Python 3.10+ / 3.14 • Uvicorn ASGI Server            │
│  - Routers: Auth, Elections, Management, Voters, Voting   │
│  - Security: PyJWT (HS256), Bcrypt, HMAC-SHA256           │
│  - Services: Voter/Candidate Excel, PDF Reports           │
└──────────────┬─────────────────────────────┬──────────────┘
               │                             │
               ▼                             ▼
┌──────────────────────────────┐ ┌───────────────────────────┐
│   OpenCV AI Biometrics       │ │ MySQL Database (Port 3306)│
│  YuNet (Face Detection & 5pt)│ │ SQLAlchemy 2.0 + PyMySQL │
│  SFace (128D Embedding NN)   │ │ 19 Relational Tables      │
│  Cosine Distance Verification│ │ ACID Transaction Control  │
└──────────────────────────────┘ └───────────────────────────┘
```

### Frontend Stack
| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | React | `^18.3.1` | Component-based UI with hooks & state management |
| **Language** | TypeScript | `^5.2.2` | End-to-end static typing and interface contracts |
| **Build Tool** | Vite | `^5.3.1` | Ultra-fast HMR and build bundling |
| **Styling** | Tailwind CSS | `^3.4.4` | Utility-first responsive design and dark-mode styling |
| **Animations** | Framer Motion | `^11.2.14`| Smooth page transitions, modals, and EVM interactions |
| **Icons** | Lucide React | `^0.395.0`| Crisp SVG icons for dashboards and EVM controls |
| **Forms & Validation** | React Hook Form + Zod | `^7.52` / `^3.23` | Schema validation for voter registration, elections, etc. |
| **Data Visualization**| Recharts | `^2.12.7` | Dynamic turnout, candidate vote distribution charts |
| **Notifications** | React Hot Toast | `^2.4.1` | Interactive toast notifications for errors & confirmations |
| **HTTP Client** | Axios | `^1.7.2` | Intercepted client with automatic JWT token management |

### Backend Stack
| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | FastAPI | `^0.110.0`| High-performance async Python web framework |
| **ASGI Server** | Uvicorn | `^0.28.0` | Production-grade ASGI runner with auto-reload |
| **ORM** | SQLAlchemy | `^2.0.25` | Modern 2.0-style relational mapping and transactions |
| **DB Driver** | PyMySQL | `^1.1.0` | Pure-Python MySQL client (zero C-compiler requirements) |
| **Data Validation** | Pydantic v2 | `^2.6.0` | Strict request/response parsing and serialization |
| **Authentication** | PyJWT | `^2.8.0` | Cryptographic access (8h) & refresh (7d) JWT tokens |
| **Password Hashing** | Bcrypt | `^4.1.0` | Salted SHA-512/blowfish password hashing |
| **Data Processing** | OpenPyXL | `^3.1.2` | Excel bulk ingestion & structured export generation |
| **PDF Generation** | ReportLab | `^4.1.0` | Vector-rendered electoral summary and audit certificates |
| **Computer Vision** | OpenCV (`opencv-python`) | `^4.9.0` | Face detection, landmark alignment, and embedding extraction |
| **Numerics** | NumPy | `^2.0.0` | Matrix math for 128-dimensional embedding comparisons |

---

## 3. Deep Learning Face Biometrics

The system employs real, production-grade deep learning facial recognition rather than simplistic pixel comparisons:

```
[ Camera Stream / Upload ]
           │
           ▼
┌──────────────────────────────────────┐
│  OpenCV YuNet (FaceDetectorYN)       │
│  - Scale-invariant face detection    │
│  - 5-point landmark localization     │
│    (Eyes, Nose, Mouth Corners)       │
└──────────────────┬───────────────────┘
                   │ Bounding Box + Landmarks
                   ▼
┌──────────────────────────────────────┐
│  OpenCV SFace (FaceRecognizerSF)     │
│  - Affine face alignment & crop      │
│  - Deep Neural Network feature extractor│
│  - Outputs 128-dimensional embedding │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Cosine Distance Metric              │
│  Threshold: 0.363 (~63.7% Cosine Sim)│
│  - Match < 0.363  ──> Authorized ✅  │
│  - Match >= 0.363 ──> Blocked 401 ❌ │
└──────────────────────────────────────┘
```

1. **Detection & Alignment (`YuNet`)**:
   - Model: `face_detection_yunet_2023mar.onnx`
   - Detects face coordinates, bounding box confidence, and 5 facial landmarks (right eye, left eye, nose tip, right mouth corner, left mouth corner).
2. **Feature Extraction (`SFace`)**:
   - Model: `face_recognition_sface_2021dec.onnx`
   - Aligns face orientation based on eye coordinates and projects the facial characteristics into a 128-dimensional hyperspace embedding.
3. **Cosine Distance Matcher**:
   - Compares the live voting camera capture against the registered voter photo stored during enrollment.
   - Genuine matches typically yield cosine similarity $\ge 95\%$. Impersonators or different individuals are strictly rejected with HTTP 401.
4. **Auto-Downloader**:
   - Both ONNX models are automatically downloaded into `server/app/models_cv/` using `server/scripts/download_models.py`.

---

## 4. Project Directory Structure

```
DBMS_project/
├── client/                               # React 18 + Vite Frontend
│   ├── public/                           # Static icons and assets
│   ├── src/
│   │   ├── components/                   # Modals, Navbar, StatCards, ErrorBoundary
│   │   ├── layouts/                      # AdminLayout, OfficerLayout
│   │   ├── lib/                          # Axios instance, validation errors, face biometrics
│   │   ├── pages/
│   │   │   ├── admin/                    # 12 Commissioner management modules
│   │   │   ├── auth/                     # Unified role login page
│   │   │   ├── officer/                  # Station officer console & machine controls
│   │   │   └── voting/                   # Full-screen EVM ballot kiosk & VVPAT page
│   │   ├── services/                     # Typed API client services
│   │   ├── App.tsx                       # Client-side router configuration
│   │   ├── main.tsx                      # Frontend application entry point
│   │   └── index.css                     # Tailwind styling tokens
│   ├── package.json                      # Frontend dependencies & scripts
│   ├── tailwind.config.js                # Custom palette, animations, fonts
│   └── vite.config.ts                    # Vite config with API proxy
│
├── server/                               # Python FastAPI Backend
│   ├── app/
│   │   ├── config.py                     # Pydantic environment settings
│   │   ├── database.py                   # SQLAlchemy 2.0 engine & session maker
│   │   ├── main.py                       # FastAPI application & error handlers
│   │   ├── models/                       # 19 SQLAlchemy ORM models
│   │   ├── models_cv/                    # OpenCV YuNet & SFace ONNX neural networks
│   │   ├── schemas/                      # Pydantic v2 validation schemas
│   │   ├── middleware/                   # JWT auth guard & exception handlers
│   │   ├── routers/                      # REST endpoints (auth, elections, voters, etc.)
│   │   ├── services/                     # Excel import/export, voting, verification
│   │   └── utils/                        # Face matcher, crypto, JWT, logger
│   ├── scripts/
│   │   ├── download_models.py            # Automatic ONNX weights downloader
│   │   ├── seed.py                       # Master database seeder
│   │   ├── generate_candidates_excel.py  # Sample candidates generator
│   │   ├── generate_officers_excel.py    # Sample officers generator
│   │   └── reset_db.py                   # Clean database reset utility
│   ├── uploads/                          # Stored photos (voters, candidates, party symbols)
│   ├── logs/                             # System execution logs (app.log)
│   ├── .env                              # Active environment configuration
│   ├── .env.example                      # Configuration template
│   ├── requirements.txt                  # Python package requirements
│   ├── run.py                            # Uvicorn entry script
│   └── package.json                      # Monorepo runner alias
│
├── about/                                # Project documentation & presentation assets
│   ├── CLIENT_FILE_GUIDE.md              # Detailed React architecture guide
│   ├── Database.sql                      # Pure MySQL schema dump
│   ├── ER_Complete.svg                   # Full Entity-Relationship diagram
│   ├── ER_Presentation.svg               # Simplified ER diagram for slides
│   ├── UML_UseCaseDiagram.svg            # System use-case diagram
│   └── ppt_content.md                    # Project presentation outline
│
├── candidates.xlsx                       # Pre-formatted candidate spreadsheet
├── political_parties.xlsx                # Pre-formatted political parties dataset
├── polling_officers.xlsx                 # Pre-formatted polling officers roster
├── voters.xlsx                           # Pre-formatted voter registry
├── run_project.bat                       # One-click Windows runner (starts DB, server & client)
├── run_backend.bat                       # Dedicated FastAPI backend launcher
├── start_mysql.bat                       # Self-elevating Windows MySQL service starter
├── package.json                          # Root monorepo script runner
└── README.md                             # Complete project documentation (this file)
```

---

## 5. Prerequisites

Before setting up the project, make sure the following dependencies are installed:

| Tool | Minimum Version | Download Link |
| :--- | :--- | :--- |
| **Python** | `3.10+` (Tested on `3.14`) | [python.org/downloads](https://www.python.org/downloads/) |
| **Node.js & npm** | Node `18.x LTS` / npm `9.x` | [nodejs.org](https://nodejs.org/) |
| **MySQL Server** | `8.0` or `9.x` | [dev.mysql.com/downloads](https://dev.mysql.com/downloads/installer/) |
| **Webcam** | Built-in or USB webcam | *Required for live voter facial recognition* |

---

## 6. Quick Start Guide

### Option A: One-Click Startup (Recommended for Windows)

1. **Start the MySQL Service**:
   Double-click `start_mysql.bat` in the project root.
   *(This script automatically prompts for administrator rights, starts the `MySQL97` or `MySQL` service, and reports readiness).*

2. **Launch Full Stack Application**:
   Double-click `run_project.bat` in the project root.
   *(This launches the Python FastAPI backend and Vite React development server concurrently).*

3. **Open the Application**:
   Navigate to **`http://localhost:5173`** in your web browser.

---

### Option B: Monorepo npm Scripts

From the root `DBMS_project/` folder:

```powershell
# 1. Run both Server and Client concurrently:
npm run dev

# 2. Or run them individually:
npm run dev:server   # Starts Python FastAPI backend on port 5000
npm run dev:client   # Starts Vite React frontend on port 5173
```

---

## 7. Step-by-Step Installation

If you are setting up the project for the first time or on a new computer:

### Step 1: Clone or Open the Repository
```powershell
cd D:\Yoga\DBMS\DBMS_project
```

### Step 2: Install Root Dependencies
```powershell
npm install
```

### Step 3: Configure Backend Virtual Environment & Dependencies
```powershell
cd server

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Or Windows Command Prompt:
.\venv\Scripts\activate.bat

# Upgrade pip & install all required packages
pip install --upgrade pip
pip install -r requirements.txt

# Download OpenCV YuNet and SFace neural network weights
python scripts/download_models.py
```

### Step 4: Configure Frontend Dependencies
```powershell
cd ..\client
npm install
```

---

## 8. Configuration & Environment Variables

The backend loads its configuration from `server/.env`. If the file does not exist, copy it from `server/.env.example`:

```powershell
cd server
copy .env.example .env
```

### Key Environment Settings:
```ini
# Server Environment
ENV=development
PORT=5000
HOST=0.0.0.0

# MySQL Database Connection (URL-encoded if password contains '@')
DATABASE_URL=mysql+pymysql://root:YourPassword@localhost:3306/voting_system

# JWT Authentication
JWT_SECRET=smart_evm_super_secret_jwt_key_2025_min_32_chars
JWT_EXPIRES_IN=8h
JWT_REFRESH_SECRET=smart_evm_refresh_secret_key_2025_min_32_chars
JWT_REFRESH_EXPIRES_IN=7d

# Aadhaar Simulation HMAC Secret
AADHAAR_HMAC_SECRET=smart_evm_aadhaar_hmac_secret_2025_change_in_production

# Client Application URL (CORS origin)
CLIENT_URL=http://localhost:5173

# File Storage & Limits
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Logging
LOG_LEVEL=INFO
LOG_FILE=./logs/app.log
```

> [!NOTE]
> If your MySQL password contains special characters like `@` or `#` (e.g. `Pass@123`), the application configuration automatically encodes it so SQLAlchemy parses the URL safely.

---

## 9. Database Setup & Seeding

### 1. Ensure MySQL is Running
Make sure your MySQL service is active. You can run:
```powershell
.\start_mysql.bat
```

### 2. Create the Database Schema
To initialize the database tables from SQLAlchemy metadata safely:
```powershell
cd server
python scripts/init_db.py
```
*(Or from project root: `npm run init-db`)*

### 3. Seed Demonstration Master Data
Run the database seeder to populate default settings, demonstration accounts, initial regions, constituencies, polling stations, synthetic parties, candidates, and sample voters:

```powershell
cd server
# Provide initial demonstration passwords (or enter when prompted):
$env:SEED_COMMISSIONER_PASSWORD="YourSecureAdminPassword123!"
$env:SEED_OFFICER_PASSWORD="YourSecureOfficerPassword123!"
python scripts/seed.py
```
*(Or from root: `npm run seed`)*

> [!IMPORTANT]
> **Credential Security & Rotation Notice:**  
> If any local passwords, database connection strings, or JWT keys were previously exposed or tracked in Git history, immediately rotate your MySQL passwords and generate fresh JWT keys using `openssl rand -hex 32`. Never commit `.env` files to public version control.

---

## 10. Demonstration Portals & Access

After seeding the database, access the web application at **`http://localhost:5173`**:

| Role | Username / Email | Password Configuration | Default Portal URL |
| :--- | :--- | :--- | :--- |
| **Chief Election Commissioner** | `commissioner@evm.gov.in` | Configured via `SEED_COMMISSIONER_PASSWORD` | `http://localhost:5173/admin` |
| **Polling Station Officer** | `officer1@evm.gov.in` | Configured via `SEED_OFFICER_PASSWORD` | `http://localhost:5173/officer` |
| **Touchscreen Voting Kiosk** | *(Public EVM)* | *(No login required)* | `http://localhost:5173/voting-machine` |
| **Public VVPAT Verification** | *(Public)* | *(No login required)* | `http://localhost:5173/vvpat` |

### Sample Voter Credentials for EVM Simulation:
| Voter Name | Voter ID | Simulated Aadhaar | Assigned Station |
| :--- | :--- | :--- | :--- |
| **Aarav Sharma** | `DL/01/001/0001` | `123456789001` | Polling Station 1 (New Delhi) |
| **Diya Patel** | `DL/01/001/0002` | `123456789002` | Polling Station 1 (New Delhi) |
| **Rohan Gupta** | `DL/01/001/0003` | `123456789003` | Polling Station 1 (New Delhi) |
| **Priya Singh** | `DL/01/001/0004` | `123456789004` | Polling Station 1 (New Delhi) |

*(Note: During voting kiosk verification, the dynamic OTP is generated and conveniently displayed on-screen for simulation testing).*

---

## 11. Core Workflows & User Guides

### Workflow 1: Chief Election Commissioner (`/admin`)
1. **Log in** with Commissioner credentials (`commissioner@evm.gov.in`).
2. **Review Dashboard**: View live turnout, total registered voters, active polling stations, and election statuses.
3. **Configure Locations**:
   - Create or inspect **Regions** (e.g. Northern Region).
   - Create **Constituencies** and link them to Regions.
   - Create **Polling Stations** and assign unique station codes.
4. **Manage Parties & Candidates**:
   - Register **Political Parties** with symbols.
   - Register **Candidates** by assigning them to a Constituency and Party, or marking them as Independent.
5. **Voter Registration & Biometric Enrollment**:
   - Add new voters individually or via bulk Excel import (`voters.xlsx`).
   - Use the live camera capture or file upload to enroll the voter's facial image.
   - The system automatically validates and prevents duplicate Voter IDs or Aadhaar numbers.
6. **Election Lifecycle**:
   - Create a new election in `DRAFT` status.
   - Link constituencies to the election.
   - Transition state: `DRAFT` $\rightarrow$ `SCHEDULED` $\rightarrow$ `ACTIVE`.
   - Once voting concludes: Transition to `CLOSED` $\rightarrow$ `PUBLISHED`.
7. **Export Reports**: Generate downloadable PDF Summary certificates or Excel voter and result rosters.

---

### Workflow 2: Polling Station Officer (`/officer`)
1. **Log in** with Polling Officer credentials (`officer1@evm.gov.in`).
2. **Verify Assigned Station**: The console loads the officer's specific assigned polling station.
3. **Machine Control**:
   - Click **Start Voting / Activate Machine** to enable the EVM kiosk for voters.
   - Click **Pause Voting** if polling needs temporary suspension.
   - Click **Lock Machine** for emergency stoppage.
   - Click **Close Polling** at the end of voting hours.
4. **Monitor Station Turnout**: View live voter counts who have successfully cast ballots at this station.

---

### Workflow 3: Voter at the EVM Kiosk (`/voting-machine`)
1. Open **`http://localhost:5173/voting-machine`**.
2. **Authentication Step 1**: Enter registered Voter ID (e.g., `DL/01/001/0001`) or Aadhaar Number (e.g., `123456789001`).
3. **Authentication Step 2**: Enter the OTP received (shown on screen in simulation mode).
4. **Authentication Step 3 (Biometric Match)**:
   - Click **Scan Face** or select your webcam.
   - The browser captures your face and sends it to the OpenCV Deep Learning engine.
   - If the face matches the registered voter's facial profile ($\ge 63.7\%$ cosine similarity / distance $< 0.363$), authentication is approved.
   - If an impersonator or different face is presented, the system rejects verification with an authentication error.
5. **Ballot Unit**:
   - View candidates for your constituency with party symbols and names.
   - Click the green **VOTE** button next to your chosen candidate.
   - Review and confirm your choice in the modal dialog.
6. **Digital VVPAT Slip**:
   - A digital audit slip showing the candidate name, party symbol, timestamp, and unique ballot serial number appears for **7 seconds** with an audio tone.
   - The vote is hashed with SHA-256 and committed to the database.
   - The voter's status is permanently updated to `VOTED` to prevent double-voting.

---

## 12. Relational Database Schema (19 Tables)

The system is powered by a fully normalized MySQL relational schema managed via SQLAlchemy 2.0 ORM:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE RELATIONAL SCHEMA                          │
└────────────────────────────────────────────────────────────────────────┘

  [users] 1 ──── 1 [election_commissioners]
          1 ──── 1 [election_officers] ─── N [polling_stations]
          1 ──── N [login_logs]

  [regions] 1 ──── N [constituencies] 1 ──── N [polling_stations]
                          │                           │
                          │ 1                         │ 1
                          ▼ N                         ▼ N
  [elections] 1 ──── N [election_constituencies]   [voters]
          │                                           │
          │ 1                                         │ 1
          ▼ N                                         ▼ N
  [election_voter_statuses] ◀─────────────────────────┘
          │
          │ (Voter casts 1 vote per election)
          ▼
  [votes] 1 ──── 1 [digital_vvpats]
     │
     └── Candidate N ──── 1 [candidates] N ──── 1 [political_parties]

  [otp_verifications] ── N ── [voters]
  [audit_logs]        ── Logs all administrative and election events
  [notifications]     ── User alerts and machine status updates
  [settings]          ── Global operational parameters (session timeout, VVPAT seconds)
```

### Table Breakdown:
| Table Name | Description | Key Constraints & Integrity Rules |
| :--- | :--- | :--- |
| `users` | Core credentials and role definitions | `email` (UNIQUE), `role` (`COMMISSIONER`, `OFFICER`) |
| `election_commissioners`| Commissioner profile data | FK $\rightarrow$ `users.id` (CASCADE) |
| `election_officers` | Officer profile data and station mapping | FK $\rightarrow$ `users.id`, FK $\rightarrow$ `polling_stations.id` |
| `login_logs` | Login history and IP audit | FK $\rightarrow$ `users.id` |
| `regions` | Top-level geographic administrative zones | `code` (UNIQUE), Soft delete (`deletedAt`) |
| `constituencies` | Electoral constituencies under regions | FK $\rightarrow$ `regions.id`, `code` (UNIQUE) |
| `polling_stations` | Physical booths with EVM machine status | FK $\rightarrow$ `constituencies.id`, `machineStatus` ENUM |
| `elections` | Election definitions and global status | `status` (`DRAFT`, `SCHEDULED`, `ACTIVE`, `PAUSED`, `CLOSED`, `PUBLISHED`) |
| `election_constituencies`| Association between elections & constituencies | Composite unique (`electionId`, `constituencyId`) |
| `political_parties` | Registered political parties & symbols | `abbreviation` (UNIQUE) |
| `candidates` | Registered election contenders | FK $\rightarrow$ `constituencies.id`, FK $\rightarrow$ `political_parties.id` |
| `voters` | Certified electoral register | `voterId` (UNIQUE), `aadhaarHash` (UNIQUE), FK $\rightarrow$ `polling_stations.id` |
| `election_voter_statuses`| Per-election voter eligibility and participation | Composite unique (`electionId`, `voterId`), `hasVoted` BOOLEAN |
| `otp_verifications` | Temporary OTP challenge tokens | FK $\rightarrow$ `voterId`, `expiresAt`, `isVerified` |
| `votes` | Anonymized ballots with cryptographic signatures| `ballotHash` (SHA-256), FK $\rightarrow$ `candidates.id`, ACID transactions |
| `digital_vvpats` | Tamper-evident VVPAT paper trail records | `referenceNumber` (UNIQUE), FK $\rightarrow$ `votes.id` |
| `audit_logs` | Immutable audit trail for all system actions | Timestamp, `userId`, `action`, `resource`, `ipAddress` |
| `notifications` | System and machine alert notifications | FK $\rightarrow$ `users.id`, `isRead` |
| `settings` | Dynamic system operational settings | `key` (UNIQUE), `group`, `value` |

---

## 13. API Documentation (Interactive Swagger)

FastAPI automatically serves interactive, production-ready OpenAPI documentation:

- **Swagger UI**: [http://localhost:5000/docs](http://localhost:5000/docs)
- **ReDoc UI**: [http://localhost:5000/redoc](http://localhost:5000/redoc)

### Summary of REST API Endpoints:

#### 🔐 Authentication & Session (`/api/auth`)
- `POST /api/auth/login` – Authenticate Commissioner or Officer, return JWT tokens.
- `POST /api/auth/logout` – Invalidate current session and log audit event.
- `GET /api/auth/profile` – Retrieve current authenticated user profile.
- `POST /api/auth/refresh` – Exchange refresh token for fresh access token.

#### 🏛️ Elections Lifecycle (`/api/elections`)
- `GET /api/elections` – List all elections with optional status filtering.
- `POST /api/elections` – Create a new election (`COMMISSIONER` only).
- `GET /api/elections/{id}` – Retrieve election details and linked constituencies.
- `PUT /api/elections/{id}` – Update election metadata.
- `PATCH /api/elections/{id}/status` – Transition state (`SCHEDULED`, `ACTIVE`, `CLOSED`, etc.).
- `POST /api/elections/{id}/publish-results` – Calculate and certify final election tally.
- `GET /api/elections/{id}/results` – Retrieve candidate vote breakdowns and winners.
- `GET /api/elections/stats/dashboard` – Global dashboard analytics.

#### 📍 Hierarchy & Locations (`/api/regions`, `/api/constituencies`, `/api/polling-stations`)
- `GET/POST /api/regions` – Manage geographical regions.
- `GET/POST/PUT /api/constituencies` – Manage electoral constituencies.
- `GET/POST/PUT /api/polling-stations` – Manage polling stations and EVM machine states.
- `PATCH /api/polling-stations/{id}/machine-status` – Update kiosk operational status.

#### 👥 Candidates & Parties (`/api/candidates`, `/api/parties`)
- `GET/POST /api/parties` – Register political parties.
- `POST /api/parties/{id}/symbol` – Upload official party emblem.
- `GET/POST /api/candidates` – Register candidates for a constituency.
- `POST /api/candidates/{id}/photo` – Upload candidate photograph.
- `POST /api/candidates/bulk-upload` – Bulk upload candidates via Excel spreadsheet.

#### 🗳️ Voter Management (`/api/voters`)
- `GET /api/voters` – Search and list registered voters (paginated).
- `POST /api/voters` – Register voter with photo, Voter ID, and Aadhaar uniqueness validation.
- `PUT /api/voters/{id}` – Update voter record.
- `POST /api/voters/{id}/photo` – Upload or re-enroll biometric facial photo.
- `POST /api/voters/bulk-upload` – Ingest voter registry from Excel file.

#### ⚡ EVM Voting Kiosk (`/api/voting`)
- `POST /api/voting/verify/initiate` – Look up voter credentials and generate OTP challenge.
- `POST /api/voting/verify/otp` – Validate entered OTP.
- `POST /api/voting/verify/biometric` – Perform real OpenCV YuNet + SFace facial match.
- `POST /api/voting/cast` – Cast anonymized ballot in ACID transaction, generate SHA-256 hash.
- `GET /api/voting/vvpat/{referenceNumber}` – Retrieve Digital VVPAT slip details.

#### 📊 Reporting & Audits (`/api/reports`, `/api/audit-logs`)
- `GET /api/reports/election/{id}/summary/pdf` – Generate election summary PDF.
- `GET /api/reports/election/{id}/results/excel` – Download election results workbook.
- `GET /api/reports/station/{id}/voters/excel` – Download polling station voter roll.
- `GET /api/reports/audit-log/pdf` – Download cryptographically signed audit report.
- `GET /api/audit-logs` – Query system audit trail with user and action filters.

---

## 14. Security, Integrity & Auditing

| Layer | Implementation |
| :--- | :--- |
| **Biometric Facial AI** | 128D embedding matching with OpenCV YuNet & SFace. Strictly prevents impersonation. |
| **Voter Uniqueness** | Strict unique constraints on `voters.voterId` and `voters.aadhaarHash` at DB and API levels. |
| **One Voter, One Vote**| Guarded by database unique index on `votes.voterId` and `election_voter_statuses.hasVoted`. |
| **Ballot Anonymity** | The cast ballot stores only candidate reference, station reference, and cryptographic hash—never plaintext voter ID. |
| **Ballot Hashing** | SHA-256 hash generated for every cast vote: `SHA256(voterToken + candidateId + timestamp + salt)`. |
| **Digital VVPAT** | 7-second auto-preview followed by permanent record creation in `digital_vvpats`. |
| **Password Security** | Bcrypt salted hashing with 12 rounds. Plaintext passwords are never stored. |
| **Aadhaar Privacy** | Aadhaar numbers are salted and hashed using HMAC-SHA256 (`aadhaarHash`). Display masks (`XXXX-XXXX-1234`). |
| **API Authorization** | PyJWT bearer tokens (HS256) enforcing role separation (`COMMISSIONER` vs `OFFICER`). |
| **Audit Trails** | Every administrative change, state transition, and authentication attempt is stored in `audit_logs`. |
| **ACID Transactions** | Vote recording and VVPAT insertion execute inside an atomic database transaction. |

---

## 15. Troubleshooting & FAQs

### Q1: I get `OperationalError: 2003: Can't connect to MySQL server on 'localhost:3306' (10061)`
- **Cause**: The MySQL Windows service is stopped.
- **Solution**:
  1. Simply double-click **`start_mysql.bat`** in the project root.
  2. Click **Yes** when Windows User Account Control (UAC) prompts for administrator rights.
  3. The script will automatically start `MySQL97` or `MySQL` service.
  4. Reload the backend.

### Q2: Facial verification fails or shows "Camera Error"
- **Cause**: Browser webcam permission denied, camera privacy shutter closed, or Lenovo Vantage camera privacy mode enabled.
- **Solution**:
  1. Check browser address bar and grant camera permissions to `http://localhost:5173`.
  2. Ensure the physical privacy shutter on your laptop webcam is slid open.
  3. On Lenovo laptops, open **Lenovo Vantage** and disable **Camera Privacy Mode**.
  4. The client features built-in multi-camera detection that automatically prioritizes physical built-in webcams over disconnected virtual camera drivers.

### Q3: Facial verification says ONNX models not found
- **Cause**: Deep learning weights were not downloaded yet.
- **Solution**: Run the automated downloader:
  ```powershell
  cd server
  python scripts/download_models.py
  ```
  This creates `server/app/models_cv/` containing `face_detection_yunet_2023mar.onnx` and `face_recognition_sface_2021dec.onnx`.

### Q4: Registering a voter shows "A voter with this Voter ID or Aadhaar Number already exists"
- **Cause**: Uniqueness enforcement correctly identified a duplicate Voter ID or Aadhaar number.
- **Solution**: Ensure each voter has a unique Voter ID (e.g. `DL/01/001/0025`) and a unique 12-digit Aadhaar number. The UI highlights duplicate fields in red with specific error toasts.

### Q5: Voting Machine says "Machine is not active"
- **Cause**: The polling station's EVM machine is locked or paused.
- **Solution**:
  1. Log in to the Officer Portal (`/officer`) with `officer1@evm.gov.in`.
  2. Click **Start Voting / Activate Machine**.
  3. Refresh the `/voting-machine` kiosk page.

---

## 16. Cloud Deployment Guide (Vercel + Render + TiDB Cloud)

This guide provides the complete, production-ready procedure to deploy the **Smart EVM** system to the public internet for an academic project demonstration accessible from laptops, tablets, and smartphones over HTTPS.

### 🌐 Target Cloud Architecture

```
┌────────────────────────────────────────────────────────┐
│             Frontend Host: Vercel (HTTPS)              │
│       React 18 • TypeScript • Vite • Tailwind CSS      │
│  - Public Domain: https://smart-evm.vercel.app         │
│  - Vercel Rewrites:                                    │
│      /api/*     ──> https://smart-evm.onrender.com/api │
│      /uploads/* ──> https://smart-evm.onrender.com/up* │
│      /*         ──> /index.html (SPA Fallback)         │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS Proxied REST Calls
                            ▼
┌────────────────────────────────────────────────────────┐
│        Backend Host: Render Free Web Service           │
│        FastAPI • Uvicorn ASGI • Python 3.10+           │
│  - Public Endpoint: https://smart-evm.onrender.com     │
│  - OpenCV-Python-Headless + YuNet & SFace ONNX Models  │
│  - Ephemeral runtime storage: ./uploads                │
└───────────────────────────┬────────────────────────────┘
                            │ MySQL Wire Protocol (TLS 1.2+)
                            ▼
┌────────────────────────────────────────────────────────┐
│      Database Host: TiDB Cloud Starter (Serverless)    │
│            MySQL 8.0-compatible Managed Database       │
│  - Gateway: gateway01.ap-southeast-1.prod.aws...:4000  │
│  - Enforced SSL/TLS Certificate Verification           │
└────────────────────────────────────────────────────────┘
```

---

### Step 1: Provision TiDB Cloud Starter Database

1. Sign up or log in at [TiDB Cloud](https://tidbcloud.com/).
2. Click **Create Cluster** and select **TiDB Serverless (Free)**.
3. Choose your preferred region (e.g., AWS / `ap-southeast-1` or `us-east-1`).
4. Once created, click on your cluster $\rightarrow$ **Connect**.
5. Create a dedicated database named `voting_system`:
   - Under the SQL Editor / Web Console, execute:
     ```sql
     CREATE DATABASE IF NOT EXISTS voting_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     ```
6. Obtain your cluster connection credentials:
   - **Host**: e.g., `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`
   - **Port**: `4000`
   - **User**: e.g., `2xxxxxxxx.root`
   - **Password**: *(The secure password generated for your cluster)*
   - **Database**: `voting_system`

> [!IMPORTANT]
> **TiDB Cloud TLS Configuration for PyMySQL:**  
> TiDB Cloud mandates TLS 1.2+. The application configuration in `app/config.py` automatically detects TiDB hosts and configures strict TLS verification using Python's standard operating system CA certificate store.  
> Format your `DATABASE_URL` like this:
> ```ini
> DATABASE_URL=mysql+pymysql://<user>:<password>@<gateway-host>:4000/voting_system?ssl_verify_cert=true&ssl_verify_identity=true
> ```
> *(Note: Do **NOT** pass `ssl_mode=VERIFY_IDENTITY` in PyMySQL connection strings; PyMySQL does not support the `ssl_mode` keyword parameter and will fail. Our URL parser strips it automatically if pasted accidentally).*

---

### Step 2: Deploy Backend to Render Free Web Service

1. Sign up or log in at [Render](https://render.com/).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository: `https://github.com/yogananda151/SEVM_OnlineVotingSystem`.
4. Configure the service settings:
   - **Name**: `smart-evm-backend` (or your preferred name)
   - **Region**: Choose the region closest to your TiDB cluster (e.g., Singapore or Oregon)
   - **Root Directory**: `server`
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt && python scripts/download_models.py
     ```
   - **Start Command**:
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
     *(Or simply leave empty to use `server/Procfile`)*
   - **Instance Type**: `Free`

5. Add the following **Environment Variables** in the Render Dashboard (**Environment** tab):

| Variable Name | Example / Placeholder Value | Description |
| :--- | :--- | :--- |
| `ENV` | `production` | Enforces production security checks |
| `PORT` | `10000` | Port assigned by Render |
| `HOST` | `0.0.0.0` | Network interface binding |
| `DATABASE_URL` | `mysql+pymysql://<user>:<password>@<host>:4000/voting_system?ssl_verify_cert=true&ssl_verify_identity=true` | TiDB Cloud connection string |
| `JWT_SECRET` | *(Generate 64 hex chars with `openssl rand -hex 32`)* | Access token signing secret |
| `JWT_EXPIRES_IN` | `8h` | Access token lifespan |
| `JWT_REFRESH_SECRET` | *(Generate 64 hex chars distinct from JWT_SECRET)* | Refresh token signing secret |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifespan |
| `AADHAAR_HMAC_SECRET` | *(Generate 64 hex chars distinct from JWT secrets)* | Aadhaar hashing salt secret |
| `CLIENT_URL` | `https://your-app-name.vercel.app` | Allowed frontend origin for CORS |
| `UPLOAD_PATH` | `./uploads` | Directory for uploaded images |
| `MAX_FILE_SIZE` | `5242880` | Max file upload size (5 MB) |
| `LOG_LEVEL` | `INFO` | Application log level |
| `SEED_COMMISSIONER_PASSWORD`| `YourSecureAdminPass123!` | Initial Commissioner password |
| `SEED_OFFICER_PASSWORD` | `YourSecureOfficerPass123!` | Initial Polling Officer password |

6. Click **Create Web Service**. Wait for the build and deployment to finish.
7. Note your Render service URL (e.g., `https://smart-evm-backend.onrender.com`).
8. Verify deployment health by navigating to:
   `https://smart-evm-backend.onrender.com/health`

---

### Step 3: Initialize and Seed TiDB Database

Once the backend is deployed, initialize the database schema and demonstration data:

#### Option A: Via Render Web Shell (Recommended)
1. Go to your Render Web Service $\rightarrow$ **Shell** tab.
2. Initialize the database schema (creates all 19 tables safely without dropping data):
   ```bash
   python scripts/init_db.py
   ```
3. Seed synthetic demonstration data (parties, candidates, sample voters, initial accounts):
   ```bash
   python scripts/seed.py
   ```

#### Option B: From Your Local Machine Pointed to TiDB
1. In PowerShell, temporarily set `DATABASE_URL`, `SEED_COMMISSIONER_PASSWORD`, and `SEED_OFFICER_PASSWORD`:
   ```powershell
   $env:DATABASE_URL="mysql+pymysql://<user>:<password>@<gateway>:4000/voting_system?ssl_verify_cert=true&ssl_verify_identity=true"
   $env:SEED_COMMISSIONER_PASSWORD="YourSecureAdminPass123!"
   $env:SEED_OFFICER_PASSWORD="YourSecureOfficerPass123!"
   cd server
   .\venv\Scripts\python.exe scripts/init_db.py
   .\venv\Scripts\python.exe scripts/seed.py
   ```

---

### Step 4: Deploy Frontend to Vercel

1. Open `client/vercel.json` in your local repository.
2. Replace `YOUR_RENDER_BACKEND_URL.onrender.com` with your actual Render service hostname:
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "rewrites": [
       {
         "source": "/api/:match*",
         "destination": "https://smart-evm-backend.onrender.com/api/:match*"
       },
       {
         "source": "/uploads/:match*",
         "destination": "https://smart-evm-backend.onrender.com/uploads/:match*"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
3. Commit and push this change to your GitHub repository:
   ```bash
   git add client/vercel.json
   git commit -m "Configure Vercel API and uploads rewrites to Render backend"
   git push origin main
   ```
4. Sign up or log in at [Vercel](https://vercel.com/).
5. Click **Add New...** $\rightarrow$ **Project**.
6. Import your GitHub repository `yogananda151/SEVM_OnlineVotingSystem`.
7. Configure Project Settings:
   - **Root Directory**: Click Edit $\rightarrow$ select `client`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
8. Click **Deploy**. Vercel will build and publish your frontend within ~60 seconds.
9. Note your live production URL (e.g., `https://smart-evm.vercel.app`).

---

### Step 5: Update CORS Origin on Render

1. Return to your **Render Web Service Dashboard** $\rightarrow$ **Environment** tab.
2. Update `CLIENT_URL` to your exact Vercel deployment URL:
   ```ini
   CLIENT_URL=https://smart-evm.vercel.app
   ```
   *(Ensure there is **no** trailing slash).*
3. Render will automatically redeploy with the updated CORS configuration.

---

### Step 6: OpenCV & Facial Recognition Model Considerations

- **Headless OpenCV**: We use `opencv-python-headless>=4.9.0` in `requirements.txt`. This avoids missing `libGL.so.1` or X11 GUI shared library errors common on headless Linux containers.
- **Model Sizes & RAM**:
  - `face_detection_yunet_2023mar.onnx` is **232 KB**.
  - `face_recognition_sface_2021dec.onnx` is **38.6 MB**.
  - The models are pre-committed to Git in `server/app/models_cv/` and verified during build by `python scripts/download_models.py`.
  - Facial inference uses ~150–250 MB RAM, well within Render's free tier 512 MB memory limit.
- **Render Free Tier Cold Starts**:
  - Render free web services spin down after 15 minutes of inactivity.
  - When accessing the application after idle time, the first request will take **30–50 seconds** while the instance wakes up. Subsequent requests respond instantly.

---

### Step 7: Ephemeral File Storage Notice

- On Render's free tier, the local filesystem is **ephemeral**. Any files written to `./uploads/` (such as new candidate photos uploaded via the admin portal) are persisted only for the lifetime of that container instance and will reset if the web service restarts or redeploys.
- All core application data (voters, votes, cryptographic audit logs, election results, user credentials) is stored permanently in **TiDB Cloud** and is never lost.
- For a commercial production deployment with durable file uploads, integrate an S3-compatible cloud bucket (AWS S3, Cloudflare R2, or Cloudinary). The application's `StorageService` (`app/services/storage.py`) is structured for pluggable durable storage backends.

---

### Step 8: Multi-Device Testing & HTTPS Camera Requirements

1. **Accessing from Mobile / Laptop over HTTPS**:
   - Open your Vercel deployment URL (e.g., `https://smart-evm.vercel.app`) on your mobile phone or external laptop.
2. **Webcam Biometric Access Requirement**:
   - Modern browsers (Google Chrome, Safari, Microsoft Edge, Firefox) strictly restrict `navigator.mediaDevices.getUserMedia` (webcam access) to **secure origins** (`https://` or `localhost`).
   - Because Vercel provides automatic SSL certificates, accessing over `https://` enables live facial verification on mobile front cameras and laptop webcams without configuration.
   - When prompted by the browser on first visit, tap **Allow** for camera access.
3. **Demonstration Test Flow**:
   - Navigate to `/` $\rightarrow$ Log in as Commissioner (`commissioner@evm.gov.in`).
   - Transition election status to `ACTIVE`.
   - Log in as Polling Officer (`officer1@evm.gov.in`) at `/officer` $\rightarrow$ Click **Activate Machine**.
   - Open `/voting-machine` on another device or tab $\rightarrow$ Enter Voter ID `DL/01/001/0001` $\rightarrow$ Complete OTP verification $\rightarrow$ Verify face $\rightarrow$ Cast vote $\rightarrow$ Inspect the 7-second Digital VVPAT slip $\rightarrow$ Verify vote ledger audit at `/vvpat`.

---

### Step 9: Cloud Troubleshooting Checklist

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **Backend 502 Bad Gateway / Slow initial load** | Render free instance spinning up from idle | Wait 45 seconds for cold start. Verify service logs in Render. |
| **CORS error in browser console** | `CLIENT_URL` does not match Vercel URL or has trailing slash | Ensure `CLIENT_URL=https://your-app.vercel.app` in Render without trailing slash. |
| **Database connection error / OperationalError 2003** | TiDB cluster paused or credentials incorrect | Verify TiDB cluster status in TiDB console. Confirm user, password, and port `4000`. |
| **Vercel 404 on page reload on deep routes (e.g. `/admin`)** | Missing SPA rewrite rule | Ensure `client/vercel.json` contains `"source": "/(.*)", "destination": "/index.html"`. |
| **Webcam not activating on mobile device** | Accessed over insecure HTTP or permission blocked | Ensure URL starts with `https://`. In browser settings, ensure Camera permission is granted. |
| **500 error on facial recognition verification** | Missing ONNX model files | Run `python scripts/download_models.py` in Render shell to verify `server/app/models_cv/`. |

---

## 17. Academic Disclaimer

This project is created exclusively for **educational and academic demonstration purposes** as a Database Management Systems (DBMS) coursework capstone.

- It is **not** affiliated with, endorsed by, or connected to the **Election Commission of India (ECI)** or any government authority.
- All Aadhaar validation, biometric verification, and OTP workflows are executed locally as simulations. No live government APIs or private citizen databases are contacted.

---

## 📄 License & Credits

Developed with ❤️ as an advanced DBMS and Computer Vision demonstration project.  
© 2025–2026 Smart EVM Project Team. All rights reserved.
