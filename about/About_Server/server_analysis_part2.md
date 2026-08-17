# SEVM Server Analysis — Part 2: File-by-File Explanation

---

# PART 4 — FILE-BY-FILE EXPLANATION

---

## 4.1 — CONFIGURATION FILES

---

### FILE: `server/src/config/index.ts`

**TYPE:** Configuration

**PURPOSE:** Reads environment variables from `.env` and exports a single `config` object that the entire server uses for settings.

**WHY IT EXISTS:** Without this, every file would need to call `process.env.PORT` directly. This centralizes ALL configuration in one place. If you change a setting, you change it here only.

**WHO USES IT:** Almost every file — `app.ts`, `database.ts`, `jwt.ts`, `crypto.ts`, `logger.ts`, `upload.middleware.ts`

**WHAT IT EXPORTS:** A single `config` object containing:
- `port` — server port (default 5000)
- `jwt.secret` — secret key for signing JWT tokens
- `jwt.expiresIn` — token lifetime (default 8 hours)
- `client.url` — frontend URL for CORS (default `http://localhost:5173`)
- `upload.path` — where uploaded files are stored
- `upload.maxFileSize` — max upload size (5MB)
- `bcrypt.rounds` — password hashing strength (12 rounds)
- `rateLimit.windowMs` — rate limit window (15 minutes)
- `rateLimit.max` — max requests per window (100)
- `logging.level` — log level (info)
- `logging.file` — log file path

**DATABASE:** No

**ERROR HANDLING:** Uses fallback defaults if environment variables are missing

---

### FILE: `server/src/config/database.ts`

**TYPE:** Database Configuration

**PURPOSE:** Creates and exports a single Prisma client instance that ALL repositories use to talk to MySQL.

**WHY IT EXISTS:** You only want ONE database connection pool for the entire server. This file creates it once, and every repository imports the same instance.

**WHO USES IT:** Every repository file, `verification.service.ts`, `report.service.ts`, `index.ts`

**WHAT IT EXPORTS:** `prisma` — a `PrismaClient` instance

**WHAT IT DOES ON IMPORT (top-level code):**
1. Creates `new PrismaClient()` with query/error/warn logging enabled
2. Registers `prisma.$on('error', ...)` — logs Prisma errors via Winston
3. Registers `prisma.$on('warn', ...)` — logs Prisma warnings via Winston

**DATABASE:** Yes — this IS the database connection. It creates the client that sends SQL queries to MySQL. The actual `$connect()` call happens in `index.ts`.

---

## 4.2 — UTILITY FILES

---

### FILE: `server/src/utils/jwt.ts`

**TYPE:** Utility

**PURPOSE:** Provides functions to create and verify JWT (JSON Web Token) authentication tokens.

**WHY IT EXISTS:** After login, the server gives the client a token. On every future request, the client sends this token back. The server uses these functions to check if the token is valid and who the user is.

**WHO USES IT:**
- `auth.service.ts` — calls `generateAccessToken()` and `generateRefreshToken()` during login
- `auth.middleware.ts` — calls `verifyAccessToken()` on every protected request

**WHAT IT EXPORTS:**

| Export | Purpose |
|---|---|
| `JwtPayload` interface | Shape of data stored inside the token: `{ userId, email, role, stationId? }` |
| `generateAccessToken(payload)` | Creates a JWT signed with `config.jwt.secret`, expires in 8h |
| `generateRefreshToken(payload)` | Creates a JWT signed with `config.jwt.refreshSecret`, expires in 7d |
| `verifyAccessToken(token)` | Decodes and verifies a token, returns the payload or throws an error |
| `verifyRefreshToken(token)` | Same but for refresh tokens |

**How JWT works in this project:**
```
Login → server creates token containing { userId: 1, email: "admin@eci.gov.in", role: "COMMISSIONER" }
      → signs it with a secret key
      → sends token to client

Next request → client sends token in header: "Authorization: Bearer eyJhbG..."
            → server calls verifyAccessToken(token)
            → if valid, extracts userId/email/role
            → if invalid/expired, returns 401 error
```

---

### FILE: `server/src/utils/crypto.ts`

**TYPE:** Utility

**PURPOSE:** All cryptographic operations — password hashing, vote hashing, Aadhaar hashing, OTP generation, and reference number generation.

**WHY IT EXISTS:** Security. Passwords must be hashed (never stored as plain text). Votes need a unique hash for integrity verification. Aadhaar numbers must be hashed for privacy.

**WHO USES IT:**
- `auth.service.ts` — `comparePassword()` during login
- `user.repository.ts` — `hashPassword()` when creating officers
- `voter.controller.ts` — `hashAadhaar()` when registering voters
- `verification.service.ts` — `hashAadhaar()` + `generateOTP()`
- `vote.repository.ts` — `generateVoteHash()` + `generateReferenceNumber()`

**WHAT IT EXPORTS:**

| Function | What It Does | Used By |
|---|---|---|
| `hashPassword(password)` | Uses bcryptjs to hash a password with 12 salt rounds | `user.repository.ts` (creating officers) |
| `comparePassword(password, hash)` | Compares a plain password against a bcrypt hash | `auth.service.ts` (login) |
| `generateVoteHash(data)` | Creates SHA-256 hash of voterId+candidateId+stationId+timestamp+nonce | `vote.repository.ts` (casting vote) |
| `hashAadhaar(aadhaar)` | SHA-256 hash of Aadhaar number (privacy protection) | `voter.controller.ts`, `verification.service.ts` |
| `generateOTP()` | Generates random 6-digit number (100000-999999) | `verification.service.ts` |
| `generateReferenceNumber()` | Creates `VOTE-{timestamp}-{random}` string for VVPAT | `vote.repository.ts` |

**DBMS relevance:** The vote hash demonstrates **data integrity** — you can verify a vote hasn't been tampered with by recomputing the hash.

---

### FILE: `server/src/utils/response.ts`

**TYPE:** Utility

**PURPOSE:** Provides standardized response functions so every API endpoint returns data in the same JSON format.

**WHY IT EXISTS:** Without this, each controller would format responses differently. This ensures EVERY response has the shape `{ success: true/false, message: "...", data: {...} }`.

**WHO USES IT:** Every controller file and `auth.middleware.ts`

**WHAT IT EXPORTS:**

| Function | When Used | Response Shape |
|---|---|---|
| `sendSuccess(res, data, message, statusCode)` | Successful operations | `{ success: true, message, data }` |
| `sendError(res, message, statusCode, errors)` | Failed operations | `{ success: false, message }` |
| `sendPaginated(res, data, total, page, limit)` | List endpoints with pagination | `{ success: true, data, meta: { total, page, limit, totalPages } }` |

---

### FILE: `server/src/utils/logger.ts`

**TYPE:** Utility

**PURPOSE:** Creates a Winston logger that writes logs to both the console (during development) and log files.

**WHY IT EXISTS:** `console.log()` doesn't write to files and has no timestamps/levels. Winston provides structured logging with timestamps, error levels, and file output for production debugging.

**WHO USES IT:** `index.ts`, `app.ts`, `database.ts`, `error.middleware.ts`

**WHAT IT DOES ON IMPORT:**
1. Creates the `logs/` directory if it doesn't exist
2. Sets up JSON format for file logs (with timestamps)
3. Sets up colorized format for console logs
4. Creates two file transports: `app.log` (all logs) and `app.error.log` (errors only)
5. In development mode, also logs to console

---

## 4.3 — MIDDLEWARE FILES

---

### FILE: `server/src/middleware/auth.middleware.ts`

**TYPE:** Middleware

**PURPOSE:** Provides two middleware functions — `authenticate` (verify JWT token) and `authorize` (check user role).

**WHY IT EXISTS:** Most API routes need to know WHO is making the request and WHETHER they're allowed to do it. This middleware runs BEFORE the controller.

**WHO USES IT:** Almost every route file — `auth.routes.ts`, `election.routes.ts`, `management.routes.ts`, `voter.routes.ts`, `report.routes.ts`

**WHAT IT EXPORTS:**

#### `authenticate` middleware
```
1. Reads the "Authorization" header from the request
2. Checks it starts with "Bearer "
3. Extracts the token string
4. Calls verifyAccessToken(token) from utils/jwt.ts
5. If valid → attaches decoded user data to req.user → calls next()
6. If invalid → sends 401 error, request STOPS here
```

#### `authorize(...roles)` middleware
```
1. Checks if req.user exists (authenticate must run first)
2. Checks if req.user.role is in the allowed roles list
3. If allowed → calls next()
4. If not allowed → sends 403 "Forbidden" error, request STOPS
```

**Example in actual code:**
```
// In election.routes.ts:
router.post('/', authorize(UserRole.COMMISSIONER), ...)
// Only COMMISSIONER can create elections. OFFICER gets 403.
```

**The middleware chain concept:**
```
Request arrives at POST /api/elections
  ↓
authenticate runs (is there a valid JWT?)
  ↓ yes → next()
authorize(COMMISSIONER) runs (is user a COMMISSIONER?)
  ↓ yes → next()
validate(createElectionSchema) runs (is the data valid?)
  ↓ yes → next()
electionController.create runs (actual handler)
```
If ANY middleware fails, it sends an error response and does NOT call `next()`. The request stops there.

---

### FILE: `server/src/middleware/error.middleware.ts`

**TYPE:** Middleware

**PURPOSE:** Global error handler. Catches ALL errors from anywhere in the server and converts them into standardized JSON error responses.

**WHY IT EXISTS:** Without this, an unhandled error would crash the server or leak stack traces to the client. This catches everything and returns a clean error message.

**WHO USES IT:** `app.ts` registers it as the LAST middleware: `app.use(errorHandler)`

**WHAT IT EXPORTS:**

#### `AppError` class
A custom error class with a `statusCode` and `isOperational` flag. Controllers/services throw this when they detect a problem:
```typescript
throw new AppError('Election not found.', 404);
throw new AppError('Voter has already voted.', 409);
```

#### `errorHandler` function
Catches all errors and responds based on type:

| Error Type | Status Code | Example |
|---|---|---|
| `ZodError` (validation) | 422 | Invalid email format |
| `AppError` (known) | varies | "Election not found" → 404 |
| Prisma P2002 (unique constraint) | 409 | Duplicate voter ID |
| Prisma P2025 (not found) | 404 | Record doesn't exist |
| Unknown errors | 500 | "Internal server error" |

#### `notFoundHandler` function
Catches requests to URLs that don't match any route. Returns 404 with message like `"Route GET /api/nonexistent not found."`

**How errors travel through the server:**
```
Controller function throws error (or calls next(err))
  ↓
Express skips all remaining middleware
  ↓
Express reaches errorHandler (the last app.use)
  ↓
errorHandler checks error type
  ↓
Sends appropriate JSON response to client
```

---

### FILE: `server/src/middleware/validation.middleware.ts`

**TYPE:** Middleware + Schema Definitions

**PURPOSE:** (1) Provides a `validate()` middleware factory that validates `req.body` using Zod schemas. (2) Defines ALL validation schemas for every entity.

**WHY IT EXISTS:** You never trust data from the client. Before saving to the database, you must check: Is the email valid? Is the age a positive number? Is the password long enough? Zod does this automatically.

**WHO USES IT:** Every route file that accepts POST/PUT data

**WHAT IT EXPORTS:**

#### `validate(schema)` — middleware factory
```
1. Takes a Zod schema
2. Returns a middleware function
3. That middleware parses req.body against the schema
4. If valid → replaces req.body with parsed data → calls next()
5. If invalid → calls next(err) → goes to errorHandler → 422 response
```

#### Validation Schemas

| Schema | Validates | Key Rules |
|---|---|---|
| `loginSchema` | Login request | email must be valid, password min 6 chars |
| `createElectionSchema` | New election | name min 3 chars, scheduledDate must be datetime |
| `createConstituencySchema` | New constituency | electionId positive int, code min 2 chars |
| `createPollingStationSchema` | New station | address min 5 chars |
| `createPartySchema` | New party | abbreviation min 1 char, color must be hex |
| `createCandidateSchema` | New candidate | age min 18, serialNumber positive int |
| `createOfficerSchema` | New officer | password min 8 chars, employeeId min 3 chars |
| `createVoterSchema` | New voter | gender must be Male/Female/Other, aadhaar 12 digits |
| `voterVerificationSchema` | Voter verification | method must be AADHAAR or VOTER_ID |
| `otpVerifySchema` | OTP check | otp must be exactly 6 characters |
| `castVoteSchema` | Vote casting | voterId, candidateId, pollingStationId all positive ints |

---

### FILE: `server/src/middleware/upload.middleware.ts`

**TYPE:** Middleware

**PURPOSE:** Configures Multer for handling file uploads — candidate photos, party symbols, and voter photos.

**WHY IT EXISTS:** When the client uploads an image, it comes as `multipart/form-data`, not JSON. Multer parses this binary data, saves the file to disk, and makes file info available on `req.file`.

**WHO USES IT:** `management.routes.ts`, `voter.routes.ts`

**WHAT IT EXPORTS:**

| Export | Saves To | Field Name | Used For |
|---|---|---|---|
| `uploadCandidatePhoto` | `uploads/candidates/` | `photo` | Candidate profile photos |
| `uploadPartySymbol` | `uploads/parties/` | `symbol` | Party election symbols |
| `uploadVoterPhoto` | `uploads/voters/` | `photo` | Voter ID photos |
| `getFileUrl(folder, filename)` | — | — | Builds URL string like `/uploads/candidates/123.jpg` |

**How it works:**
1. Creates storage directory if it doesn't exist
2. Generates unique filename: `{timestamp}-{random}{extension}`
3. Only allows image files: jpeg, jpg, png, gif, webp, svg
4. Enforces max file size from config (5MB default)
5. Rejects non-image files with AppError

**Upload flow:**
```
Client sends POST /api/candidates/5/photo with form-data containing image
  ↓
uploadCandidatePhoto middleware runs
  ↓
Multer saves file to ./uploads/candidates/1723456789-123456789.jpg
  ↓
req.file = { filename: "1723456789-123456789.jpg", ... }
  ↓
Controller reads req.file.filename, updates candidate.photoUrl in database
```

---

## 4.4 — ROUTE FILES

---

### FILE: `server/src/routes/auth.routes.ts`

**TYPE:** Route

**PURPOSE:** Defines 3 authentication endpoints under `/api/auth`

**Routes defined:**
| Method | Path | Middleware | Handler | Purpose |
|---|---|---|---|---|
| POST | `/api/auth/login` | `validate(loginSchema)` | `authController.login` | User login |
| POST | `/api/auth/logout` | `authenticate` | `authController.logout` | User logout |
| GET | `/api/auth/profile` | `authenticate` | `authController.getProfile` | Get current user profile |

Note: Login does NOT require `authenticate` (the user doesn't have a token yet). Logout and profile DO require it.

---

### FILE: `server/src/routes/election.routes.ts`

**TYPE:** Route

**PURPOSE:** Defines election management endpoints under `/api/elections`. ALL routes require authentication (line 8: `router.use(authenticate)`).

**Routes defined:**
| Method | Path | Extra Middleware | Handler | Purpose |
|---|---|---|---|---|
| GET | `/api/elections/stats/dashboard` | — | `getDashboardStats` | Overall system statistics |
| GET | `/api/elections` | — | `getAll` | List all elections |
| GET | `/api/elections/:id` | — | `getById` | Get single election details |
| GET | `/api/elections/:id/stats` | — | `getStats` | Election-specific statistics |
| GET | `/api/elections/:id/results` | — | `getResults` | Election results |
| POST | `/api/elections` | `authorize(COMMISSIONER)` + `validate` | `create` | Create new election |
| PUT | `/api/elections/:id` | `authorize(COMMISSIONER)` | `update` | Update election |
| PATCH | `/api/elections/:id/status` | `authorize(COMMISSIONER)` | `updateStatus` | Change election status |
| POST | `/api/elections/:id/publish-results` | `authorize(COMMISSIONER)` | `publishResults` | Publish results |
| DELETE | `/api/elections/:id` | `authorize(COMMISSIONER)` | `delete` | Soft-delete election |

Note: GET routes are available to both COMMISSIONER and OFFICER. Create/Update/Delete routes are COMMISSIONER only.

---

### FILE: `server/src/routes/management.routes.ts`

**TYPE:** Route

**PURPOSE:** Defines CRUD endpoints for candidates, parties, constituencies, polling stations, and officers under `/api`. ALL routes require authentication.

**This is the largest route file with 26 endpoints for 5 entities:**

**Candidates** (`/api/candidates`):
| Method | Path | Middleware | Handler |
|---|---|---|---|
| GET | `/api/candidates` | — | `candidateController.getAll` |
| GET | `/api/candidates/:id` | — | `candidateController.getById` |
| POST | `/api/candidates` | `authorize(COMMISSIONER)` + `validate` | `candidateController.create` |
| PUT | `/api/candidates/:id` | `authorize(COMMISSIONER)` | `candidateController.update` |
| POST | `/api/candidates/:id/photo` | `authorize(COMMISSIONER)` + `uploadCandidatePhoto` | `candidateController.uploadPhoto` |
| DELETE | `/api/candidates/:id` | `authorize(COMMISSIONER)` | `candidateController.delete` |

**Parties** (`/api/parties`): Same CRUD pattern + `uploadSymbol`

**Constituencies** (`/api/constituencies`): Same CRUD pattern

**Polling Stations** (`/api/polling-stations`): CRUD + `getTurnout` + `updateMachineStatus`

**Officers** (`/api/officers`): CRUD (COMMISSIONER only for all operations)

---

### FILE: `server/src/routes/voter.routes.ts`

**TYPE:** Route

**PURPOSE:** Defines voter management endpoints under `/api/voters`. ALL routes require authentication.

| Method | Path | Middleware | Handler |
|---|---|---|---|
| GET | `/api/voters` | — | `voterController.getAll` |
| GET | `/api/voters/:id` | — | `voterController.getById` |
| POST | `/api/voters` | `authorize(COMMISSIONER)` + `validate` | `voterController.create` |
| PUT | `/api/voters/:id` | `authorize(COMMISSIONER)` | `voterController.update` |
| POST | `/api/voters/:id/photo` | `authorize(COMMISSIONER)` + `uploadVoterPhoto` | `voterController.uploadPhoto` |
| DELETE | `/api/voters/:id` | `authorize(COMMISSIONER)` | `voterController.delete` |

---

### FILE: `server/src/routes/voting.routes.ts`

**TYPE:** Route

**PURPOSE:** Defines the actual voting process endpoints under `/api/voting`. These are PUBLIC routes — no authentication required because the voting machine is a public terminal.

| Method | Path | Middleware | Handler | Purpose |
|---|---|---|---|---|
| POST | `/api/voting/verify/initiate` | `validate(voterVerificationSchema)` | `initiateVerification` | Start voter ID verification |
| POST | `/api/voting/verify/otp` | `validate(otpVerifySchema)` | `verifyOTP` | Verify the OTP |
| POST | `/api/voting/verify/biometric` | — | `simulateBiometric` | Simulate fingerprint/face check |
| POST | `/api/voting/cast` | `validate(castVoteSchema)` | `castVote` | **CAST THE ACTUAL VOTE** |
| GET | `/api/voting/vvpat/:referenceNumber` | — | `getVVPAT` | Retrieve VVPAT receipt |

> **IMPORTANT:** This is the only route file without `authenticate` middleware. The voting process happens on a public EVM terminal, not on a logged-in user's browser.

---

### FILE: `server/src/routes/report.routes.ts`

**TYPE:** Route

**PURPOSE:** Defines report/export endpoints under `/api`. ALL routes require COMMISSIONER authentication.

| Method | Path | Handler | Output |
|---|---|---|---|
| GET | `/api/audit-logs` | `auditController.getAll` | JSON (paginated) |
| GET | `/api/reports/election/:electionId/summary/pdf` | `reportController.electionSummaryPDF` | PDF file |
| GET | `/api/reports/election/:electionId/results/excel` | `reportController.resultsExcel` | Excel file |
| GET | `/api/reports/station/:stationId/voters/excel` | `reportController.votersExcel` | Excel file |
| GET | `/api/reports/audit-log/pdf` | `reportController.auditLogPDF` | PDF file |

---

## 4.5 — CONTROLLER FILES

---

### FILE: `server/src/controllers/auth.controller.ts`

**TYPE:** Controller

**PURPOSE:** Handles login, logout, and profile requests. Thin layer that extracts data from the request and delegates to `authService`.

**Important functions:**

#### `login(req, res, next)`
- **Receives:** `{ email, password }` from `req.body` (already validated by Zod)
- **Extracts:** IP address and user-agent from request headers
- **Calls:** `authService.login(email, password, ipAddress, userAgent)`
- **Returns:** `{ accessToken, refreshToken, user: { id, email, role, profile } }`
- **Error:** Delegates to `next(err)` → errorHandler

#### `logout(req, res, next)`
- **Receives:** User info from `req.user` (set by authenticate middleware)
- **Calls:** `authService.logout(userId, ipAddress, userAgent)`
- **Returns:** `{ success: true, message: "Logged out successfully" }`

#### `getProfile(req, res, next)`
- **Receives:** `req.user.userId` from JWT
- **Calls:** `authService.getProfile(userId)`
- **Returns:** Full user profile with commissioner/officer details

---

### FILE: `server/src/controllers/election.controller.ts`

**TYPE:** Controller

**PURPOSE:** Handles all election CRUD operations, status changes, result publication, and dashboard statistics.

**Important functions:**

#### `create(req, res, next)`
- Calls `electionRepository.create(req.body)` to insert election
- Calls `auditRepository.create(...)` to log the action
- Returns created election with 201 status

#### `updateStatus(req, res, next)`
- Validates status is a valid `ElectionStatus` enum value
- If status = `ACTIVE`, sets `startTime = now()`
- If status = `CLOSED`, sets `endTime = now()`
- Updates election via repository + creates audit log

#### `publishResults(req, res, next)`
- Checks election exists
- Checks election status is `CLOSED` (can't publish for active elections)
- Updates status to `RESULTS_PUBLISHED` and sets `isResultPublished = true`
- Creates audit log entry

#### `getResults(req, res, next)`
- Checks if results are published
- If NOT published AND user is NOT COMMISSIONER → returns 403 "Forbidden"
- If published OR user IS COMMISSIONER → returns results
- This is the **authorization restriction** that prevents officers from seeing results early

---

### FILE: `server/src/controllers/voting.controller.ts`

**TYPE:** Controller

**PURPOSE:** Handles the entire voting process — verification initiation, OTP verification, biometric simulation, vote casting, and VVPAT lookup.

**Important functions:**

#### `castVote(req, res, next)`
- **Receives:** `{ voterId, candidateId, pollingStationId }` from `req.body`
- **Calls:** `voteRepository.castVote(...)` — this is a DATABASE TRANSACTION
- **Returns:** `{ vote, vvpat, candidate, election }` with 201 status
- This is the **most important server function** for your DBMS presentation

#### `initiateVerification(req, res, next)`
- **Calls:** `verificationService.initiateVerification(req.body)`
- Handles voter identity checking and OTP generation

#### `verifyOTP(req, res, next)`
- **Calls:** `verificationService.verifyOTP(voterId, otp)`
- Checks if OTP is valid and not expired

---

### FILE: `server/src/controllers/candidate.controller.ts`

**TYPE:** Controller

**PURPOSE:** CRUD operations for candidates + photo upload.

- `getAll` — optionally filters by `constituencyId` query parameter
- `create` — inserts candidate + creates audit log
- `uploadPhoto` — checks `req.file` exists, builds photo URL, updates candidate record

---

### FILE: `server/src/controllers/voter.controller.ts`

**TYPE:** Controller

**PURPOSE:** CRUD operations for voters with pagination, search, and photo upload.

**Key detail in `create`:**
```
const { aadhaarNumber, dateOfBirth, ...rest } = req.body;
aadhaarHash: aadhaarNumber ? hashAadhaar(aadhaarNumber) : undefined
```
The raw Aadhaar number is NEVER stored. It's hashed with SHA-256 before saving to the database.

---

### FILE: `server/src/controllers/audit.controller.ts`

**TYPE:** Controller

**PURPOSE:** Contains TWO controllers — `AuditController` for audit log listing and `ReportController` for PDF/Excel generation.

- `AuditController.getAll` — paginated audit log listing with filters
- `ReportController.electionSummaryPDF` — delegates to `reportService`
- `ReportController.resultsExcel` — delegates to `reportService`
- `ReportController.votersExcel` — delegates to `reportService`
- `ReportController.auditLogPDF` — delegates to `reportService`

---

### Other Controllers (party, location, officer)

**`party.controller.ts`** — CRUD for political parties + symbol upload. Same pattern as candidate controller.

**`location.controller.ts`** — Contains TWO controllers:
- `ConstituencyController` — CRUD for constituencies
- `PollingStationController` — CRUD for polling stations + `updateMachineStatus` + `getTurnout`

**`officer.controller.ts`** — CRUD for election officers. Uses `userRepository` because officers are linked to the `User` table.

---

## 4.6 — SERVICE FILES

---

### FILE: `server/src/services/auth.service.ts`

**TYPE:** Service (Business Logic)

**PURPOSE:** Contains the core authentication logic — login validation, token generation, and audit logging.

**WHY IT EXISTS:** Login is complex. The controller shouldn't contain all this logic. The service handles: find user → check active → compare password → log attempt → generate tokens → update last login → create audit log.

#### `login(email, password, ipAddress, userAgent)`

Step-by-step:
1. Find user by email via `userRepository.findByEmail(email)`
2. If not found → throw 401 "Invalid email or password"
3. If `user.isActive === false` → throw 403 "Account deactivated"
4. Compare password using `bcryptjs.compare(password, user.passwordHash)`
5. Log login attempt (success or fail) via `userRepository.logLogin()`
6. If password wrong → throw 401 "Invalid email or password"
7. Get full profile (commissioner or officer details)
8. Build JWT payload: `{ userId, email, role, stationId }`
9. Generate access token (8h) and refresh token (7d)
10. Update `user.lastLoginAt` in database
11. Create audit log: "User logged in successfully"
12. Return `{ accessToken, refreshToken, user }`

#### `logout(userId, ipAddress, userAgent)`
- Simply creates an audit log entry for the logout action

#### `getProfile(userId)`
- Finds user by ID with commissioner/officer relations included

---

### FILE: `server/src/services/verification.service.ts`

**TYPE:** Service (Business Logic)

**PURPOSE:** Handles voter identity verification — checking voter existence, eligibility, generating OTP, and verifying OTP.

**IMPORTANT:** Aadhaar verification, OTP SMS, and biometric checks are all **SIMULATIONS**. In production, these would call government APIs.

#### `initiateVerification(data)`

1. If method = `VOTER_ID`: look up voter by voter ID string
2. If method = `AADHAAR`: hash the Aadhaar number, look up voter by hash
3. Check voter exists → 404 if not
4. Check voter is active → 403 if not
5. Check voter hasn't voted → 409 if already voted
6. Check voter is at correct polling station → 403 if wrong station
7. Generate 6-digit OTP
8. Save OTP to `otp_verifications` table with 5-minute expiry
9. Return voter info + **simulated OTP** (in production, this would be sent via SMS)

#### `verifyOTP(voterId, otp)`

1. Find OTP record where: voterId matches, otp matches, status = PENDING, not expired
2. If not found → 401 "Invalid or expired OTP"
3. Update OTP record: status = VERIFIED, verifiedAt = now
4. Return voter data

#### `simulateBiometric(voterId, type)`

- **Pure simulation** — always returns `{ verified: true }`
- Only checks voter exists and hasn't voted
- In production, this would connect to a fingerprint/face recognition device

---

### FILE: `server/src/services/report.service.ts`

**TYPE:** Service (Business Logic)

**PURPOSE:** Generates downloadable PDF and Excel reports for elections, voter lists, and audit logs.

#### `generateElectionSummaryPDF(electionId, res)`
- Queries election with all constituencies, candidates (with vote counts), and voter counts
- Uses **PDFKit** to create a formatted PDF document
- Includes: election details, constituency breakdowns, candidate vote tables
- Pipes directly to HTTP response as `application/pdf`

#### `generateResultsExcel(electionId, res)`
- Queries election with candidates ordered by vote count (descending)
- Uses **ExcelJS** to create a styled spreadsheet
- Marks winner with 🏆 emoji and green background
- If results not published, shows "Locked" instead of vote counts

#### `generateVotersExcel(pollingStationId, res)`
- Queries all voters for a polling station
- Creates Excel with: serial, name, voter ID, DOB, gender, address, voted status

#### `generateAuditLogPDF(filters, res)`
- Queries audit logs with optional date range filter (max 500 entries)
- Creates PDF with chronological audit entries

---

## 4.7 — REPOSITORY FILES

---

### FILE: `server/src/repositories/vote.repository.ts`

**TYPE:** Repository (Database Access)

**PURPOSE:** The most important repository — handles vote casting (with transaction), results calculation, VVPAT lookup, and dashboard statistics.

#### `castVote(data)` — **THE MOST IMPORTANT FUNCTION FOR DBMS**

This function uses `prisma.$transaction()` — a **database transaction** that ensures ALL steps succeed or ALL are rolled back.

**Inside the transaction (9 steps):**

| Step | What It Does | Table | Operation |
|---|---|---|---|
| 1 | Find voter, check exists | `voters` | SELECT with JOIN to constituency+election |
| 2 | Check `hasVoted === false` | — | In-memory check |
| 3 | Check `election.status === ACTIVE` | — | In-memory check |
| 4 | Check polling station machine is ACTIVE | `polling_stations` | SELECT |
| 5 | Check candidate belongs to same constituency | `candidates` | SELECT with JOIN to party |
| 6 | Generate SHA-256 hash + reference number | — | In-memory (crypto) |
| 7 | Create vote record | `votes` | INSERT |
| 8 | Create VVPAT record | `digital_vvpat` | INSERT |
| 9 | Mark voter as voted | `voters` | UPDATE (hasVoted=true, votedAt=now) |
| 10 | Create audit log | `audit_logs` | INSERT |

**If ANY step fails → entire transaction ROLLS BACK. No partial votes.**

#### `getResults(electionId)`
- Queries constituencies with candidates, including vote counts
- Orders candidates by vote count descending (winner first)
- Uses Prisma's `_count: { select: { votes: true } }` for aggregation

#### `getDashboardStats()`
- Uses `Promise.all()` to run 7 COUNT queries in parallel
- Returns totals for elections, stations, voters, candidates, parties, votes
- Calculates turnout percentage

---

### FILE: `server/src/repositories/user.repository.ts`

**TYPE:** Repository

**PURPOSE:** Database operations for users and election officers.

| Function | Table | Operation | Purpose |
|---|---|---|---|
| `findByEmail(email)` | `users` | SELECT WHERE email + not deleted | Login lookup |
| `findById(id)` | `users` | SELECT with commissioner/officer JOIN | Profile fetch |
| `findAllOfficers()` | `election_officers` | SELECT with user+station JOINs | List all officers |
| `createOfficer(data)` | `users` + `election_officers` | INSERT (nested create) | Register new officer |
| `updateOfficer(id, data)` | `election_officers` | UPDATE | Edit officer details |
| `deleteOfficer(id)` | `election_officers` + `users` | UPDATE (soft delete) | Deactivate officer |
| `updateLastLogin(userId)` | `users` | UPDATE lastLoginAt | Track login time |
| `logLogin(data)` | `login_logs` | INSERT | Record login attempt |

**Key detail — `createOfficer`:** This creates BOTH a `User` record AND an `ElectionOfficer` record in a single Prisma nested create. The password is hashed with bcrypt BEFORE saving.

---

### FILE: `server/src/repositories/election.repository.ts`

**TYPE:** Repository

**PURPOSE:** CRUD operations for elections with related data.

| Function | Operation | Includes |
|---|---|---|
| `findAll()` | SELECT all non-deleted | constituencies with voter/candidate counts |
| `findById(id)` | SELECT by ID | constituencies, polling stations, candidates with parties |
| `findActive()` | SELECT first ACTIVE election | full nested structure |
| `create(data)` | INSERT | — |
| `update(id, data)` | UPDATE | — |
| `delete(id)` | UPDATE deletedAt (soft delete) | — |
| `getStats(electionId)` | Multiple COUNTs | voter count, voted count, turnout %, candidate/station count |

**Soft delete pattern:** The `delete()` function doesn't actually DELETE the row. It sets `deletedAt = new Date()`. All queries filter by `deletedAt: null` to exclude "deleted" records. This preserves data integrity.

---

### Other Repositories

**`voter.repository.ts`** — Voter CRUD with pagination, search (by name or voter ID), lookup by voter ID string, lookup by Aadhaar hash. Uses `skip`/`take` for pagination.

**`candidate.repository.ts`** — Candidate CRUD with party and constituency JOINs, vote count aggregation.

**`party.repository.ts`** — Political party CRUD with candidate count.

**`constituency.repository.ts`** — Constituency CRUD with election, polling station, candidate JOINs.

**`polling-station.repository.ts`** — Station CRUD + machine status update + voter turnout calculation.

**`audit.repository.ts`** — Audit log creation and paginated listing with date range filters.
