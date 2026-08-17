# SEVM Server Analysis — Part 3: Request Lifecycles, Transactions & DBMS Concepts

---

# PART 6 — COMPLETE ROUTE TABLE

| Method | Endpoint | Auth | Role | Handler | Purpose |
|---|---|---|---|---|---|
| POST | `/api/auth/login` | No | — | `authController.login` | Login |
| POST | `/api/auth/logout` | Yes | Any | `authController.logout` | Logout |
| GET | `/api/auth/profile` | Yes | Any | `authController.getProfile` | Current user profile |
| GET | `/api/elections/stats/dashboard` | Yes | Any | `electionController.getDashboardStats` | System-wide stats |
| GET | `/api/elections` | Yes | Any | `electionController.getAll` | List elections |
| GET | `/api/elections/:id` | Yes | Any | `electionController.getById` | Election details |
| GET | `/api/elections/:id/stats` | Yes | Any | `electionController.getStats` | Election statistics |
| GET | `/api/elections/:id/results` | Yes | Any* | `electionController.getResults` | Election results |
| POST | `/api/elections` | Yes | COMMISSIONER | `electionController.create` | Create election |
| PUT | `/api/elections/:id` | Yes | COMMISSIONER | `electionController.update` | Update election |
| PATCH | `/api/elections/:id/status` | Yes | COMMISSIONER | `electionController.updateStatus` | Change status |
| POST | `/api/elections/:id/publish-results` | Yes | COMMISSIONER | `electionController.publishResults` | Publish results |
| DELETE | `/api/elections/:id` | Yes | COMMISSIONER | `electionController.delete` | Delete election |
| GET | `/api/candidates` | Yes | Any | `candidateController.getAll` | List candidates |
| GET | `/api/candidates/:id` | Yes | Any | `candidateController.getById` | Candidate details |
| POST | `/api/candidates` | Yes | COMMISSIONER | `candidateController.create` | Register candidate |
| PUT | `/api/candidates/:id` | Yes | COMMISSIONER | `candidateController.update` | Update candidate |
| POST | `/api/candidates/:id/photo` | Yes | COMMISSIONER | `candidateController.uploadPhoto` | Upload photo |
| DELETE | `/api/candidates/:id` | Yes | COMMISSIONER | `candidateController.delete` | Delete candidate |
| GET | `/api/parties` | Yes | Any | `partyController.getAll` | List parties |
| POST | `/api/parties` | Yes | COMMISSIONER | `partyController.create` | Create party |
| POST | `/api/parties/:id/symbol` | Yes | COMMISSIONER | `partyController.uploadSymbol` | Upload symbol |
| GET | `/api/constituencies` | Yes | Any | `constituencyController.getAll` | List constituencies |
| POST | `/api/constituencies` | Yes | COMMISSIONER | `constituencyController.create` | Create constituency |
| GET | `/api/polling-stations` | Yes | Any | `pollingStationController.getAll` | List stations |
| GET | `/api/polling-stations/:id/turnout` | Yes | Any | `pollingStationController.getTurnout` | Voter turnout |
| PATCH | `/api/polling-stations/:id/machine-status` | Yes | Any | `pollingStationController.updateMachineStatus` | EVM status |
| GET | `/api/officers` | Yes | COMMISSIONER | `officerController.getAll` | List officers |
| POST | `/api/officers` | Yes | COMMISSIONER | `officerController.create` | Register officer |
| GET | `/api/voters` | Yes | Any | `voterController.getAll` | List voters (paginated) |
| POST | `/api/voters` | Yes | COMMISSIONER | `voterController.create` | Register voter |
| POST | `/api/voters/:id/photo` | Yes | COMMISSIONER | `voterController.uploadPhoto` | Upload voter photo |
| POST | `/api/voting/verify/initiate` | No | — | `votingController.initiateVerification` | Start verification |
| POST | `/api/voting/verify/otp` | No | — | `votingController.verifyOTP` | Verify OTP |
| POST | `/api/voting/verify/biometric` | No | — | `votingController.simulateBiometric` | Simulate biometric |
| POST | `/api/voting/cast` | No | — | `votingController.castVote` | **CAST VOTE** |
| GET | `/api/voting/vvpat/:ref` | No | — | `votingController.getVVPAT` | Lookup VVPAT receipt |
| GET | `/api/audit-logs` | Yes | COMMISSIONER | `auditController.getAll` | View audit logs |
| GET | `/api/reports/election/:id/summary/pdf` | Yes | COMMISSIONER | `reportController.electionSummaryPDF` | PDF report |
| GET | `/api/reports/election/:id/results/excel` | Yes | COMMISSIONER | `reportController.resultsExcel` | Excel results |
| GET | `/api/reports/station/:id/voters/excel` | Yes | COMMISSIONER | `reportController.votersExcel` | Excel voter list |
| GET | `/api/reports/audit-log/pdf` | Yes | COMMISSIONER | `reportController.auditLogPDF` | PDF audit log |

*Results GET: Available to officers only AFTER `isResultPublished = true`. Commissioners can view anytime.

---

# PART 12 — API REQUEST LIFECYCLE (General)

Using the example: **GET /api/elections**

```
CLIENT (React browser app)
  │
  │ sends: GET http://localhost:5000/api/elections
  │ headers: { Authorization: "Bearer eyJhbG..." }
  ↓
EXPRESS SERVER (app.ts)
  │
  ↓ Step 1: helmet() — adds security headers
  ↓ Step 2: cors() — checks origin is allowed (localhost:5173)
  ↓ Step 3: rateLimit() — checks request count < 100/15min
  ↓ Step 4: compression() — prepares response compression
  ↓ Step 5: express.json() — parses body (empty for GET)
  ↓ Step 6: morgan() — logs "GET /api/elections" to file
  │
  ↓ Step 7: Route matching — matches /api/elections → election.routes.ts
  │
ROUTE FILE (election.routes.ts)
  │
  ↓ Step 8: authenticate middleware (auth.middleware.ts)
  │   → reads Authorization header
  │   → extracts JWT token
  │   → calls verifyAccessToken(token) from utils/jwt.ts
  │   → attaches { userId, email, role } to req.user
  │   → calls next()
  │
  ↓ Step 9: router.get('/') matches
  │
CONTROLLER (election.controller.ts)
  │
  ↓ Step 10: electionController.getAll(req, res, next)
  │   → calls electionRepository.findAll()
  │
REPOSITORY (election.repository.ts)
  │
  ↓ Step 11: prisma.election.findMany({...})
  │   → Prisma converts this to SQL:
  │     SELECT * FROM elections WHERE deletedAt IS NULL
  │     JOIN constituencies ...
  │     ORDER BY scheduledDate DESC
  │
DATABASE (MySQL)
  │
  ↓ Step 12: MySQL executes the query, returns rows
  │
REPOSITORY
  │
  ↓ Step 13: Prisma converts MySQL rows to JavaScript objects
  │
CONTROLLER
  │
  ↓ Step 14: sendSuccess(res, elections)
  │   → res.status(200).json({ success: true, message: "Success", data: [...] })
  │
EXPRESS
  │
  ↓ Step 15: compression() compresses the response
  │
CLIENT
  │
  ↓ Step 16: Receives JSON, renders election list in the UI
```

---

# PART 13 — LOGIN REQUEST TRACE

```
CLIENT
  │ POST http://localhost:5000/api/auth/login
  │ Body: { "email": "admin@eci.gov.in", "password": "Admin@123" }
  ↓
EXPRESS MIDDLEWARE (app.ts global middleware)
  │ helmet → cors → rateLimit → compression → express.json parses body → morgan logs
  ↓
ROUTE MATCHING
  │ /api/auth → auth.routes.ts
  │ POST /login → matches router.post('/login', ...)
  ↓
MIDDLEWARE: validate(loginSchema)
  │ FILE: middleware/validation.middleware.ts
  │ Zod checks: email is valid format? password >= 6 chars?
  │ If invalid → 422 error with field-level messages
  │ If valid → next()
  ↓
CONTROLLER: authController.login()
  │ FILE: controllers/auth.controller.ts
  │ Extracts: email, password from req.body
  │ Extracts: IP address, user-agent from request headers
  │ Calls: authService.login(email, password, ipAddress, userAgent)
  ↓
SERVICE: authService.login()
  │ FILE: services/auth.service.ts
  │
  │ Step 1: userRepository.findByEmail("admin@eci.gov.in")
  │   → Prisma: SELECT * FROM users WHERE email = "admin@eci.gov.in" AND deletedAt IS NULL
  │   → Returns user row with passwordHash
  │
  │ Step 2: Check user exists → if not, throw 401
  │ Step 3: Check user.isActive → if false, throw 403
  │
  │ Step 4: comparePassword("Admin@123", user.passwordHash)
  │   → bcryptjs.compare() checks password against hash
  │   → Returns true or false
  │
  │ Step 5: userRepository.logLogin({ userId, ipAddress, success: true/false })
  │   → INSERT INTO login_logs (userId, ipAddress, userAgent, success, createdAt)
  │   → This happens REGARDLESS of success/failure (for security auditing)
  │
  │ Step 6: If password wrong → throw 401
  │
  │ Step 7: userRepository.findById(user.id)
  │   → SELECT * FROM users JOIN election_commissioners/election_officers
  │   → Gets commissioner or officer profile details
  │
  │ Step 8: Build JWT payload
  │   payload = { userId: 1, email: "admin@eci.gov.in", role: "COMMISSIONER" }
  │
  │ Step 9: generateAccessToken(payload)
  │   → jwt.sign(payload, "secret_key", { expiresIn: "8h" })
  │   → Returns token string: "eyJhbGciOiJIUzI1NiIs..."
  │
  │ Step 10: generateRefreshToken(payload)
  │   → jwt.sign(payload, "refresh_secret", { expiresIn: "7d" })
  │
  │ Step 11: userRepository.updateLastLogin(user.id)
  │   → UPDATE users SET lastLoginAt = NOW() WHERE id = 1
  │
  │ Step 12: auditRepository.create({ action: 'LOGIN', ... })
  │   → INSERT INTO audit_logs (userId, action, module, description, ipAddress, ...)
  │
  │ Step 13: Return { accessToken, refreshToken, user: { id, email, role, profile } }
  ↓
CONTROLLER
  │ sendSuccess(res, result, 'Login successful')
  ↓
CLIENT receives:
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "accessToken": "eyJhbG...",
      "refreshToken": "eyJhbG...",
      "user": { "id": 1, "email": "admin@eci.gov.in", "role": "COMMISSIONER", "profile": {...} }
    }
  }
  │
  Client stores token in localStorage/memory
  Client sends token in Authorization header on every future request
```

**Technologies actually used for login:**
- ✅ **bcryptjs** — password hashing and comparison
- ✅ **jsonwebtoken (JWT)** — token creation and verification
- ✅ **Prisma** — database queries
- ✅ **Zod** — request validation

---

# PART 14 — ELECTION CREATION TRACE

```
CLIENT
  │ POST http://localhost:5000/api/elections
  │ Headers: { Authorization: "Bearer eyJhbG..." }
  │ Body: { "name": "Lok Sabha 2024", "electionType": "General", "scheduledDate": "2024-06-01T00:00:00.000Z" }
  ↓
MIDDLEWARE CHAIN:
  │ authenticate → verifies JWT → attaches req.user = { userId: 1, role: "COMMISSIONER" }
  │ authorize(COMMISSIONER) → checks role === COMMISSIONER → passes
  │ validate(createElectionSchema) → Zod validates name/type/date → passes
  ↓
CONTROLLER: electionController.create()
  │ FILE: controllers/election.controller.ts
  │ Converts scheduledDate string to Date object
  │ Calls: electionRepository.create({ name, electionType, scheduledDate })
  ↓
REPOSITORY: electionRepository.create()
  │ FILE: repositories/election.repository.ts
  │ Prisma: INSERT INTO elections (name, electionType, scheduledDate, status, createdAt, updatedAt)
  │         VALUES ("Lok Sabha 2024", "General", "2024-06-01", "DRAFT", NOW(), NOW())
  │ status defaults to "DRAFT" (defined in schema.prisma)
  ↓
CONTROLLER (back):
  │ Calls: auditRepository.create({ action: 'CREATE', module: 'Election', ... })
  │ Prisma: INSERT INTO audit_logs (userId, electionId, action, module, description, ipAddress)
  │ Sends: 201 { success: true, data: { id: 1, name: "Lok Sabha 2024", status: "DRAFT", ... } }
  ↓
CLIENT receives the created election
```

**Table affected:** `elections` (INSERT), `audit_logs` (INSERT)

---

# PART 15 — CANDIDATE CREATION TRACE

```
CLIENT
  │ POST /api/candidates
  │ Body: { "constituencyId": 1, "partyId": 2, "fullName": "Rahul Kumar", "age": 45, "serialNumber": 1 }
  ↓
MIDDLEWARE: authenticate → authorize(COMMISSIONER) → validate(createCandidateSchema)
  │ Zod checks: age >= 18, serialNumber > 0, fullName 2-150 chars
  ↓
CONTROLLER: candidateController.create()
  │ Calls: candidateRepository.create(req.body)
  ↓
REPOSITORY: candidateRepository.create()
  │ Prisma: INSERT INTO candidates (constituencyId, partyId, fullName, age, serialNumber, ...)
  │ Includes party data in response (JOIN)
  ↓
CONTROLLER:
  │ Creates audit log
  │ Returns 201 with candidate data
```

**How Candidate relates to other tables (from actual schema.prisma):**
- `Candidate` → belongs to → `Constituency` (via `constituencyId` foreign key, CASCADE delete)
- `Candidate` → belongs to → `PoliticalParty` (via `partyId` foreign key, SET NULL on delete)
- `Constituency` → belongs to → `Election` (via `electionId` foreign key)
- So: **Candidate → Constituency → Election** (indirect relationship)
- `Candidate` has many → `Vote` records
- `Candidate` has many → `DigitalVVPAT` records

**Photo upload is a SEPARATE request:**
```
POST /api/candidates/5/photo  (multipart/form-data with image)
  ↓ uploadCandidatePhoto middleware (Multer)
  ↓ Saves file to ./uploads/candidates/1723456789-123456789.jpg
  ↓ Controller updates: UPDATE candidates SET photoUrl = "/uploads/candidates/..." WHERE id = 5
```

---

# PART 16 — VOTER VERIFICATION TRACE

```
CLIENT (voting machine terminal)
  │ POST /api/voting/verify/initiate
  │ Body: { "method": "VOTER_ID", "voterId": "IND/DL/001/12345", "pollingStationId": 1 }
  │ NO authentication header (public route)
  ↓
MIDDLEWARE: validate(voterVerificationSchema)
  │ Zod checks: method is "AADHAAR" or "VOTER_ID", pollingStationId > 0
  ↓
CONTROLLER: votingController.initiateVerification()
  │ Calls: verificationService.initiateVerification(req.body)
  ↓
SERVICE: verificationService.initiateVerification()
  │
  │ Step 1 (VOTER_ID method):
  │   voterRepository.findByVoterId("IND/DL/001/12345")
  │   → SELECT * FROM voters WHERE voterId = "IND/DL/001/12345"
  │     JOIN polling_stations, constituencies, elections
  │
  │ Step 1 (AADHAAR method — alternative):
  │   hashAadhaar("123456789012") → SHA-256 hash
  │   voterRepository.findByAadhaarHash(hash)
  │   → SELECT * FROM voters WHERE aadhaarHash = "a1b2c3..." AND deletedAt IS NULL
  │
  │ Step 2: Check voter found → 404 if not
  │ Step 3: Check voter.isActive → 403 if inactive
  │ Step 4: Check voter.hasVoted → 409 if already voted
  │ Step 5: Check voter.pollingStationId === given pollingStationId → 403 if wrong station
  │
  │ Step 6: generateOTP() → random 6-digit number, e.g. "847293"
  │ Step 7: expiresAt = now + 5 minutes
  │
  │ Step 8: prisma.oTPVerification.create({
  │   voterId: voter.id,
  │   otp: "847293",
  │   method: "VOTER_ID",
  │   expiresAt: <5 min from now>
  │ })
  │ → INSERT INTO otp_verifications (voterId, otp, method, status, expiresAt, createdAt)
  │   status defaults to "PENDING"
  │
  │ Step 9: Return {
  │   voterId: 42,
  │   voterName: "Amit Sharma",
  │   maskedPhone: "+91-XXXXX6789",
  │   simulatedOtp: "847293",  ← SIMULATION: In production this would be sent via SMS
  │   message: "OTP sent to registered mobile number (SIMULATION)."
  │ }
  ↓
CLIENT displays OTP input field (and in simulation, shows the OTP directly)
```

**Fields actually checked for eligibility:**
- `voter.isActive` — is the voter record active?
- `voter.hasVoted` — has the voter already voted?
- `voter.pollingStationId` — is the voter at the correct station?

**What is simulated:**
- OTP delivery (returned in response instead of sent via SMS)
- Aadhaar API verification (just hash lookup instead of government API call)
- Biometric verification (always returns `{ verified: true }`)

---

# PART 17 — VOTE SUBMISSION TRACE (MOST IMPORTANT)

```
CLIENT (voting machine)
  │ POST /api/voting/cast
  │ Body: { "voterId": 42, "candidateId": 7, "pollingStationId": 1 }
  ↓
MIDDLEWARE: validate(castVoteSchema)
  │ Zod: all three must be positive integers
  ↓
CONTROLLER: votingController.castVote()
  │ FILE: controllers/voting.controller.ts
  │ Calls: voteRepository.castVote({ voterId: 42, candidateId: 7, pollingStationId: 1 })
  ↓
REPOSITORY: voteRepository.castVote()
  │ FILE: repositories/vote.repository.ts
  │
  │ ═══════════════════════════════════════════
  │ TRANSACTION BEGINS: prisma.$transaction()
  │ ═══════════════════════════════════════════
  │
  │ Step 1 — VOTER ELIGIBILITY CHECK ✅ IMPLEMENTED
  │   tx.voter.findUnique({ where: { id: 42 }, include: constituency → election })
  │   → SELECT * FROM voters JOIN constituencies JOIN elections WHERE voters.id = 42
  │   → Checks: voter exists? → 404 if not
  │
  │ Step 2 — ALREADY-VOTED CHECK ✅ IMPLEMENTED
  │   if (voter.hasVoted) throw "Voter has already cast their vote" (409)
  │
  │ Step 3 — CORRECT STATION CHECK ✅ IMPLEMENTED
  │   if (voter.pollingStationId !== pollingStationId) throw 403
  │
  │ Step 4 — ELECTION STATUS CHECK ✅ IMPLEMENTED
  │   if (election.status !== 'ACTIVE') throw "Election is not currently active" (400)
  │
  │ Step 5 — MACHINE STATUS CHECK ✅ IMPLEMENTED
  │   tx.pollingStation.findUnique({ where: { id: 1 } })
  │   if (station.machineStatus !== 'ACTIVE') throw "Voting machine is not active" (400)
  │
  │ Step 6 — CANDIDATE VALIDATION ✅ IMPLEMENTED
  │   tx.candidate.findUnique({ where: { id: 7 }, include: party })
  │   if (candidate.constituencyId !== voter.constituencyId) throw "Invalid candidate" (400)
  │
  │ Step 7 — HASH + REFERENCE GENERATION ✅ IMPLEMENTED
  │   voteHash = SHA-256(voterId + candidateId + stationId + timestamp + nonce)
  │   referenceNumber = "VOTE-M1K2N3-A4B5"
  │
  │ Step 8 — VOTE INSERTION ✅ IMPLEMENTED
  │   tx.vote.create({ voterId: 42, candidateId: 7, pollingStationId: 1, voteHash, referenceNumber })
  │   → INSERT INTO votes (voterId, candidateId, pollingStationId, voteHash, referenceNumber, castAt)
  │
  │ Step 9 — VVPAT CREATION ✅ IMPLEMENTED
  │   tx.digitalVVPAT.create({
  │     voteId, candidateId, candidateName, partyName, partySymbolUrl,
  │     electionName, referenceNumber, voteHash
  │   })
  │   → INSERT INTO digital_vvpat (...)
  │
  │ Step 10 — VOTER STATUS UPDATE ✅ IMPLEMENTED
  │   tx.voter.update({ where: { id: 42 }, data: { hasVoted: true, votedAt: now() } })
  │   → UPDATE voters SET hasVoted = 1, votedAt = NOW() WHERE id = 42
  │
  │ Step 11 — AUDIT LOG ✅ IMPLEMENTED
  │   tx.auditLog.create({ action: 'VOTE_CAST', module: 'Voting', description, electionId, metadata })
  │   → INSERT INTO audit_logs (...)
  │
  │ ═══════════════════════════════════════════
  │ TRANSACTION COMMITS (all 4 INSERTs + 1 UPDATE succeed together)
  │ ═══════════════════════════════════════════
  │
  │ Returns: { vote, vvpat, candidate, election }
  ↓
CONTROLLER:
  │ sendSuccess(res, result, 'Vote cast successfully', 201)
  ↓
CLIENT receives:
  {
    "success": true,
    "message": "Vote cast successfully",
    "data": {
      "vote": { "id": 1, "voteHash": "a1b2c3...", "referenceNumber": "VOTE-M1K2N3-A4B5" },
      "vvpat": { "candidateName": "Rahul Kumar", "partyName": "BJP", ... },
      "candidate": { "fullName": "Rahul Kumar", ... },
      "election": { "name": "Lok Sabha 2024", ... }
    }
  }
```

**Summary of vote casting steps:**

| Step | Status | What |
|---|---|---|
| Zod validation | ✅ IMPLEMENTED | IDs are positive integers |
| Voter exists | ✅ IMPLEMENTED | `tx.voter.findUnique()` |
| Already-voted check | ✅ IMPLEMENTED | `voter.hasVoted` |
| Correct station | ✅ IMPLEMENTED | `voter.pollingStationId !== pollingStationId` |
| Election active | ✅ IMPLEMENTED | `election.status !== 'ACTIVE'` |
| Machine active | ✅ IMPLEMENTED | `station.machineStatus !== 'ACTIVE'` |
| Candidate valid | ✅ IMPLEMENTED | Same constituency check |
| Database transaction | ✅ IMPLEMENTED | `prisma.$transaction()` |
| Vote insertion | ✅ IMPLEMENTED | `tx.vote.create()` |
| Vote hash (SHA-256) | ✅ IMPLEMENTED | `generateVoteHash()` |
| Reference number | ✅ IMPLEMENTED | `generateReferenceNumber()` |
| VVPAT creation | ✅ IMPLEMENTED | `tx.digitalVVPAT.create()` |
| Voter status update | ✅ IMPLEMENTED | `tx.voter.update({ hasVoted: true })` |
| Audit log | ✅ IMPLEMENTED | `tx.auditLog.create()` |
| Transaction commit | ✅ IMPLEMENTED | Automatic on success |
| Transaction rollback | ✅ IMPLEMENTED | Automatic on any error |

---

# PART 18 — DATABASE TRANSACTIONS

## The Only Transaction in the Server

The `castVote()` function in `vote.repository.ts` is the **only place** that uses an explicit database transaction.

```typescript
return prisma.$transaction(async (tx) => {
  // ALL operations inside here use `tx` instead of `prisma`
  // If ANY operation throws an error → ALL are rolled back
  // If ALL succeed → ALL are committed together
});
```

**What happens inside the transaction:**
```
BEGIN TRANSACTION
  ├── SELECT FROM voters (find voter)
  ├── SELECT FROM polling_stations (check machine)
  ├── SELECT FROM candidates (validate candidate)
  ├── INSERT INTO votes (create vote record)
  ├── INSERT INTO digital_vvpat (create receipt)
  ├── UPDATE voters SET hasVoted = true (mark voted)
  └── INSERT INTO audit_logs (log action)
COMMIT

── If any step fails: ──
ROLLBACK (undo everything)
```

**Why a transaction is necessary here:**

Imagine this scenario WITHOUT a transaction:
1. Vote is inserted into `votes` table ✅
2. Server crashes before updating `voters.hasVoted` ❌
3. Result: The vote is recorded but the voter isn't marked as voted
4. The voter could vote AGAIN → **election fraud!**

With a transaction: Either ALL steps succeed, or NONE of them happen.

## ACID Properties (DBMS Concepts)

| ACID Property | What It Means | How Our Project Demonstrates It |
|---|---|---|
| **Atomicity** | All operations succeed together or fail together | If VVPAT creation fails, the vote INSERT is also rolled back |
| **Consistency** | Database moves from one valid state to another | `hasVoted` and `votes` table are always in sync |
| **Isolation** | Concurrent transactions don't interfere | Two voters voting simultaneously won't corrupt each other's data |
| **Durability** | Once committed, data survives crashes | After COMMIT, the vote is permanently stored in MySQL |

---

# PART 19 — AUTHENTICATION & AUTHORIZATION

## Authentication ("Who are you?")

```
1. User sends POST /api/auth/login with { email, password }
2. Server finds user in database
3. Server compares password with bcrypt hash
4. Server creates JWT token containing { userId, email, role }
5. Server sends token to client
6. Client stores token
7. On every future request, client sends: Authorization: "Bearer <token>"
8. authenticate middleware verifies the token
9. If valid → req.user = { userId, email, role } → request continues
10. If invalid → 401 "Invalid or expired token" → request stops
```

## Authorization ("What are you allowed to do?")

Two roles exist: `COMMISSIONER` and `OFFICER`

```
authorize(UserRole.COMMISSIONER) middleware:
  → Checks req.user.role === "COMMISSIONER"
  → If yes → next() (request continues)
  → If no → 403 "Forbidden. Insufficient permissions."
```

**Actual examples from the code:**

| Action | Who Can Do It | How It's Enforced |
|---|---|---|
| View elections | Both | `authenticate` only |
| Create election | Commissioner only | `authorize(UserRole.COMMISSIONER)` |
| Register voters | Commissioner only | `authorize(UserRole.COMMISSIONER)` |
| View audit logs | Commissioner only | `authorize(UserRole.COMMISSIONER)` |
| Update machine status | Both | `authenticate` only |
| Cast vote | Public (no auth) | No middleware at all |
| View results (unpublished) | Commissioner only | Code check in controller |

---

# PART 20 — ERROR HANDLING

**How errors travel through the server:**

```
Error occurs (anywhere in controller/service/repository)
  ↓
Controller catches it in try/catch → calls next(err)
  ↓
Express skips ALL remaining middleware
  ↓
Express reaches errorHandler (the LAST app.use in app.ts)
  ↓
errorHandler checks error type → sends appropriate response
```

**Error types and responses:**

| Scenario | Error Type | Status | Response |
|---|---|---|---|
| Invalid email format in login | `ZodError` | 422 | `{ errors: [{ field: "email", message: "Invalid email" }] }` |
| Wrong password | `AppError` | 401 | `{ message: "Invalid email or password." }` |
| Election not found | `AppError` | 404 | `{ message: "Election not found." }` |
| Voter already voted | `AppError` | 409 | `{ message: "Voter has already cast their vote." }` |
| Officer tries to create election | `sendError` | 403 | `{ message: "Forbidden. Insufficient permissions." }` |
| No JWT token | `sendError` | 401 | `{ message: "Access denied. No token provided." }` |
| Duplicate voter ID | Prisma P2002 | 409 | `{ message: "A record with this value already exists." }` |
| Unknown server crash | Generic Error | 500 | `{ message: "Internal server error." }` |
| URL doesn't exist | `notFoundHandler` | 404 | `{ message: "Route GET /api/xyz not found." }` |

---

# PART 21 — FILE UPLOADS

**Three upload types exist:**

| Type | Endpoint | Middleware | Storage Folder |
|---|---|---|---|
| Candidate photo | `POST /api/candidates/:id/photo` | `uploadCandidatePhoto` | `./uploads/candidates/` |
| Party symbol | `POST /api/parties/:id/symbol` | `uploadPartySymbol` | `./uploads/parties/` |
| Voter photo | `POST /api/voters/:id/photo` | `uploadVoterPhoto` | `./uploads/voters/` |

**Complete flow:**
```
Client sends multipart/form-data with image file
  ↓
Multer middleware activates:
  → Checks file type (only images allowed)
  → Checks file size (max 5MB)
  → Creates upload directory if missing
  → Generates unique filename: "1723456789-123456789.jpg"
  → Saves file to disk: ./uploads/candidates/1723456789-123456789.jpg
  → Attaches file info to req.file
  ↓
Controller runs:
  → Reads req.file.filename
  → Builds URL: "/uploads/candidates/1723456789-123456789.jpg"
  → Updates database: UPDATE candidates SET photoUrl = "/uploads/candidates/..." WHERE id = 5
  → Returns updated record
  ↓
Client can now display the image at: http://localhost:5000/uploads/candidates/1723456789-123456789.jpg
```

The files are served as static files via `app.use('/uploads', express.static(...))` in `app.ts`.

---

# PART 22 — RESULTS

**Route:** `GET /api/elections/:id/results`

**Access control (in election.controller.ts):**
```
If results NOT published AND user is NOT commissioner → 403 Forbidden
If results published OR user IS commissioner → show results
```

This means an Election Officer CANNOT see results until the Commissioner explicitly publishes them.

**How votes are counted:**
```
voteRepository.getResults(electionId)
  ↓
prisma.constituency.findMany({
  where: { electionId },
  include: {
    candidates: {
      include: { party: true, _count: { select: { votes: true } } },
      orderBy: { votes: { _count: 'desc' } }   ← winner first
    }
  }
})
```

Prisma uses `_count: { select: { votes: true } }` which translates to:
```sql
SELECT candidates.*, COUNT(votes.id) as vote_count
FROM candidates
LEFT JOIN votes ON votes.candidateId = candidates.id
GROUP BY candidates.id
ORDER BY vote_count DESC
```

This demonstrates **aggregation (COUNT)**, **GROUP BY**, and **JOIN** — all DBMS concepts.

**Result publication:**
```
POST /api/elections/:id/publish-results
  → Checks election status === CLOSED
  → Updates: status = "RESULTS_PUBLISHED", isResultPublished = true
  → Creates audit log
```

---

# PART 23 — REPORT GENERATION

**PDF reports (using PDFKit):**
```
GET /api/reports/election/:id/summary/pdf
  ↓
reportController.electionSummaryPDF → reportService.generateElectionSummaryPDF()
  ↓
1. Query election with all constituencies, candidates, and vote counts
2. Create PDFDocument with A4 size
3. Set response headers: Content-Type: application/pdf
4. Write header: "Election Commission of India"
5. Write election details (name, type, status, dates)
6. For each constituency: write candidate table with vote counts
7. Pipe PDF directly to HTTP response (streams to client as download)
```

**Excel reports (using ExcelJS):**
```
GET /api/reports/election/:id/results/excel
  ↓
reportController.resultsExcel → reportService.generateResultsExcel()
  ↓
1. Query election with candidates ordered by vote count
2. Create ExcelJS Workbook
3. Add styled worksheet with headers
4. For each constituency: add candidate rows with vote counts
5. Mark winner with 🏆 and green background
6. If results not published: show "Locked" instead of counts
7. Write Excel to HTTP response as download
```

---

# PART 24 — DBMS CONCEPTS IN THIS PROJECT

| DBMS Concept | Simple Explanation | Where It Appears |
|---|---|---|
| **Primary Key** | Unique identifier for each row | Every table has `id Int @id @default(autoincrement())` |
| **Foreign Key** | Links one table to another | `Voter.constituencyId` → `Constituency.id` |
| **Relationships (1:N)** | One record has many related records | One Election has many Constituencies |
| **Relationships (1:1)** | One record linked to exactly one other | One User has one Commissioner profile |
| **Unique Constraint** | No duplicates allowed | `Voter.voterId @unique`, `Vote.voteHash @unique` |
| **Composite Unique** | Combination must be unique | `@@unique([electionId, code])` on Constituency |
| **Indexes** | Speed up searches on frequently queried columns | `@@index([email])`, `@@index([hasVoted])` |
| **Soft Delete** | Mark as deleted instead of removing | `deletedAt DateTime?` on most tables |
| **Normalization** | Avoid data duplication via separate tables | Party data stored once, referenced by many candidates |
| **Referential Integrity** | Foreign keys prevent orphan records | `onDelete: Cascade` — deleting election deletes its constituencies |
| **CASCADE** | Auto-delete children when parent is deleted | `Constituency` cascades from `Election` |
| **SET NULL** | Set FK to null when referenced record deleted | `Candidate.partyId` set null if party deleted |
| **RESTRICT** | Prevent deletion if records reference it | `Vote.voterId` — can't delete voter who has voted |
| **Transactions** | All-or-nothing group of operations | Vote casting: vote + VVPAT + voter update + audit |
| **ACID** | Atomicity, Consistency, Isolation, Durability | `prisma.$transaction()` in castVote |
| **Aggregation (COUNT)** | Count matching rows | `_count: { select: { votes: true } }` for results |
| **JOIN** | Combine data from multiple tables | `include: { party: true, constituency: true }` |
| **Enum** | Column restricted to predefined values | `ElectionStatus: DRAFT, SCHEDULED, ACTIVE, PAUSED, CLOSED, RESULTS_PUBLISHED` |
| **Audit Log** | Record of all actions for accountability | `audit_logs` table with action, user, timestamp |
| **Pagination** | Retrieve data in pages, not all at once | `skip: (page-1)*limit, take: limit` in voter listing |
| **Timestamp** | Auto-record creation/modification time | `createdAt @default(now())`, `updatedAt @updatedAt` |
| **Data Integrity** | Hashing ensures data hasn't been tampered | SHA-256 vote hash stored alongside vote |

---

# PART 25 — COMPLETE SERVER MAP

## Server Startup Flow
```
npm run dev
  ↓
tsx watch src/index.ts
  ↓
index.ts loads dotenv (.env file)
  ↓
index.ts imports app.ts
  ↓ app.ts creates Express app
  ↓ app.ts registers: helmet → cors → rateLimit → compression → json parser → morgan
  ↓ app.ts registers: /uploads static serving
  ↓ app.ts registers: /health endpoint
  ↓ app.ts registers: auth, election, management, voter, voting, report ROUTES
  ↓ app.ts registers: 404 handler → error handler
  ↓
index.ts calls startServer()
  ↓ prisma.$connect() → connects to MySQL
  ↓ app.listen(5000) → server starts accepting requests
  ↓
✅ Server is ready on http://localhost:5000
```

## API Request Flow
```
CLIENT (React app in browser)
  ↓ HTTP Request
EXPRESS (app.ts)
  ↓ Global middleware (helmet, cors, rateLimit, compression, json parser, morgan)
ROUTE FILE (routes/*.ts)
  ↓ authenticate middleware (check JWT)
  ↓ authorize middleware (check role)
  ↓ validate middleware (check data with Zod)
  ↓ upload middleware (if file upload)
CONTROLLER (controllers/*.ts)
  ↓ Extract data from request
  ↓ Call service or repository
SERVICE (services/*.ts) — if complex logic needed
  ↓ Business rules, validation
  ↓ Call repository
REPOSITORY (repositories/*.ts)
  ↓ Prisma query
PRISMA ORM
  ↓ Converts to SQL
MySQL DATABASE
  ↓ Executes query, returns rows
PRISMA → REPOSITORY → SERVICE → CONTROLLER
  ↓ sendSuccess(res, data) or sendError(res, message)
EXPRESS
  ↓ HTTP Response (JSON)
CLIENT
```

---

# PART 26 — SIMPLE EXPLANATION FOR YOUR PROFESSOR

> "Our Online Voting System uses a **three-tier architecture**: client, server, and database.
>
> The **server** is built with **Node.js** using the **Express.js** framework, written in **TypeScript**. It communicates with a **MySQL** database through **Prisma ORM**.
>
> When the client sends an HTTP request, it first passes through **middleware** — security headers (Helmet), cross-origin checks (CORS), rate limiting, and request body parsing.
>
> For protected routes, the **authentication middleware** verifies a **JWT token** to identify the user. The **authorization middleware** then checks if the user's role (Commissioner or Officer) permits the requested action.
>
> The request is then **validated** using **Zod schemas** to ensure all data meets the required format and constraints before touching the database.
>
> The **controller** receives the validated request, extracts the relevant data, and delegates to a **service** (for complex business logic) or a **repository** (for database operations).
>
> **Repositories** use the **Prisma ORM** to execute queries against MySQL. Prisma translates TypeScript function calls into SQL queries and returns the results as typed JavaScript objects.
>
> The most critical operation — **vote casting** — uses a **database transaction** (`prisma.$transaction`) to ensure **atomicity**: the vote record, VVPAT receipt, voter status update, and audit log are either ALL committed or ALL rolled back. This demonstrates the **ACID properties** central to our DBMS course.
>
> Our schema demonstrates **normalization** (separate tables for elections, constituencies, candidates, parties), **referential integrity** (foreign keys with CASCADE/RESTRICT/SET NULL), **indexes** for performance, **unique constraints** for data integrity, and **aggregation queries** (COUNT with GROUP BY) for election results.
>
> The server also generates **PDF and Excel reports** using PDFKit and ExcelJS, and maintains a comprehensive **audit log** that records every administrative action with timestamps, user identity, and IP addresses."
