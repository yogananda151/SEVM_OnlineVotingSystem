# SEVM Online Voting System — Server Analysis (Part 1)
## For DBMS Presentation

---

# PART 1 — SERVER OVERVIEW

## Quick Answers

| Question | Answer |
|---|---|
| **Backend Language** | TypeScript |
| **Backend Framework** | Express.js (v4.19) |
| **Server Runtime** | Node.js (via `tsx` for TypeScript) |
| **ORM / Database Library** | Prisma (v5.14) |
| **Database** | MySQL |
| **Authentication Library** | jsonwebtoken (JWT) + bcryptjs |
| **Validation Library** | Zod (v3.23) |
| **File Upload Library** | Multer |
| **PDF Generation** | PDFKit |
| **Excel Generation** | ExcelJS |
| **Logging** | Winston + Morgan |
| **Security** | Helmet, CORS, express-rate-limit |
| **Unique IDs** | uuid |
| **Compression** | compression |

## What Is the Server and Why Do We Need It?

**Simple explanation:**
The server is the "brain" of the voting system. It sits between the client (the website the user sees in their browser) and the database (where all data is stored in MySQL).

**Why we need it:**
- The client (browser) cannot talk to the database directly — that would be a massive security risk
- Someone needs to **check if the user is allowed** to do what they're requesting
- Someone needs to **validate** that the data is correct before saving it
- Someone needs to **enforce rules** like "a voter can only vote once"
- The server does ALL of this

**Server responsibilities:**
1. **Receive HTTP requests** from the client (React frontend)
2. **Authenticate** users (verify JWT tokens)
3. **Authorize** actions (check if user is COMMISSIONER or OFFICER)
4. **Validate** incoming data (using Zod schemas)
5. **Execute business logic** (e.g., check if voter already voted)
6. **Communicate with MySQL** database (via Prisma ORM)
7. **Send responses** back to the client
8. **Handle file uploads** (candidate photos, party symbols)
9. **Generate reports** (PDF and Excel)
10. **Log everything** for audit trails

---

# PART 2 — COMPLETE SERVER FOLDER STRUCTURE

```
server/
├── .env                        ← Environment variables (secrets, DB URL)
├── .env.example                ← Template showing what env vars are needed
├── package.json                ← Dependencies and npm scripts
├── tsconfig.json               ← TypeScript configuration
├── prisma/
│   ├── schema.prisma           ← DATABASE SCHEMA (all tables defined here)
│   ├── seed.ts                 ← Script to populate DB with initial data
│   └── migrations/             ← Database migration history
├── src/
│   ├── index.ts                ← SERVER ENTRY POINT (starts everything)
│   ├── app.ts                  ← EXPRESS APP (middleware + routes registration)
│   ├── config/
│   │   ├── index.ts            ← All configuration values (port, JWT, etc.)
│   │   └── database.ts         ← Prisma client initialization
│   ├── middleware/
│   │   ├── auth.middleware.ts   ← JWT authentication + role authorization
│   │   ├── error.middleware.ts  ← Global error handling
│   │   ├── upload.middleware.ts ← File upload handling (Multer)
│   │   └── validation.middleware.ts ← Zod validation schemas
│   ├── routes/
│   │   ├── auth.routes.ts      ← /api/auth/* endpoints
│   │   ├── election.routes.ts  ← /api/elections/* endpoints
│   │   ├── management.routes.ts ← /api/candidates, parties, etc.
│   │   ├── voter.routes.ts     ← /api/voters/* endpoints
│   │   ├── voting.routes.ts    ← /api/voting/* endpoints (cast vote)
│   │   └── report.routes.ts    ← /api/reports/* endpoints
│   ├── controllers/
│   │   ├── auth.controller.ts       ← Handles login/logout/profile
│   │   ├── election.controller.ts   ← Handles election CRUD + results
│   │   ├── candidate.controller.ts  ← Handles candidate CRUD + photo
│   │   ├── party.controller.ts      ← Handles party CRUD + symbol
│   │   ├── voter.controller.ts      ← Handles voter CRUD + photo
│   │   ├── voting.controller.ts     ← Handles vote casting + verification
│   │   ├── location.controller.ts   ← Handles constituencies + stations
│   │   ├── officer.controller.ts    ← Handles officer CRUD
│   │   └── audit.controller.ts      ← Handles audit logs + reports
│   ├── services/
│   │   ├── auth.service.ts          ← Login/logout business logic
│   │   ├── verification.service.ts  ← Voter verification + OTP logic
│   │   └── report.service.ts        ← PDF/Excel report generation
│   ├── repositories/
│   │   ├── user.repository.ts       ← User/Officer DB queries
│   │   ├── election.repository.ts   ← Election DB queries
│   │   ├── voter.repository.ts      ← Voter DB queries
│   │   ├── vote.repository.ts       ← Vote casting + results DB queries
│   │   ├── candidate.repository.ts  ← Candidate DB queries
│   │   ├── party.repository.ts      ← Party DB queries
│   │   ├── constituency.repository.ts ← Constituency DB queries
│   │   ├── polling-station.repository.ts ← Station DB queries
│   │   └── audit.repository.ts      ← Audit log DB queries
│   └── utils/
│       ├── jwt.ts              ← JWT token create/verify functions
│       ├── crypto.ts           ← Password hashing, vote hashing, OTP
│       ├── logger.ts           ← Winston logger setup
│       └── response.ts         ← Standardized API response helpers
├── uploads/                    ← Stored uploaded files (photos, symbols)
├── logs/                       ← Application log files
└── dist/                       ← Compiled JavaScript (production)
```

### Why Each Folder Exists

| Folder | Why It Exists | What's Inside |
|---|---|---|
| `config/` | Centralizes all settings so they're not scattered everywhere | Environment config + Prisma client |
| `middleware/` | Code that runs BEFORE route handlers — guards and preprocessors | Auth check, validation, error catch, upload handling |
| `routes/` | Maps URL paths to handler functions — the "address book" of the API | Route definitions connecting URLs → controllers |
| `controllers/` | Receives requests, extracts data, delegates work, sends responses | One controller per domain (election, voter, etc.) |
| `services/` | Complex business logic that doesn't belong in controllers | Auth logic, voter verification, report generation |
| `repositories/` | ALL database queries live here — single place for data access | One repository per database table/model |
| `utils/` | Reusable helper functions used across the entire server | JWT, hashing, logging, response formatting |
| `prisma/` | Database schema definition and migrations | Schema file that defines ALL tables |

---

# PART 3 — SERVER ENTRY POINT & STARTUP

## What Happens When You Run `npm run dev`

```
STEP 1: You type in terminal
─────────────────────────────
npm run dev

STEP 2: package.json script executes
─────────────────────────────────────
"dev": "tsx watch src/index.ts"
tsx = TypeScript executor (runs .ts files directly, no compile step)
watch = auto-restarts when files change

STEP 3: src/index.ts loads
──────────────────────────
FILE: server/src/index.ts
This is the ENTRY POINT — everything starts here.
```

### Exact Startup Sequence (from index.ts)

**Step 3a — Environment variables load**
```
import 'dotenv/config';
```
- This reads the `.env` file
- Makes `DATABASE_URL`, `JWT_SECRET`, `PORT`, etc. available via `process.env`
- This runs IMMEDIATELY when imported (top-level side effect)

**Step 3b — App is imported**
```
import { app } from './app';
```
- This triggers ALL the code in `app.ts` to execute
- Which means: Express app is created, ALL middleware registered, ALL routes registered
- But the server is NOT listening yet — routes are just "registered" (waiting)

**Step 3c — Config is imported**
```
import { config } from './config';
```
- Reads environment variables and creates the config object
- Port, JWT secrets, bcrypt rounds, rate limit settings, etc.

**Step 3d — Logger is imported**
```
import { logger } from './utils/logger';
```
- Creates the Winston logger
- Sets up file transport (writes to `logs/app.log`)
- Sets up console transport (for development)

**Step 3e — Prisma is imported**
```
import { prisma } from './config/database';
```
- Creates the PrismaClient instance
- Sets up error/warning event listeners
- But does NOT connect to database yet

**Step 3f — `startServer()` function is CALLED**
```
const startServer = async () => {
  await prisma.$connect();       ← NOW connects to MySQL
  const server = app.listen(config.port, () => { ... });  ← NOW starts listening
};
startServer();
```

### The Critical Distinction

| Concept | When It Happens | Example |
|---|---|---|
| **File imported** | When `import` statement is reached | `import { app } from './app'` |
| **Top-level code executes** | Immediately when file is imported | `const app = express()` in app.ts |
| **Function is defined** | When file is imported (definition only) | `async login(...)` in auth.controller.ts |
| **Function is called** | Only when something invokes it | `startServer()` at the bottom of index.ts |
| **Route handler waiting** | After `app.listen()` starts | `router.post('/login', ...)` waits for requests |
| **Middleware waiting** | After `app.listen()` starts | `app.use(helmet())` waits for any request |

### What app.ts Does During Import

When `index.ts` imports `app`, the file [app.ts](file:///d:/Yoga/DBMS/DBMS_project/server/src/app.ts) executes this sequence:

```
1. const app = express();              ← Create Express application

2. app.use(helmet(...));               ← Security headers middleware
3. app.use(cors(...));                 ← Cross-origin resource sharing
4. app.use('/api', rateLimit(...));    ← Rate limiting (100 req / 15 min)
5. app.use(compression());            ← Compress responses
6. app.use(express.json(...));         ← Parse JSON request bodies
7. app.use(express.urlencoded(...));   ← Parse form data
8. app.use(morgan('combined', ...));   ← HTTP request logging

9. app.use('/uploads', express.static(...));  ← Serve uploaded files

10. app.get('/health', ...);           ← Health check endpoint

11. app.use('/api/auth', authRoutes);          ← Register auth routes
12. app.use('/api/elections', electionRoutes); ← Register election routes
13. app.use('/api', managementRoutes);         ← Register management routes
14. app.use('/api/voters', voterRoutes);       ← Register voter routes
15. app.use('/api/voting', votingRoutes);      ← Register voting routes
16. app.use('/api', reportRoutes);             ← Register report routes

17. app.use(notFoundHandler);          ← Catch unmatched routes → 404
18. app.use(errorHandler);             ← Catch all errors → formatted response
```

> **KEY INSIGHT:** Steps 1-18 all happen during import, BEFORE `app.listen()`. They REGISTER middleware and routes. The actual middleware/route functions only EXECUTE when a request arrives later.

---

# PART 5 — HOW SERVER FILES CONNECT

## Complete Dependency Map

```
src/index.ts (ENTRY POINT)
├── imports: dotenv/config
├── imports: ./app ──────────────────────────────────────────────┐
├── imports: ./config ───────────────────┐                       │
├── imports: ./utils/logger              │                       │
├── imports: ./config/database           │                       │
│                                        │                       │
│   config/index.ts ◄────────────────────┘                       │
│   (reads .env, exports config object)                          │
│   Used by: app.ts, database.ts, jwt.ts,                        │
│            crypto.ts, logger.ts, upload.middleware.ts           │
│                                                                │
│   config/database.ts                                           │
│   (creates PrismaClient, exports prisma)                       │
│   Used by: ALL repositories, verification.service,             │
│            report.service                                      │
│                                                                │
│   app.ts ◄─────────────────────────────────────────────────────┘
│   ├── imports: middleware/error.middleware.ts
│   ├── imports: routes/auth.routes.ts ──────────┐
│   ├── imports: routes/election.routes.ts ──────┤
│   ├── imports: routes/management.routes.ts ────┤
│   ├── imports: routes/voter.routes.ts ─────────┤
│   ├── imports: routes/voting.routes.ts ────────┤
│   └── imports: routes/report.routes.ts ────────┤
│                                                │
│   ROUTES ◄─────────────────────────────────────┘
│   Each route file imports:
│   ├── its CONTROLLER (handles the request)
│   ├── auth.middleware (authenticate/authorize)
│   ├── validation.middleware (Zod schemas)
│   └── upload.middleware (for file upload routes)
│
│   CONTROLLERS
│   Each controller imports:
│   ├── its REPOSITORY (for DB queries)
│   ├── or its SERVICE (for complex logic)
│   ├── utils/response (sendSuccess/sendError)
│   └── audit.repository (for audit logging)
│
│   SERVICES
│   Each service imports:
│   ├── REPOSITORIES (for DB queries)
│   ├── utils/crypto (hashing, OTP)
│   ├── utils/jwt (token generation)
│   └── error.middleware (AppError class)
│
│   REPOSITORIES
│   Every repository imports:
│   └── config/database (prisma client)
│       └── Prisma sends SQL queries to MySQL
```

## Simplified Flow

```
index.ts → app.ts → routes → controllers → services → repositories → Prisma → MySQL
                  → middleware (runs before controllers)
                  → utils (helpers used everywhere)
```

## Why Each Connection Exists

| From → To | Why |
|---|---|
| `index.ts` → `app.ts` | index needs the configured Express app to start listening |
| `index.ts` → `database.ts` | index needs to test DB connection before accepting requests |
| `app.ts` → route files | app needs to register all URL endpoints |
| routes → controllers | routes define WHAT URL, controllers define WHAT TO DO |
| routes → middleware | routes need auth/validation checks BEFORE the controller runs |
| controllers → services | controllers delegate complex business logic to services |
| controllers → repositories | controllers need data from the database |
| services → repositories | services need data to execute business logic |
| repositories → `prisma` | repositories translate function calls into SQL queries |
| everyone → `config` | everyone needs configuration values |
| everyone → `utils` | everyone needs helper functions |
