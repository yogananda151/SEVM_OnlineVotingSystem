# 📊 Data Storage & Code Flow Guide – SEVM Online Voting System

---

## 1. Where Is the Data Stored?

Your data is stored in a **MySQL database** running on your local machine (`localhost`).

| Property | Value |
|---|---|
| **Database Type** | MySQL |
| **Host** | `localhost` (your computer) |
| **Port** | `3306` (default MySQL port) |
| **Database Name** | `voting_system` |
| **Username** | `root` |
| **Password** | `Yoga@1234` |

This connection is defined in [`.env`](file:///d:/Yoga/DBMS/DBMS_project/server/.env) (line 3):
```
DATABASE_URL="mysql://root:Yoga@1234@localhost:3306/voting_system"
```

The server uses **Prisma ORM** (a tool that translates JavaScript/TypeScript code into SQL queries) to communicate with this MySQL database. The Prisma client is created in [`database.ts`](file:///d:/Yoga/DBMS/DBMS_project/server/src/config/database.ts).

---

## 2. What Tables Exist in the Database?

All tables are defined in the Prisma schema file: [`schema.prisma`](file:///d:/Yoga/DBMS/DBMS_project/server/prisma/schema.prisma)

| Prisma Model | MySQL Table Name | What It Stores |
|---|---|---|
| `User` | `users` | Admin (Commissioner) and Officer login accounts |
| `ElectionCommissioner` | `election_commissioners` | Commissioner profile details |
| `ElectionOfficer` | `election_officers` | Officer profile details |
| `Election` | `elections` | **All election data** (name, type, date, status) |
| `Constituency` | `constituencies` | Constituencies within each election |
| `PollingStation` | `polling_stations` | Polling stations within constituencies |
| `PoliticalParty` | `political_parties` | Registered political parties |
| `Candidate` | `candidates` | Candidates contesting in elections |
| `Voter` | `voters` | Registered voters |
| `Vote` | `votes` | Cast votes (encrypted with hash) |
| `DigitalVVPAT` | `digital_vvpat` | Digital vote receipts |
| `OTPVerification` | `otp_verifications` | OTP codes for voter verification |
| `AuditLog` | `audit_logs` | Log of all actions (who did what) |
| `LoginLog` | `login_logs` | Login attempt records |
| `Notification` | `notifications` | System notifications |
| `Setting` | `settings` | App configuration settings |

---

## 3. How to View the Data

### Method 1: Using MySQL Command Line
Open a terminal and run:
```bash
mysql -u root -p
```
Enter password: `Yoga@1234`

Then run:
```sql
USE voting_system;
SHOW TABLES;                     -- See all tables
SELECT * FROM elections;         -- See all elections
SELECT * FROM voters;            -- See all voters
SELECT * FROM votes;             -- See all cast votes
SELECT * FROM constituencies;    -- See all constituencies
SELECT * FROM candidates;        -- See all candidates
SELECT * FROM political_parties; -- See all parties
SELECT * FROM audit_logs;        -- See who did what
SELECT * FROM users;             -- See all user accounts
```

### Method 2: Using MySQL Workbench (GUI)
1. Open **MySQL Workbench**
2. Connect with: Host=`localhost`, Port=`3306`, User=`root`, Password=`Yoga@1234`
3. Double-click `voting_system` in the sidebar
4. Click on any table → right-click → "Select Rows" to see data

### Method 3: Using Prisma Studio (Built-in Visual Tool)
Run this command in the `server` folder:
```bash
npx prisma studio
```
This opens a **web-based GUI** at `http://localhost:5555` where you can browse, edit, and filter all your tables visually. **This is the easiest method.**

---

## 4. Complete Code Flow: What Happens When You Click "+ NEW ELECTION"

Here is the exact step-by-step journey through the code:

```mermaid
flowchart TD
    A["🖱️ User clicks '+ New Election' button"] --> B["ElectionsPage.tsx opens modal"]
    B --> C["User fills form & clicks 'Create Election'"]
    C --> D["Form validated by Zod schema"]
    D --> E["electionService.create() called"]
    E --> F["Axios sends POST /api/elections"]
    F --> G["Vite proxy forwards to localhost:5000"]
    G --> H["Express router matches POST /"]
    H --> I["Auth middleware checks JWT token"]
    I --> J["Authorize checks COMMISSIONER role"]
    J --> K["Validation middleware checks body"]
    K --> L["electionController.create() runs"]
    L --> M["electionRepository.create() runs"]
    M --> N["Prisma sends INSERT query to MySQL"]
    N --> O["✅ Data saved in 'elections' table"]
    O --> P["Response sent back to browser"]
    P --> Q["Table refreshes with new election"]
```

### Step-by-step with exact file references:

---

### Step 1: Button Click (Frontend)
📄 **File:** [`ElectionsPage.tsx`](file:///d:/Yoga/DBMS/DBMS_project/client/src/pages/admin/ElectionsPage.tsx#L84)

```jsx
<button onClick={openCreate} className="btn-primary">
  <Plus size={16} /> New Election
</button>
```

When clicked, it calls `openCreate()` ([line 54](file:///d:/Yoga/DBMS/DBMS_project/client/src/pages/admin/ElectionsPage.tsx#L54)):
```jsx
const openCreate = () => { reset(); setEditTarget(null); setModalOpen(true); };
```
This **opens a modal form** (the popup dialog).

---

### Step 2: User Fills the Form & Submits
📄 **File:** [`ElectionsPage.tsx`](file:///d:/Yoga/DBMS/DBMS_project/client/src/pages/admin/ElectionsPage.tsx#L142-L174)

The form collects 4 fields:
- **Election Name** (text)
- **Description** (text, optional)
- **Election Type** (dropdown: General, State Legislative, Municipal, etc.)
- **Scheduled Date** (date picker)

The form is validated using a **Zod schema** ([line 13-18](file:///d:/Yoga/DBMS/DBMS_project/client/src/pages/admin/ElectionsPage.tsx#L13-L18)):
```typescript
const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  electionType: z.string().min(1, 'Election type is required'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
});
```

When user clicks **"Create Election"**, it calls `onSubmit` → `createElection(data)` ([line 65-68](file:///d:/Yoga/DBMS/DBMS_project/client/src/pages/admin/ElectionsPage.tsx#L65-L68)).

---

### Step 3: API Call from Client to Server
📄 **File:** [`api.service.ts`](file:///d:/Yoga/DBMS/DBMS_project/client/src/services/api.service.ts#L9)

```typescript
create: async (data: object) => (await api.post('/elections', data)).data.data,
```

This uses **Axios** (configured in [`axios.ts`](file:///d:/Yoga/DBMS/DBMS_project/client/src/lib/axios.ts)) to send:
```
POST http://localhost:5173/api/elections
Body: { name: "...", electionType: "...", scheduledDate: "...", description: "..." }
Header: Authorization: Bearer <JWT_TOKEN>
```

> [!NOTE]
> The Vite dev server proxies `/api` requests to `http://localhost:5000` (the backend server), so the actual request reaches `http://localhost:5000/api/elections`.

---

### Step 4: Server Receives the Request – Routing
📄 **File:** [`election.routes.ts`](file:///d:/Yoga/DBMS/DBMS_project/server/src/routes/election.routes.ts#L17)

```typescript
router.post('/', authorize(UserRole.COMMISSIONER), validate(createElectionSchema), 
  electionController.create.bind(electionController));
```

This line means:
1. **`authenticate`** middleware (applied to all routes, [line 8](file:///d:/Yoga/DBMS/DBMS_project/server/src/routes/election.routes.ts#L8)) → verifies the JWT token is valid
2. **`authorize(UserRole.COMMISSIONER)`** → checks the user has COMMISSIONER role
3. **`validate(createElectionSchema)`** → validates the request body on server side
4. **`electionController.create`** → the actual handler

---

### Step 5: Controller Handles the Logic
📄 **File:** [`election.controller.ts`](file:///d:/Yoga/DBMS/DBMS_project/server/src/controllers/election.controller.ts#L39-L55)

```typescript
async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    const election = await electionRepository.create({
      ...req.body,
      scheduledDate: new Date(req.body.scheduledDate),
    });
    await auditRepository.create({
      userId: req.user!.userId,
      electionId: election.id,
      action: 'CREATE',
      module: 'Election',
      description: `Created election: ${election.name}`,
      ipAddress: req.ip,
    });
    sendSuccess(res, election, 'Election created successfully', 201);
}
```

This does **two things**:
1. Creates the election in the database
2. Creates an **audit log entry** recording who created it

---

### Step 6: Repository Saves to Database
📄 **File:** [`election.repository.ts`](file:///d:/Yoga/DBMS/DBMS_project/server/src/repositories/election.repository.ts#L46-L53)

```typescript
async create(data: { name: string; description?: string; electionType: string; scheduledDate: Date; }) {
    return prisma.election.create({ data });
}
```

**Prisma** converts this into an SQL query like:
```sql
INSERT INTO elections (name, description, electionType, scheduledDate, status, isResultPublished, createdAt, updatedAt)
VALUES ('General Election 2025', 'Description...', 'General', '2025-12-15', 'DRAFT', false, NOW(), NOW());
```

> [!IMPORTANT]
> The data is now permanently stored in the `elections` table of the `voting_system` MySQL database on your computer. The new election starts with status `DRAFT`.

---

### Step 7: Response Returns to Frontend
The server sends back a JSON response:
```json
{
  "success": true,
  "data": { "id": 1, "name": "General Election 2025", "status": "DRAFT", ... },
  "message": "Election created successfully"
}
```

Back in [`ElectionsPage.tsx`](file:///d:/Yoga/DBMS/DBMS_project/client/src/pages/admin/ElectionsPage.tsx#L36), on success:
```typescript
{ onSuccess: () => { refetch(); setModalOpen(false); reset(); }, successMessage: 'Election created successfully' }
```
- `refetch()` → reloads the elections list (GET `/api/elections`)
- `setModalOpen(false)` → closes the modal
- `reset()` → clears the form
- A **toast notification** shows "Election created successfully"

---

## 5. Summary: Architecture Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (React App)                         │
│  Pages (ElectionsPage.tsx)  →  Services (api.service.ts)  →  Axios │
│                              localhost:5173                         │
└────────────────────────────────────┬────────────────────────────────┘
                                     │ HTTP (POST /api/elections)
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SERVER (Express + TypeScript)                   │
│  Routes → Middleware (auth/validate) → Controllers → Repositories  │
│                              localhost:5000                         │
└────────────────────────────────────┬────────────────────────────────┘
                                     │ SQL queries via Prisma ORM
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      MySQL DATABASE                                │
│  Database: voting_system                                           │
│  Tables: elections, voters, votes, candidates, parties, etc.       │
│                              localhost:3306                         │
└─────────────────────────────────────────────────────────────────────┘
```

## 6. Quick Reference: Key Files

| Purpose | File |
|---|---|
| Database connection string | [`.env`](file:///d:/Yoga/DBMS/DBMS_project/server/.env) |
| Database schema (all tables) | [`schema.prisma`](file:///d:/Yoga/DBMS/DBMS_project/server/prisma/schema.prisma) |
| Prisma client setup | [`database.ts`](file:///d:/Yoga/DBMS/DBMS_project/server/src/config/database.ts) |
| API routes (URL mapping) | [`election.routes.ts`](file:///d:/Yoga/DBMS/DBMS_project/server/src/routes/election.routes.ts) |
| Business logic | [`election.controller.ts`](file:///d:/Yoga/DBMS/DBMS_project/server/src/controllers/election.controller.ts) |
| Database queries | [`election.repository.ts`](file:///d:/Yoga/DBMS/DBMS_project/server/src/repositories/election.repository.ts) |
| Frontend Elections page | [`ElectionsPage.tsx`](file:///d:/Yoga/DBMS/DBMS_project/client/src/pages/admin/ElectionsPage.tsx) |
| Frontend API calls | [`api.service.ts`](file:///d:/Yoga/DBMS/DBMS_project/client/src/services/api.service.ts) |
| Axios HTTP client config | [`axios.ts`](file:///d:/Yoga/DBMS/DBMS_project/client/src/lib/axios.ts) |
