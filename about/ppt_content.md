# Online Voting System — DBMS Project PPT Content
### (Based on actual source code analysis — August 2026)

---

## PART 1 — PROJECT ANALYSIS

| Property | Details |
|---|---|
| **Database** | MySQL (via Prisma ORM) |
| **Backend Framework** | Node.js + Express.js (TypeScript) |
| **Frontend Framework** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS |
| **Auth** | JWT (jsonwebtoken) + bcrypt password hashing |
| **ORM** | Prisma v5 |
| **Client Entry Point** | `client/src/main.tsx` → `App.tsx` |
| **Server Entry Point** | `server/src/index.ts` → `app.ts` |
| **Frontend ↔ Backend** | Axios HTTP calls to REST API (`/api/*`) |

### Main Frontend Pages (verified from `App.tsx`)

| Route | Page | Role |
|---|---|---|
| `/` | LoginPage | Public |
| `/admin` | AdminDashboard | COMMISSIONER |
| `/admin/elections` | ElectionsPage | COMMISSIONER |
| `/admin/constituencies` | ConstituenciesPage | COMMISSIONER |
| `/admin/polling-stations` | PollingStationsPage | COMMISSIONER |
| `/admin/parties` | PartiesPage | COMMISSIONER |
| `/admin/candidates` | CandidatesPage | COMMISSIONER |
| `/admin/officers` | OfficersPage | COMMISSIONER |
| `/admin/voters` | VotersPage | COMMISSIONER |
| `/admin/results` | ResultsPage | COMMISSIONER |
| `/admin/reports` | ReportsPage | COMMISSIONER |
| `/admin/audit-logs` | AuditLogsPage | COMMISSIONER |
| `/officer` | OfficerDashboard | OFFICER |
| `/officer/voters` | VotersPage (read-only view) | OFFICER |
| `/voting-machine` | VotingMachinePage | Public (no auth — it IS the EVM terminal) |
| `/vvpat` | VvpatPage (reference lookup) | Public |

### Main Backend API Routes (verified from route files)

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | Login (both roles) |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/profile` | GET | Get logged-in user profile |
| `/api/elections` | GET/POST | List / Create elections |
| `/api/elections/:id/status` | PATCH | Change election status |
| `/api/elections/:id/results` | GET | Get election results |
| `/api/elections/:id/publish-results` | POST | Publish results |
| `/api/constituencies` | GET/POST/PUT/DELETE | CRUD constituencies |
| `/api/polling-stations` | GET/POST/PUT/DELETE | CRUD polling stations |
| `/api/polling-stations/:id/machine-status` | PATCH | Update EVM machine status |
| `/api/polling-stations/:id/turnout` | GET | Live voter turnout |
| `/api/parties` | GET/POST/PUT/DELETE | CRUD political parties |
| `/api/candidates` | GET/POST/PUT/DELETE | CRUD candidates |
| `/api/officers` | GET/POST/PUT/DELETE | CRUD election officers |
| `/api/voters` | GET/POST/PUT/DELETE | CRUD voter registration |
| `/api/voting/verify/initiate` | POST | Start voter verification (OTP) |
| `/api/voting/verify/otp` | POST | Confirm OTP |
| `/api/voting/verify/biometric` | POST | Simulate biometric verification |
| `/api/voting/cast` | POST | Cast vote (atomic transaction) |
| `/api/voting/vvpat/:refNo` | GET | Lookup digital VVPAT record |
| `/api/audit-logs` | GET | View audit logs |
| `/api/reports/election/:id/summary/pdf` | GET | Download election PDF report |
| `/api/reports/election/:id/results/excel` | GET | Download results Excel |

### Database Tables (16 tables — verified from `Database.sql` and `schema.prisma`)

| # | Table | Key Columns |
|---|---|---|
| 1 | `users` | `id` PK, `email` UNIQUE, `passwordHash`, `role` ENUM |
| 2 | `election_commissioners` | `id` PK, `userId` FK→users, `employeeId` UNIQUE |
| 3 | `election_officers` | `id` PK, `userId` FK→users, `pollingStationId` FK |
| 4 | `elections` | `id` PK, `status` ENUM(6 values), `isResultPublished` |
| 5 | `constituencies` | `id` PK, `electionId` FK→elections |
| 6 | `polling_stations` | `id` PK, `constituencyId` FK, `machineStatus` ENUM |
| 7 | `political_parties` | `id` PK, `abbreviation`, `symbolUrl` |
| 8 | `candidates` | `id` PK, `constituencyId` FK, `partyId` FK (nullable) |
| 9 | `voters` | `id` PK, `voterId` UNIQUE, `aadhaarHash`, `hasVoted` BOOLEAN |
| 10 | `votes` | `id` PK, `voterId` UNIQUE FK, `candidateId` FK, `voteHash` UNIQUE |
| 11 | `digital_vvpat` | `id` PK, `voteId` UNIQUE FK, `referenceNumber`, `voteHash` |
| 12 | `otp_verifications` | `id` PK, `voterId` FK, `otp`, `status` ENUM, `expiresAt` |
| 13 | `audit_logs` | `id` PK, `userId` FK, `action` ENUM (16 actions), `metadata` JSON |
| 14 | `login_logs` | `id` PK, `userId` FK, `success` BOOLEAN |
| 15 | `notifications` | `id` PK, `electionId` FK (nullable) |
| 16 | `settings` | `id` PK, `key` UNIQUE |

### Key Relationships (verified from schema)
- `users` → `election_commissioners` (1:1, CASCADE DELETE)
- `users` → `election_officers` (1:1, CASCADE DELETE)
- `elections` → `constituencies` (1:N, CASCADE DELETE)
- `constituencies` → `polling_stations` (1:N, CASCADE DELETE)
- `constituencies` → `candidates` (1:N, CASCADE DELETE)
- `constituencies` → `voters` (1:N, CASCADE DELETE)
- `political_parties` → `candidates` (1:N, SET NULL on delete)
- `voters` → `votes` (1:1 enforced by UNIQUE on `votes.voterId` — prevents duplicate voting)
- `votes` → `digital_vvpat` (1:1, CASCADE DELETE)
- `voters` → `otp_verifications` (1:N, CASCADE DELETE)
- `users` → `audit_logs` (1:N, SET NULL on delete)

---

## PART 2 — PPT SLIDES

---

### Slide 1 — Title

**Content:**

- **Main Title:** Online Voting System
- **Subtitle:** An Electronic Voting Machine (EVM) Simulation
- **Sub-line:** A Database Management System Project
- **Below title (team/course info block):**
  - Course: Database Management Systems (DBMS)
  - [Your College Name] | [Department Name]
  - [Your Name(s)] | [Roll Number(s)]
  - Academic Year: 2025–26
- **Bottom tagline (small):** *"Digitizing elections — from voter registration to result publication"*

**Visual/Layout:**
- Full-page dark navy or deep blue gradient background
- Large bold title text in white (center-aligned)
- Subtitle in bright blue/teal accent
- Small emblem or vote icon on the left side of the title
- Course info block at the bottom in a clean white card or simple list

**What I should say:**

> "Good morning Professor. My project is called the Online Voting System — it is an Electronic Voting Machine simulation built as a full-stack database application. The goal was to design a relational database that handles every stage of an election, from voter registration and identity verification all the way to vote recording and result publication. The entire backend uses MySQL as the database, and the application has two separate portals — one for the Election Commissioner, one for the Election Officer — plus a dedicated EVM voting machine screen."

---

### Slide 2 — Problem Statement

**Content:**

**Traditional Voting Challenges:**
- Manual voter registration is time-consuming and error-prone
- Verifying voter identity at booths is slow and unreliable
- Paper-based ballots make duplicate voting difficult to detect
- Manual vote counting is slow and prone to human error
- Election records are hard to maintain, search, and audit
- No digital trail — transparency and accountability are limited
- Managing large-scale elections (candidates, stations, officers) is complex

**Why a Database-Driven System?**
- A relational database can enforce integrity rules and prevent duplicate entries
- Digital voter verification reduces fraud risk
- Automated vote counting is faster and more accurate
- Audit logs provide a transparent record of every action

**Visual/Layout:**
- Left side: 3–4 bullet points with a red/warning icon (traditional problems)
- Right side: 3–4 bullet points with green/check icon (how DB solves it)
- OR: a simple two-column layout — "Problem" | "Our Solution"
- Dark background, white text

**What I should say:**

> "The problem statement focuses on the limitations of manual voting processes. When elections are conducted on paper, it is very hard to verify voters quickly, prevent duplicate voting, and count votes accurately. Our system addresses these problems by using a MySQL relational database. We use constraints like UNIQUE keys to prevent the same voter from voting twice. We use ENUM fields to track election status precisely. And we maintain complete audit logs so every action is recorded. So the database is not just storing data — it is actively enforcing rules."

---

### Slide 3 — Objectives

**Content:**

1. **Design a normalized relational database** with 16 tables to manage the complete election lifecycle
2. **Implement secure user authentication** for Election Commissioners and Election Officers using JWT tokens and bcrypt password hashing
3. **Support full election management** — create, schedule, activate, pause, close, and publish results
4. **Enable digital voter registration** with Aadhaar hash storage and Voter ID–based identity management
5. **Implement OTP-based voter verification** at the EVM terminal before allowing a vote to be cast
6. **Prevent duplicate voting** through a UNIQUE constraint on `votes.voterId` and a `hasVoted` boolean flag in the `voters` table
7. **Record votes atomically** using database transactions — ensuring vote, VVPAT record, and voter status update happen together or not at all
8. **Generate election results** by aggregating vote counts per candidate using COUNT and GROUP BY operations
9. **Maintain a complete audit trail** — every login, vote, and administrative action is logged in the `audit_logs` table
10. **Support report generation** — export election summaries as PDF and results as Excel files

**Visual/Layout:**
- Numbered list (1–10), or group them in 2 columns (5 per column)
- Use small icons next to each objective (lock, database, chart, etc.)
- Keep each point to one line

**What I should say:**

> "Our objectives cover the complete lifecycle of an election. The most important database-related objectives are: first, preventing duplicate voting using the UNIQUE constraint on the votes table — a voter can have only one entry in the votes table. Second, recording votes atomically using Prisma transactions — if any part of the vote recording fails, the entire operation is rolled back. And third, generating results using COUNT and GROUP BY queries on the votes table. These objectives directly map to DBMS concepts which we will see in detail later."

---

### Slide 4 — System Architecture

**Content:**

```
[ Browser / Voter / Officer / Commissioner ]
             ↓  (HTTP/REST)
[ React + TypeScript Frontend  (Vite) ]
             ↓  (Axios API calls)
[ Express.js REST API  (Node.js + TypeScript) ]
             ↓  (Prisma ORM)
[ MySQL Relational Database  (16 tables) ]
```

**Technology Stack:**

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Axios |
| Backend | Node.js, Express.js, TypeScript |
| Database | MySQL (via Prisma ORM) |
| Auth | JWT (access + refresh tokens), bcrypt |
| Reports | PDFKit (PDF), ExcelJS (Excel) |
| Validation | Zod (schema validation) |

**Visual/Layout:**
- A simple vertical flow diagram in the center
- Each layer is a rounded rectangle with the technology name
- Use a dark background with blue arrows connecting the layers
- Stack: Browser → React → Express → MySQL
- Technology table on the right side or below the diagram

**What I should say:**

> "The architecture is a standard three-tier web application. The frontend is built with React and TypeScript, running in the browser. It communicates with the backend using Axios to call REST API endpoints. The backend is an Express.js server running on Node.js with TypeScript. It uses Prisma ORM to communicate with the MySQL database. So whenever a user does anything — logs in, registers a voter, casts a vote — the React frontend sends an HTTP request to the Express API, which then runs a database query through Prisma. The database is the core of the entire application."

---

### Slide 5 — UML Diagram (Use Case Diagram)

**Content:**

**Actors (3):**
1. **Election Commissioner** (Admin portal — role: COMMISSIONER)
2. **Election Officer** (Officer portal — role: OFFICER)
3. **Voter** (EVM terminal — no login, public screen)

**Use Cases by Actor:**

**Election Commissioner:**
- Login / Logout (JWT-authenticated)
- Manage Elections (Create, Edit, Set Status: DRAFT→SCHEDULED→ACTIVE→PAUSED→CLOSED, Publish Results)
- Manage Constituencies (CRUD)
- Manage Polling Stations (CRUD, update machine status)
- Manage Political Parties (CRUD, upload symbol)
- Manage Candidates (CRUD, upload photo)
- Manage Election Officers (CRUD, assign to polling station)
- Register / Manage Voters (CRUD, upload photo)
- View Election Results (by constituency, with bar charts)
- Download Reports (PDF / Excel)
- View Audit Logs

**Election Officer:**
- Login / Logout (JWT-authenticated)
- View assigned Polling Station dashboard
- Monitor voter turnout in real-time (total / voted / remaining / %)
- Control EVM Machine Status (Activate, Pause, Lock, Close)
- View voter list for their station

**Voter (no login — uses EVM screen):**
- Select verification method (Voter ID or Aadhaar)
- Submit identity information for OTP generation
- Enter OTP (simulated — shown on screen)
- Complete biometric simulation (Fingerprint / Face — simulated)
- View list of candidates for their constituency
- Select a candidate and confirm vote
- View Digital VVPAT receipt (candidate name, party, reference number, hash)

**Visual/Layout (recreate in Canva):**
```
┌──────────────────────────────────────────────────┐
│              ONLINE VOTING SYSTEM                │
│                                                  │
│  [Commissioner]   [Officer]      [Voter]         │
│       ○               ○             ○            │
│       │               │             │            │
│   ┌───┴──┐        ┌───┴──┐     ┌───┴──┐         │
│   │Login │        │Login │     │Verify│         │
│   │Manage│        │View  │     │Select│         │
│   │Elec. │        │Turnout│    │Cast  │         │
│   │...   │        │EVM   │     │VVPAT │         │
│   └──────┘        │Status│     └──────┘         │
│                   └──────┘                       │
└──────────────────────────────────────────────────┘
```

In Canva: draw 3 stick-figure actors horizontally, with ovals for each use case connected by lines.

**What I should say:**

> "The UML Use Case diagram shows three actors. The Election Commissioner has the highest privileges — they manage the entire election setup including parties, candidates, voters, and officers. The Election Officer is assigned to a specific polling station — they can monitor the turnout and control the EVM machine status. The Voter does not log in — they use the public EVM screen, which walks them through identity verification using either Voter ID or Aadhaar number, then OTP confirmation, then biometric simulation, and finally allows them to select a candidate and cast their vote. The system then generates a Digital VVPAT receipt."

---

### Slide 6 — ER Diagram

**Content:**

**Slide Title:** Entity-Relationship Diagram — Online Voting System Database

**2–4 Bullet Points (say while showing your ER diagram):**
- The ER diagram shows **16 entities** representing users, elections, geographic structure, voters, votes, and audit records
- Key entities: `users`, `elections`, `constituencies`, `polling_stations`, `voters`, `votes`, `candidates`, `political_parties`, `digital_vvpat`, `otp_verifications`
- The hierarchy flows top-down: **Election → Constituency → Polling Station → Voter / Candidate**
- The `votes` table is the central fact table — it connects a `voter` to a `candidate` at a `polling_station`

**Important Relationships to Mention:**
- `elections` ↔ `constituencies`: One election has many constituencies (1:N)
- `constituencies` ↔ `candidates`: One constituency has many candidates (1:N)
- `constituencies` ↔ `voters`: One constituency has many voters (1:N)
- `polling_stations` ↔ `voters`: A voter is registered at exactly one polling station
- `voters` ↔ `votes`: A voter can cast at most ONE vote (enforced by UNIQUE key)
- `votes` ↔ `digital_vvpat`: Every vote generates exactly one VVPAT record (1:1)
- `candidates` ↔ `political_parties`: A candidate belongs to one party (or is independent)

**Primary Keys to Highlight:**
- Every table has an auto-incremented integer `id` as Primary Key

**Foreign Keys Worth Explaining:**
- `votes.voterId` → `voters.id` (RESTRICT delete — cannot delete a voter who has voted)
- `votes.candidateId` → `candidates.id` (RESTRICT delete — cannot delete a candidate with votes)
- `election_officers.pollingStationId` → `polling_stations.id` (SET NULL — officer can be unassigned)
- `candidates.partyId` → `political_parties.id` (SET NULL — allows independent candidates)

**What I should say:**

> "This is our ER diagram. The central relationship in the entire system is between voters, votes, and candidates. A voter can appear in the votes table at most once — this is enforced by a UNIQUE constraint on votes.voterId in the database. So the ER diagram directly reflects the business rule that each voter gets only one vote. Another interesting design choice is that votes.voterId and votes.candidateId both use ON DELETE RESTRICT — meaning you cannot delete a voter or candidate from the database once they have votes associated with them. This protects the integrity of election data."

---

### Slide 7 — Functionalities

**Content:**

### Election Commissioner
- Create and manage elections (set status: DRAFT → SCHEDULED → ACTIVE → PAUSED → CLOSED → RESULTS PUBLISHED)
- Manage Constituencies, Polling Stations, Political Parties
- Register Candidates (with photos) and assign to constituency
- Register and manage Election Officers (assign to polling station)
- Register Voters (Voter ID, Aadhaar hash, photo, polling station)
- View live election results by constituency (bar chart visualization)
- Publish election results when election is CLOSED
- Export reports: Election Summary (PDF), Results (Excel), Voter List (Excel), Audit Log (PDF)
- View complete Audit Log of all system actions

### Election Officer
- Login and access their assigned polling station dashboard
- Monitor live voter turnout (total voters / voted / remaining / turnout %)
- Control EVM machine status: IDLE → ACTIVE → PAUSED → LOCKED → CLOSED
- View voter list for their polling station

### Voter (EVM Terminal — No Login Required)
- Select verification method: Voter ID or Aadhaar number
- Receive and enter OTP for identity confirmation
- Complete simulated biometric verification (fingerprint or face)
- View list of candidates for their constituency
- Select a candidate and confirm vote
- Receive Digital VVPAT receipt (candidate name, party, reference number, unique vote hash)

> ⚠️ **Not implemented (future scope):** Real SMS OTP, real biometric hardware integration, voter self-registration portal

**Visual/Layout:**
- Three columns, one per role
- Column header: Commissioner / Officer / Voter
- 5–7 bullet points per column
- Use role-appropriate icons (clipboard for commissioner, shield for officer, ballot for voter)

**What I should say:**

> "The system has three distinct user roles. The Commissioner is the most powerful — they set up everything before election day, from creating the election itself down to registering individual voters. The Officer manages the EVM machine on election day — they can activate, pause, or lock it. The Voter uses the public EVM screen — no login is required there. The verification happens through OTP sent to the registered phone number. In our simulation, the OTP is shown on screen for testing purposes. After OTP and biometric simulation, the voter sees their candidates and casts their vote."

---

### Slide 8 — Voting Process (Flow)

**Content:**

```
VOTER ARRIVES AT POLLING STATION
         ↓
[EVM Terminal] Select Verification Method
  • Voter ID  OR  • Aadhaar Number
         ↓
[Frontend] POST /api/voting/verify/initiate
         ↓
[Backend — verificationService]
  • SELECT voter WHERE voterId = ? (or aadhaarHash = ?)
  • Check: voter exists? isActive? hasVoted=FALSE?
  • Check: voter.pollingStationId matches current station?
  • Generate 6-digit OTP → INSERT into otp_verifications
         ↓
[EVM Terminal] Enter OTP
         ↓
[Backend — verifyOTP]
  • SELECT otp_verifications WHERE voterId=? AND otp=? AND status='PENDING' AND expiresAt > NOW()
  • UPDATE otp_verifications SET status='VERIFIED'
         ↓
[EVM Terminal] Biometric Simulation (Fingerprint / Face)
         ↓
[EVM Terminal] Display Candidates (GET /api/candidates?constituencyId=?)
         ↓
[EVM Terminal] Voter selects candidate → Confirm
         ↓
[Frontend] POST /api/voting/cast
         ↓
[Backend — voteRepository.castVote() — TRANSACTION]
  ① Verify voter hasn't voted (hasVoted = FALSE)
  ② Verify election status = ACTIVE
  ③ Verify polling station machineStatus = ACTIVE
  ④ Verify candidate belongs to same constituency
  ⑤ INSERT into votes (voterId, candidateId, pollingStationId, voteHash, referenceNumber)
  ⑥ INSERT into digital_vvpat (candidate details, voteHash, referenceNumber)
  ⑦ UPDATE voters SET hasVoted=TRUE, votedAt=NOW()
  ⑧ INSERT into audit_logs (action='VOTE_CAST')
         ↓
[EVM Terminal] Display Digital VVPAT Receipt
  • Candidate name, party, election name, reference number
         ↓
VOTE SUCCESSFULLY RECORDED
```

**Frontend operations:** React state machine (9 screens: welcome → method → verify → otp → biometric → candidates → confirm → vvpat → thankyou)

**Database operations involved:** SELECT, INSERT (×3), UPDATE (×1), all inside one ACID transaction

**Visual/Layout:**
- Vertical flowchart in the center of the slide
- 8–10 boxes with arrows
- Group steps by colour:
  - Blue = Frontend
  - Orange = Backend API
  - Green = Database
- Add a small DB icon at each database step

**What I should say:**

> "This is the most database-intensive part of the project — the voting process. When a voter arrives, the EVM screen first verifies their identity through OTP. The backend checks the voters table to confirm the voter exists, is active, and has NOT yet voted. After OTP verification, the voter sees their candidates and selects one. The critical operation is in castVote — it is wrapped in a Prisma database transaction. This means all 8 steps — creating the vote record, creating the VVPAT record, marking the voter as voted, and writing the audit log — either ALL succeed together, or ALL roll back if there is any error. This is the ACID property of transactions — specifically Atomicity."

---

### Slide 9 — Database Concepts Used

**Content:**

| DBMS Concept | How It Is Used in This Project |
|---|---|
| **Primary Key** | Every table has `id INT AUTO_INCREMENT PRIMARY KEY` |
| **Foreign Key** | `votes.voterId` → `voters.id`, `candidates.constituencyId` → `constituencies.id`, etc. |
| **UNIQUE Constraint** | `votes.voterId` UNIQUE → prevents duplicate voting; `voters.voterId` UNIQUE → each voter has one ID; `votes.voteHash` UNIQUE |
| **NOT NULL Constraint** | Critical fields like `email`, `passwordHash`, `voterId` are NOT NULL |
| **ENUM** | `users.role` (COMMISSIONER/OFFICER), `elections.status` (6 states), `polling_stations.machineStatus` (5 states), `otp_verifications.status` |
| **DEFAULT** | `hasVoted DEFAULT FALSE`, `isActive DEFAULT TRUE`, `status DEFAULT 'DRAFT'` |
| **SELECT + WHERE** | Voter lookup: `SELECT * FROM voters WHERE voterId = ?` |
| **INSERT** | Vote recording, voter registration, audit log entries |
| **UPDATE** | `UPDATE voters SET hasVoted=TRUE WHERE id=?` |
| **DELETE (soft)** | Records use `deletedAt` timestamp instead of physical deletion (soft delete pattern) |
| **JOIN** | Results query JOINs constituencies → candidates → votes → parties |
| **COUNT + GROUP BY** | `SELECT candidateId, COUNT(*) FROM votes GROUP BY candidateId` (result generation) |
| **Transaction (ACID)** | `castVote()` uses `prisma.$transaction()` — atomic vote recording |
| **Referential Integrity** | ON DELETE RESTRICT on `votes.voterId` and `votes.candidateId` — data cannot be lost |
| **ON DELETE CASCADE** | Deleting an election cascades to constituencies → polling stations → voters/candidates |
| **ON DELETE SET NULL** | Deleting a party sets `candidates.partyId = NULL` (independent candidates preserved) |
| **Indexing** | Indexes on `voterId`, `hasVoted`, `status`, `createdAt` for query performance |
| **Normalization** | Data split into 16 tables following 1NF, 2NF, 3NF to avoid redundancy |
| **Hashing** | Aadhaar number stored as SHA-256 hash (`aadhaarHash`) — not plain text |
| **JSON column** | `audit_logs.metadata` stores flexible metadata as JSON |

**Visual/Layout:**
- Two-column table, alternating row colours
- Each row: DBMS concept (bold) | Example from this project
- Keep the table to fit one slide — select 10–12 most important concepts

**What I should say:**

> "This slide maps every major DBMS concept to where it actually appears in our database. The most important ones are: Transactions — the castVote function uses a Prisma transaction so vote recording is atomic. The UNIQUE constraint on votes.voterId is how duplicate voting is prevented at the database level — even if someone bypasses the application, the database itself will reject a second vote. We also use Referential Integrity with ON DELETE RESTRICT — a voter who has voted cannot be deleted from the database. And we use Normalization — for example, party information is in a separate political_parties table and linked by foreign key, rather than duplicating party name in every candidate record."

---

### Slide 10 — Database Concepts With Each Functionality

**Content:**

| Functionality | Table(s) Involved | SQL Operation | DBMS Concept |
|---|---|---|---|
| **User Login / Authentication** | `users`, `login_logs` | SELECT WHERE email=?, INSERT into login_logs | Authentication, Hashing (bcrypt), Audit Trail |
| **Election Management** | `elections` | INSERT, UPDATE, DELETE (soft), SELECT | CRUD, ENUM status, Soft Delete |
| **Constituency & Station Setup** | `constituencies`, `polling_stations` | INSERT, UPDATE, DELETE | CRUD, Foreign Key (CASCADE), Composite UNIQUE |
| **Voter Registration** | `voters` | INSERT with UNIQUE voterId, aadhaarHash | UNIQUE Constraint, SHA-256 Hashing, FK |
| **Candidate Registration** | `candidates`, `political_parties` | INSERT with FK to constituency and party | Foreign Key, SET NULL for independent |
| **Officer Management** | `election_officers`, `users` | INSERT, UPDATE (assign station), DELETE | Foreign Key, SET NULL on station removal |
| **Voter Verification (OTP)** | `voters`, `otp_verifications` | SELECT WHERE voterId, INSERT otp, UPDATE status | SELECT + WHERE, INSERT, UPDATE, ENUM status |
| **Duplicate Vote Prevention** | `voters`, `votes` | Check hasVoted=FALSE before INSERT | UNIQUE Constraint, Boolean flag, Referential Integrity |
| **Vote Recording** | `votes`, `digital_vvpat`, `voters`, `audit_logs` | INSERT (×3), UPDATE (×1) in one TRANSACTION | ACID Transaction, Atomicity, INSERT |
| **Live Voter Turnout** | `voters`, `polling_stations` | SELECT COUNT(*) WHERE hasVoted=TRUE / FALSE | COUNT, WHERE, Aggregate Function |
| **Result Generation** | `votes`, `candidates`, `constituencies` | SELECT candidateId, COUNT(*) GROUP BY candidateId ORDER BY COUNT DESC | COUNT, GROUP BY, JOIN, ORDER BY |
| **Audit Logging** | `audit_logs` | INSERT on every admin/officer action | Audit Trail, JSON metadata, ENUM action |
| **Report Generation** | All tables (via JOIN queries) | Complex SELECT with JOINs | Multi-table JOIN, Aggregate functions |
| **Machine Status Control** | `polling_stations` | PATCH → UPDATE machineStatus ENUM | UPDATE, ENUM, Business Logic Constraint |

**Visual/Layout:**
- Full-width table, 4 columns
- Use alternating row shading
- Bold the "DBMS Concept" column
- This is the professor's specific ask — make it clean and complete

**What I should say:**

> "This table is the direct answer to the professor's question — 'database concepts with each functionality.' For each feature of the system, I can point to the exact table, the SQL operation, and the DBMS concept it demonstrates. For example, Vote Recording uses a TRANSACTION — all four SQL operations happen atomically. Result Generation uses COUNT and GROUP BY on the votes table to find how many votes each candidate received, then orders them in descending order to identify the winner. Voter Verification uses SELECT with multiple WHERE conditions to check voter eligibility before allowing the vote. Every feature in this system is backed by a specific DBMS concept."

---

### Slide 11 — Result Generation

**Content:**

**Which table stores votes?**
→ The `votes` table — stores `voterId`, `candidateId`, `pollingStationId`, `castAt`

**How votes are linked to candidates:**
→ `votes.candidateId` is a Foreign Key → `candidates.id`
→ `candidates.constituencyId` links the candidate to a constituency
→ `candidates.partyId` links the candidate to their political party

**How vote count is calculated (actual query logic):**
```sql
-- Conceptual equivalent of the Prisma query in getResults()
SELECT
    c.id,
    c.fullName,
    p.name AS partyName,
    COUNT(v.id) AS voteCount
FROM candidates c
LEFT JOIN votes v ON v.candidateId = c.id
LEFT JOIN political_parties p ON c.partyId = p.id
WHERE c.constituencyId = ?
GROUP BY c.id
ORDER BY voteCount DESC;
```

**How results are displayed:**
→ `ResultsPage.tsx` in the admin portal
→ Uses Recharts bar chart to display vote counts per candidate
→ Highest vote count = winner (displayed with a trophy icon)
→ Results only shown if `elections.isResultPublished = TRUE` (non-commissioners cannot access early)

**Result Publish Workflow:**
1. Election must be in CLOSED status
2. Commissioner clicks "Publish Results"
3. `PATCH /api/elections/:id/publish-results` → sets `isResultPublished = TRUE` and status = `RESULTS_PUBLISHED`
4. `audit_logs` entry created with action = `PUBLISH_RESULTS`

**Visual/Layout:**
- Left: short SQL query snippet in a code block
- Right: description of the ResultsPage (bar chart, winner declaration)
- Bottom: Result Publish workflow as 4 numbered steps

**What I should say:**

> "Result generation is handled by the getResults function in the vote repository. It queries the database to count the number of votes each candidate received, grouped by candidateId. The candidates are then sorted by vote count in descending order — so the first candidate in the result is the winner. This data is displayed in the ResultsPage using a bar chart from the Recharts library. An important business rule is enforced at the database level — results can only be viewed publicly after the commissioner marks them as published. The isResultPublished flag in the elections table controls this access. Commissioners can see results before publishing, but no other user can."

---

### Slide 12 — Conclusion & Future Enhancements

**Content:**

**What This Project Achieves:**
- A functional relational database with 16 tables managing the complete election lifecycle
- Role-based access control using JWT authentication (Commissioner / Officer)
- OTP-based voter identity verification with eligibility checking at the database level
- Atomic vote recording using ACID transactions — data integrity guaranteed
- Duplicate voting prevention through UNIQUE constraint on `votes.voterId`
- Live voter turnout monitoring using COUNT queries
- Result generation using COUNT + GROUP BY + JOIN
- Complete audit trail of every system action

**How the Database Supports the System:**
- MySQL enforces integrity rules that the application cannot bypass
- Foreign key constraints maintain referential integrity across 16 tables
- Transactions ensure no partial data is saved during vote recording
- Indexes on `voterId`, `hasVoted`, and `status` support fast query performance

**Future Enhancements:**
1. **Real OTP via SMS** — integrate Twilio or Indian government OTPLESS API for real phone-based OTP
2. **Biometric hardware integration** — connect fingerprint scanner instead of simulation
3. **Voter self-registration portal** — allow voters to register online before election day
4. **Real-time results dashboard** — WebSocket-based live vote count updates
5. **Two-factor authentication** for Commissioner login (currently single-factor password only)
6. **Role-based data partitioning** — allow Officers to see only their constituency's data

**Visual/Layout:**
- Left column: "What We Achieved" — 6 bullet points with checkmarks
- Right column: "Future Enhancements" — 6 bullet points with arrow/rocket icons
- Bottom: one-line conclusion statement

**What I should say:**

> "To conclude, this project successfully demonstrates the use of DBMS concepts in building a real-world application. The database has 16 tables with proper normalization, foreign keys, constraints, and indexes. We implemented ACID transactions for vote recording, UNIQUE constraints for duplicate vote prevention, and COUNT + GROUP BY for result generation. The project is honest — we clearly marked OTP and biometric as simulations, and these are listed as future enhancements. In a production system, we would integrate real SMS gateways and biometric hardware. The database design is production-ready and would only require the application layer to be connected to real external services."

---

## PART 3 — UML PLAN

### Actors (verified from source code)
1. **Election Commissioner** — uses `/admin/*` routes, role = COMMISSIONER
2. **Election Officer** — uses `/officer/*` routes, role = OFFICER
3. **Voter** — uses `/voting-machine` route (no auth), no role required

### Use Cases (grouped by actor)

**Election Commissioner:**
- Login (`/api/auth/login`)
- Logout
- Create / Edit / Delete Election
- Set Election Status (DRAFT → SCHEDULED → ACTIVE → PAUSED → CLOSED)
- Publish Election Results
- Create / Edit / Delete Constituency
- Create / Edit / Delete Polling Station
- Update Polling Station Machine Status
- Create / Edit / Delete Political Party (with party symbol upload)
- Register / Edit / Delete Candidate (with photo upload)
- Create / Edit / Delete Election Officer (assign to polling station)
- Register / Edit / Delete Voter (with photo upload)
- View Election Results (bar charts per constituency)
- Download Reports (PDF / Excel)
- View Audit Logs

**Election Officer:**
- Login (`/api/auth/login`)
- Logout
- View Polling Station Dashboard
- Monitor Live Voter Turnout
- Set Machine Status (IDLE / ACTIVE / PAUSED / LOCKED / CLOSED)
- View Voter List for their station

**Voter:**
- Select verification method (Voter ID / Aadhaar)
- Submit voter identity for OTP generation
- Enter OTP
- Complete biometric simulation
- View candidate list
- Select candidate and confirm vote
- View Digital VVPAT receipt (reference number + vote hash)

### Relationships
- Commissioner **manages** all election entities (<<include>> login)
- Officer **monitors** and **controls** polling station (<<include>> login)
- Voter **initiates** verification → **casts** vote → **receives** VVPAT
- Voter verification **<<include>>** OTP verification
- Vote casting **<<include>>** voter verification
- VVPAT receipt **<<extend>>** vote casting

---

## PART 4 — DATABASE CONCEPT MAPPING

| Functionality | Table(s) | SQL Operation | DBMS Concept |
|---|---|---|---|
| Login | `users`, `login_logs` | SELECT WHERE email=?, INSERT | Authentication, bcrypt Hashing |
| Election CRUD | `elections` | INSERT, UPDATE, soft DELETE | CRUD, ENUM, Soft Delete |
| Constituency CRUD | `constituencies` | INSERT, UPDATE, DELETE | CRUD, FK (CASCADE), Composite UNIQUE key |
| Polling Station CRUD | `polling_stations` | INSERT, UPDATE, PATCH status | CRUD, ENUM (machineStatus), FK |
| Party CRUD | `political_parties` | INSERT, UPDATE, DELETE | CRUD, SET NULL on FK |
| Candidate Registration | `candidates` | INSERT with FK to constituency + party | FK, SET NULL for independent |
| Officer Management | `election_officers`, `users` | INSERT, UPDATE, DELETE | FK, SET NULL (station unassign) |
| Voter Registration | `voters` | INSERT: `voterId` UNIQUE, `aadhaarHash` | UNIQUE, NOT NULL, Hashing |
| Voter Verification | `voters`, `otp_verifications` | SELECT WHERE, INSERT OTP, UPDATE status | SELECT+WHERE, ENUM, Expiry check |
| Duplicate Vote Prevention | `votes`, `voters` | UNIQUE on `votes.voterId`; check `hasVoted` | UNIQUE Constraint, Boolean, Referential Integrity |
| Vote Recording | `votes`, `digital_vvpat`, `voters`, `audit_logs` | 3× INSERT, 1× UPDATE in TRANSACTION | ACID Transaction, Atomicity, Referential Integrity |
| Live Turnout | `voters` | SELECT COUNT(*) WHERE hasVoted=TRUE | COUNT, WHERE, Aggregate Function |
| Result Generation | `votes`, `candidates`, `constituencies`, `political_parties` | SELECT COUNT(*) GROUP BY candidateId ORDER BY COUNT DESC | COUNT, GROUP BY, JOIN, ORDER BY |
| Audit Logging | `audit_logs` | INSERT on every admin action | Audit Trail, ENUM action, JSON metadata |
| Report Export | All major tables | Complex SELECT + JOIN | Multi-table JOIN, Aggregate |
| Machine Control | `polling_stations` | UPDATE machineStatus | ENUM, UPDATE |

---

## PART 5 — CANVA DESIGN PLAN

### Overall Theme

| Element | Recommendation |
|---|---|
| **Background** | Deep navy blue (`#0f172a` / `#1e293b`) |
| **Primary Accent** | Bright blue (`#3b82f6`) or Indigo (`#6366f1`) |
| **Secondary Accent** | Emerald green (`#10b981`) for success/checks |
| **Warning Accent** | Amber (`#f59e0b`) for cautions |
| **Text (primary)** | White or near-white (`#f1f5f9`) |
| **Text (secondary)** | Slate gray (`#94a3b8`) |
| **Font — Headings** | Inter Bold or Outfit Bold |
| **Font — Body** | Inter Regular or DM Sans |
| **Card style** | Rounded rectangles with subtle border (`#334155`) and slight transparency |

### Canva Search Terms
- Template: Search **"Dark Tech Presentation"** or **"Professional Blue Dark Slides"**
- Icons: Search **"ballot box"**, **"fingerprint"**, **"database"**, **"shield lock"**, **"vote"**, **"chart bar"**, **"election"**, **"key"**, **"server"**, **"check circle"**
- Diagrams: Use Canva's built-in **"Flowchart"** element for Slide 8

---

### Per-Slide Layout Guidance

**Slide 1 (Title):**
- Layout: Full bleed dark background
- Center: Large title text (60–72pt)
- Top-left: Small vote icon or shield logo
- Bottom: Thin horizontal line → course/team info block in smaller text

**Slide 2 (Problem Statement):**
- Layout: Two-column
- Left: "Traditional Voting Problems" with red warning icons
- Right: "Our Database-Driven Solution" with green checkmarks
- Canva icon search: "warning triangle", "checkmark circle"

**Slide 3 (Objectives):**
- Layout: Single column or 2×5 grid
- Numbered list with small accent numbers in blue circles
- Icon per objective (search: "target", "lock", "database", "chart", "user verify")

**Slide 4 (Architecture):**
- Layout: Center flowchart (vertical) + right sidebar for tech stack table
- Canva: Use connected rectangle shapes with blue arrows
- Layer colors: Browser(purple) → React(blue) → Express(orange) → MySQL(green)

**Slide 5 (UML):**
- Layout: Center diagram with 3 actors horizontally
- Draw stick figures for actors (Canva search: "person icon")
- Use ovals/ellipses for use cases
- Lines connecting actors to their use cases
- Box around all use cases (system boundary)

**Slide 6 (ER Diagram):**
- Layout: Right side = your ER diagram image; Left side = bullet points
- Or: Full center = ER diagram image; Bottom = 3 key relationship bullet points

**Slide 7 (Functionalities):**
- Layout: Three columns (Commissioner | Officer | Voter)
- Each column has a colored header bar (blue | orange | green)
- Bullet points in white below each header

**Slide 8 (Voting Process):**
- Layout: Vertical flowchart (8 steps)
- Use colored boxes: Blue (frontend) / Orange (backend) / Green (database)
- Add DB icon next to database steps
- Canva: Use "Process flow" template or Smartart equivalent

**Slide 9 (DB Concepts):**
- Layout: Full-width 2-column table
- Alternating row shading (dark slate vs. slightly lighter slate)
- Bold left column (concept name in accent color)
- Right column: plain white text

**Slide 10 (DB Concepts per Functionality):**
- Layout: Full-width 4-column table (fits horizontal slide)
- Use smaller font (10–12pt) to fit all rows
- Header row: blue background + white text
- This is the professor's focus slide — make it prominent

**Slide 11 (Result Generation):**
- Layout: Left = SQL code block (dark code background, monospace font)
- Right = description of ResultsPage and publish workflow
- Add bar chart icon or screenshot placeholder

**Slide 12 (Conclusion):**
- Layout: Two columns
- Left: "✅ Achieved" — green checkmarks
- Right: "🚀 Future Scope" — arrow/rocket icons
- Bottom: One-line closing statement in italic, accent color

---


*End of PPT Content — All technical facts verified from actual project source code*
*Database.sql, schema.prisma, all controllers, repositories, and route files were analyzed*
