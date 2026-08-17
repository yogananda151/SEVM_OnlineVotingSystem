# SEVM Client Analysis — Part 3: Voting Machine, Request Flows, Routing & Frontend Concepts

---

# PART 7 — VOTING MACHINE PAGE (MOST IMPORTANT CLIENT FILE)

### FILE: `client/src/pages/voting/VotingMachinePage.tsx`

**TYPE:** Page Component (Full Application)

**PURPOSE:** A complete touchscreen voting machine simulation with 9 sequential screens. This is the most complex client file — 603 lines containing the ENTIRE voting experience from welcome screen to VVPAT receipt.

**WHO USES IT:** `App.tsx` renders this at route `/voting-machine` (PUBLIC — no authentication required)

**WHY IT'S SPECIAL:** This page does NOT use `AdminLayout` or `OfficerLayout`. It renders as a standalone fullscreen application designed to look like an actual Electronic Voting Machine.

---

## The 9 Screens

The voting machine uses a `Screen` state variable to control which sub-component is displayed:

```
type Screen = 'welcome' | 'method' | 'verify' | 'otp' | 'biometric' | 'candidates' | 'confirm' | 'vvpat' | 'thankyou';
```

### Screen Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ WELCOME  │ ──► │  METHOD  │ ──► │  VERIFY  │ ──► │   OTP    │
│          │     │  SELECT  │     │  (enter   │     │  (enter  │
│ "BEGIN   │     │          │     │   ID)     │     │   OTP)   │
│  VOTING" │     │ Aadhaar  │     │          │     │          │
│          │     │ or       │     │ Voter ID │     │ 5-min    │
│          │     │ Voter ID │     │ or       │     │ countdown│
│          │     │          │     │ Aadhaar  │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                         │
                                                         ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│  VVPAT   │ ◄── │ CONFIRM  │ ◄── │CANDIDATES│
│  RECEIPT │     │          │     │          │
│          │     │ Review   │     │ Select   │
│ 7-second │     │ voter +  │     │ one      │
│ display  │     │ candidate│     │ candidate│
│          │     │ details  │     │ from     │
│ Auto-    │     │          │     │ list     │
│ resets   │     │ "Confirm │     │          │
│ to       │     │  Vote"   │     │ "VOTE    │
│ welcome  │     │          │     │  FOR..." │
└──────────┘     └──────────┘     └──────────┘
```

---

## Sub-Components (inside VotingMachinePage.tsx)

### `EVMHeader`
- Top bar showing: Smart EVM logo, "Election Commission of India – Official System"
- Green LED indicators for POWER and NETWORK status
- Current date/time display

### `WelcomeScreen`
- Large animated voting icon (pulsing scale animation)
- "SMART EVM" title + "Electronic Voting Machine" subtitle
- "BEGIN VOTING" button with gradient and tap animation
- Advances to → `method` screen

### `MethodScreen`
- Two large cards: "Aadhaar" (with scan icon) and "Voter ID" (with shield icon)
- Each card has hover border color change
- Sets `method` state and advances to → `verify` screen

### `VerifyScreen`
- Input field for Aadhaar number (12 digits) or Voter ID (EPIC format)
- "Verify & Send OTP" button
- Calls `votingService.initiateVerification(data)`:
  ```
  POST /api/voting/verify/initiate
  Body: { method: "VOTER_ID", voterId: "DL/01/001/0001", pollingStationId: 1 }
  ```
- On success → receives `{ voterId, voterName, simulatedOtp }` → advances to `otp` screen
- On error → shows toast.error with server message

### `OTPScreen`
- Displays voter name with verified icon
- Shows simulated OTP in amber box (in production, this would be sent via SMS)
- OTP input field (6 digits, numeric only)
- 5-minute countdown timer (300 seconds) using `useCountdown` hook
- Timer turns red when < 60 seconds
- "Confirm OTP" button calls `votingService.verifyOTP(voterId, otp)`:
  ```
  POST /api/voting/verify/otp
  Body: { voterId: 42, otp: "847293" }
  ```
- On success → receives verified voter data → loads candidates → advances to `candidates` screen

### `CandidateScreen`
- Header bar: "Cast Your Vote" with voter name and "✓ VERIFIED" badge
- Scrollable list of candidates sorted by serial number
- Each candidate shows:
  - Serial number badge (green when selected)
  - Photo (or placeholder avatar)
  - Full name, party name with color dot, abbreviation
  - Party symbol image (or abbreviation badge)
  - LED indicator (green glow when selected, gray when not)
- Bottom: "VOTE FOR {NAME}" button (disabled until selection)
- On select → advances to `confirm` screen

### `ConfirmScreen`
- ⚠️ Warning icon and "Confirm Your Vote" heading
- Review card showing: Voter name, Candidate name, Party name, Party symbol
- Warning: "Once confirmed, your vote cannot be changed."
- Two buttons: "Cancel" (returns to candidates) and "Confirm Vote"
- "Confirm Vote" calls `votingService.castVote(data)`:
  ```
  POST /api/voting/cast
  Body: { voterId: 42, candidateId: 7, pollingStationId: 1 }
  ```
- On success → receives `{ vote, vvpat, candidate, election }` → advances to `vvpat` screen
- On error → shows toast.error → returns to `candidates` screen
- **This triggers the server's database TRANSACTION** (the most important DBMS operation)

### `VVPATScreen` (Voter Verified Paper Audit Trail)
- Split layout: left side "VOTE RECORDED!" message, right side VVPAT slip
- VVPAT slip design (white card on dark background):
  ```
  ┌─────────────────────────────────┐
  │ VVPAT – Voter Verified Paper    │
  │ Audit Trail                     │
  │ Election Commission of India    │
  │─────────────────────────────────│
  │ Election:    Lok Sabha 2024     │
  │ Candidate:   Rahul Kumar        │
  │ Party:       BJP                │
  │         [Party Symbol Image]    │
  │─────────────────────────────────│
  │ Reference Number:               │
  │ VOTE-M1K2N3-A4B5               │
  │ 17/08/2026, 4:15:16 PM         │
  │─────────────────────────────────│
  │ a1b2c3d4e5f6g7h8i9j0k1l2...    │
  │ SHA-256 Verification Hash       │
  └─────────────────────────────────┘
  ```
- 7-second countdown timer
- Auto-resets to welcome screen when timer reaches 0

---

## Main Component State Machine

The `VotingMachinePage` component manages the entire flow:

```typescript
const [screen, setScreen] = useState<Screen>('welcome');
const [method, setMethod] = useState<'AADHAAR' | 'VOTER_ID'>('VOTER_ID');
const [initData, setInitData] = useState<...>(null);       // Verification response
const [voter, setVoter] = useState<VerifiedVoter | null>(null);  // Verified voter data
const [candidates, setCandidates] = useState<Candidate[]>([]);    // Candidates list
const [selectedCandidate, setSelectedCandidate] = useState<...>(null);
const [vvpatData, setVvpatData] = useState<VvpatRecord | null>(null);
const [castingVote, setCastingVote] = useState(false);
const POLLING_STATION_ID = 1;  // Hard-coded for demo
```

**Reset function** — Called when VVPAT timer expires:
```typescript
const reset = () => {
  setScreen('welcome');
  setInitData(null);
  setVoter(null);
  setCandidates([]);
  setSelectedCandidate(null);
  setVvpatData(null);
};
```

---

# PART 8 — COMPLETE ROUTE TABLE

| Path | Auth Required | Role | Component | Layout | Purpose |
|---|---|---|---|---|---|
| `/` | No | — | `LoginPage` | None | Login |
| `/voting-machine` | No | — | `VotingMachinePage` | None | Voting simulation |
| `/vvpat` | No | — | `VvpatPage` | None | VVPAT lookup |
| `/admin` | Yes | COMMISSIONER | `AdminDashboard` | `AdminLayout` | Dashboard |
| `/admin/elections` | Yes | COMMISSIONER | `ElectionsPage` | `AdminLayout` | Election CRUD |
| `/admin/constituencies` | Yes | COMMISSIONER | `ConstituenciesPage` | `AdminLayout` | Constituency CRUD |
| `/admin/polling-stations` | Yes | COMMISSIONER | `PollingStationsPage` | `AdminLayout` | Station CRUD |
| `/admin/parties` | Yes | COMMISSIONER | `PartiesPage` | `AdminLayout` | Party CRUD |
| `/admin/candidates` | Yes | COMMISSIONER | `CandidatesPage` | `AdminLayout` | Candidate CRUD |
| `/admin/officers` | Yes | COMMISSIONER | `OfficersPage` | `AdminLayout` | Officer CRUD |
| `/admin/voters` | Yes | COMMISSIONER | `VotersPage` | `AdminLayout` | Voter CRUD |
| `/admin/results` | Yes | COMMISSIONER | `ResultsPage` | `AdminLayout` | View results |
| `/admin/reports` | Yes | COMMISSIONER | `ReportsPage` | `AdminLayout` | Download reports |
| `/admin/vvpat` | Yes | COMMISSIONER | `VvpatPage` | `AdminLayout` | VVPAT lookup |
| `/admin/audit-logs` | Yes | COMMISSIONER | `AuditLogsPage` | `AdminLayout` | View audit trail |
| `/admin/notifications` | Yes | COMMISSIONER | `PlaceholderPage` | `AdminLayout` | Notifications |
| `/admin/settings` | Yes | COMMISSIONER | `PlaceholderPage` | `AdminLayout` | Settings |
| `/officer` | Yes | OFFICER | `OfficerDashboard` | `OfficerLayout` | Officer dashboard |
| `/officer/voters` | Yes | OFFICER | `VotersPage` | `OfficerLayout` | View voters |
| `/officer/machine` | Yes | OFFICER | `PlaceholderPage` | `OfficerLayout` | Machine control |
| `*` | No | — | `Navigate to /` | None | Fallback redirect |

---

# PART 9 — LOGIN REQUEST TRACE (CLIENT SIDE)

```
USER (browser)
  │ Types email + password, clicks "Sign In Securely"
  ↓
LoginPage.tsx — onSubmit()
  │ setLoading(true)
  │ Calls: authService.login({ email: "commissioner@evm.gov.in", password: "Admin@12345" })
  ↓
auth.service.ts — login()
  │ Calls: api.post('/auth/login', { email, password })
  ↓
lib/axios.ts — REQUEST INTERCEPTOR
  │ Checks localStorage for 'access_token' → none (first login)
  │ No Authorization header added
  ↓
Vite Dev Server — PROXY
  │ Forwards /api/auth/login → http://localhost:5000/api/auth/login
  ↓
EXPRESS SERVER (processes login — see server analysis)
  ↓
Server Response:
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "accessToken": "eyJhbG...",
      "refreshToken": "eyJhbG...",
      "user": { "id": 1, "email": "commissioner@evm.gov.in", "role": "COMMISSIONER", "profile": {...} }
    }
  }
  ↓
lib/axios.ts — RESPONSE INTERCEPTOR
  │ Status 200 → passes through unchanged
  ↓
auth.service.ts — login() continues
  │ Extracts accessToken and user from response
  │ localStorage.setItem('access_token', "eyJhbG...")  ← STORED
  │ localStorage.setItem('user', JSON.stringify(user))  ← STORED
  │ Returns { accessToken, user }
  ↓
LoginPage.tsx — onSubmit() continues
  │ Checks result.user.role === "COMMISSIONER" ← matches selectedRole
  │ toast.success("Welcome back!")
  │ navigate('/admin')  ← React Router changes URL without page reload
  ↓
App.tsx — Route matching
  │ URL = /admin → matches <Route path="/admin" ...>
  │ <RequireAuth role="COMMISSIONER">
  │   ↓ authService.isAuthenticated() → reads localStorage → 'access_token' exists → true
  │   ↓ authService.hasRole("COMMISSIONER") → reads user from localStorage → role matches → true
  │   ↓ Renders children
  │ <AdminLayout>
  │   ↓ Renders sidebar + header + content area
  │ <AdminDashboard />
  │   ↓ useAsync(getDashboardStats) → API call with JWT → renders dashboard
  ↓
USER sees the Admin Dashboard with stats and charts
```

---

# PART 10 — VOTE CASTING REQUEST TRACE (CLIENT SIDE)

```
VOTER (voting machine browser)
  │ Has verified identity, selected candidate, clicked "Confirm Vote"
  ↓
VotingMachinePage.tsx — handleCastVote()
  │ setCastingVote(true)
  │ Calls: votingService.castVote({
  │   voterId: 42,
  │   candidateId: 7,
  │   pollingStationId: 1
  │ })
  ↓
api.service.ts — castVote()
  │ api.post('/voting/cast', { voterId: 42, candidateId: 7, pollingStationId: 1 })
  ↓
lib/axios.ts — REQUEST INTERCEPTOR
  │ No access_token in localStorage (public route)
  │ No Authorization header added
  ↓
Vite PROXY → http://localhost:5000/api/voting/cast
  ↓
EXPRESS SERVER
  │ Middleware: validate(castVoteSchema) → Zod checks all IDs are positive ints
  │ Controller: votingController.castVote()
  │ Repository: voteRepository.castVote() → DATABASE TRANSACTION
  │   ↓ Check voter exists
  │   ↓ Check hasn't voted
  │   ↓ Check election ACTIVE
  │   ↓ Check machine ACTIVE
  │   ↓ Check candidate valid
  │   ↓ Generate SHA-256 hash + reference number
  │   ↓ INSERT INTO votes
  │   ↓ INSERT INTO digital_vvpat
  │   ↓ UPDATE voters SET hasVoted = true
  │   ↓ INSERT INTO audit_logs
  │   ↓ COMMIT TRANSACTION
  ↓
Server Response:
  {
    "success": true,
    "message": "Vote cast successfully",
    "data": {
      "vote": { "id": 1, "voteHash": "a1b2c3...", "referenceNumber": "VOTE-M1K2N3-A4B5" },
      "vvpat": {
        "candidateName": "Rahul Kumar",
        "partyName": "BJP",
        "partySymbolUrl": "/uploads/parties/...",
        "electionName": "Lok Sabha 2024",
        "referenceNumber": "VOTE-M1K2N3-A4B5",
        "voteHash": "a1b2c3...",
        "timestamp": "2026-08-17T10:45:16.000Z"
      },
      "candidate": { "fullName": "Rahul Kumar", ... },
      "election": { "name": "Lok Sabha 2024", ... }
    }
  }
  ↓
VotingMachinePage.tsx — handleCastVote() continues
  │ setVvpatData(result.vvpat)  ← stores VVPAT data
  │ setScreen('vvpat')           ← switches to VVPAT screen
  ↓
VVPATScreen renders:
  │ Left: "VOTE RECORDED!" with green checkmark animation
  │ Right: White VVPAT slip with candidate, party, reference number, hash
  │ 7-second countdown starts via useCountdown(7, reset)
  ↓
After 7 seconds:
  │ onComplete callback → reset() → everything back to welcome screen
  ↓
READY for next voter
```

---

# PART 11 — CLIENT ROUTE PROTECTION

## How `RequireAuth` Works

```typescript
const RequireAuth: React.FC<{ role: string; children: React.ReactNode }> = ({ role, children }) => {
  if (!authService.isAuthenticated()) return <Navigate to="/" replace />;
  if (!authService.hasRole(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};
```

**What happens when an unauthorized user tries to access `/admin`:**
```
User types /admin in browser
  ↓
React Router matches /admin route
  ↓
RequireAuth component renders
  ↓ authService.isAuthenticated()
  ↓ → checks localStorage for 'access_token'
  ↓ → if no token → return <Navigate to="/" /> (redirect to login)
  ↓ → if token exists → continue
  ↓
  ↓ authService.hasRole("COMMISSIONER")
  ↓ → reads 'user' from localStorage → JSON.parse
  ↓ → checks user.role === "COMMISSIONER"
  ↓ → if role doesn't match → return <Navigate to="/" /> (redirect to login)
  ↓ → if role matches → render children
  ↓
AdminLayout + AdminDashboard renders
```

**IMPORTANT:** This is CLIENT-SIDE protection only. It's NOT secure by itself. The SERVER also checks JWT tokens and roles via middleware. The client guard is for user experience (preventing wrong pages from showing), NOT for security.

**Two layers of protection:**
| Layer | Where | Purpose |
|---|---|---|
| Client-side | `RequireAuth` component | Prevents unauthorized pages from rendering (UX) |
| Server-side | `authenticate` + `authorize` middleware | Prevents unauthorized API calls (SECURITY) |

---

# PART 12 — STYLING & DESIGN SYSTEM

## How the Design System Works

The entire visual design is defined in [index.css](file:///d:/Yoga/DBMS/DBMS_project/client/src/index.css) using Tailwind CSS layers:

### `@layer base` — Global defaults
- Dark theme: `body { bg-slate-900, text-slate-100 }`
- Google Fonts loaded: Inter (body), JetBrains Mono (code)
- Custom scrollbar: 6px wide, slate-600 thumb on slate-800 track

### `@layer components` — Reusable patterns
| Class | Used For | Style |
|---|---|---|
| `.card` | Content containers | Dark translucent background, blur, rounded corners |
| `.card-glass` | Glassmorphism containers | White/5% opacity with blur |
| `.btn-primary` | Main action buttons | Blue gradient, shadow, hover lift effect |
| `.btn-secondary` | Secondary buttons | Slate background, hover lift |
| `.btn-danger` | Delete buttons | Red, hover lift |
| `.btn-success` | Success buttons | Emerald, hover lift |
| `.btn-ghost` | Tertiary buttons | Transparent, text only |
| `.input` | Form inputs | Dark background, slate border, blue focus ring |
| `.table` | Data tables | Styled headers, hover rows, subtle borders |
| `.badge` | Status indicators | Small rounded pills with colored borders |
| `.stat-card` | Dashboard stat cards | Card with icon area and hover animation |
| `.modal-backdrop` | Modal overlay | Fixed black/60% with blur |
| `.nav-item` | Sidebar links | Rounded, hover highlight |
| `.nav-item-active` | Active sidebar link | Blue tint with primary border |
| `.evm-button` | Voting machine buttons | Gradient, border highlight, active scale |
| `.evm-led` | EVM LED indicators | Small circle with glow shadow |

### `@layer utilities` — Helper classes
- `.text-gradient` — Blue gradient text effect
- `.glow-primary` — Blue glow box shadow
- `.animate-in` — Fade-in animation

---

# PART 13 — FRONTEND CONCEPTS IN THIS PROJECT

| Frontend Concept | Simple Explanation | Where It Appears |
|---|---|---|
| **Single Page Application (SPA)** | One HTML page, React swaps content dynamically | `index.html` has only `<div id="root">`, React renders everything |
| **Component-Based Architecture** | UI built from reusable, composable pieces | `Modal`, `StatCard`, `StatusBadge` used across many pages |
| **Client-Side Routing** | URL changes without page reload | React Router in `App.tsx` — `/admin/elections` renders ElectionsPage |
| **JWT Authentication** | Token-based auth stored in browser | `localStorage.setItem('access_token', token)` after login |
| **Route Guards** | Prevent unauthorized page access | `RequireAuth` component checks token + role before rendering |
| **Axios Interceptors** | Automatic token attachment + error handling | `lib/axios.ts` request/response interceptors |
| **Custom Hooks** | Reusable stateful logic | `useAsync` (fetch data), `useMutation` (CRUD operations) |
| **Form Validation (Zod)** | Type-safe schema validation | Login form schema, election creation schema |
| **React Hook Form** | Declarative form state management | Every CRUD page uses `useForm` with `zodResolver` |
| **State Management** | `useState` for component state | Every page manages its own state (no global store) |
| **Controlled Components** | Form inputs bound to React state | `<input {...register('name')} />` via react-hook-form |
| **Conditional Rendering** | Show/hide UI based on state | Loading skeletons, empty states, modal visibility |
| **Animation** | Smooth UI transitions | Framer Motion: page transitions, modal enter/exit, VVPAT receipt |
| **Data Visualization** | Charts from database data | Recharts: PieChart (dashboard), BarChart (results) |
| **Pagination** | Browse large data sets in pages | VotersPage: `page` state → `skip/take` query params → `<Pagination>` |
| **Proxy** | Forward requests to different server | Vite config: `/api → localhost:5000` avoids CORS issues |
| **Responsive Design** | Works on different screen sizes | AdminLayout: desktop sidebar vs. mobile hamburger menu |
| **Design Tokens** | Centralized visual constants | Tailwind config: custom colors, fonts, animations |
| **Toast Notifications** | Non-blocking success/error messages | `react-hot-toast` — green for success, red for error |
| **Loading States** | Visual feedback during API calls | Skeleton loaders, button spinners, "Please wait..." text |
| **File Upload** | Browser → server file transfer | `FormData` + multipart/form-data for candidate photos, party symbols |
| **Optimistic UI** | Immediate UI update before server confirms | Table refetch after mutation success — `onSuccess: () => refetch()` |

---

# PART 14 — COMPLETE CLIENT MAP

## Client Startup Flow
```
npm run dev
  ↓
Vite starts dev server on port 5173
  ↓
Browser opens http://localhost:5173
  ↓
Vite serves index.html
  ↓
Browser loads src/main.tsx
  ↓ Imports React, ReactDOM, App, index.css
  ↓ index.css loads Google Fonts + Tailwind CSS + design system
  ↓ App.tsx imports all pages, layouts, services
  ↓ ReactDOM.createRoot(#root).render(<App />)
  ↓
App component renders:
  ↓ <BrowserRouter> wraps everything (enables routing)
  ↓ <Toaster> enables toast notifications
  ↓ <Routes> defines all URL → component mappings
  ↓
React Router checks current URL
  ↓ URL = "/" → renders <LoginPage />
  ↓ URL = "/admin" → checks auth → renders <AdminLayout><AdminDashboard /></AdminLayout>
  ↓ URL = "/voting-machine" → renders <VotingMachinePage />
  ↓
✅ Client is ready in the browser
```

## User Interaction Flow
```
USER (browser)
  ↓ Interacts with React components (click, type, select)
PAGE COMPONENT (pages/*.tsx)
  ↓ Handles event, calls service function
SERVICE (services/*.ts)
  ↓ Calls Axios with HTTP method + URL + data
AXIOS (lib/axios.ts)
  ↓ Attaches JWT token (interceptor)
  ↓ Sends HTTP request
VITE PROXY
  ↓ Forwards /api/* to http://localhost:5000
EXPRESS SERVER
  ↓ Processes request → MySQL query → response
VITE PROXY (reverse)
  ↓ Returns response to browser
AXIOS
  ↓ Checks for 401 (interceptor)
  ↓ Returns response data
SERVICE
  ↓ Extracts .data.data from response
PAGE COMPONENT
  ↓ Updates React state (useState setter)
REACT
  ↓ Re-renders component with new data
USER
  ↓ Sees updated UI (table rows, charts, badges, etc.)
```

---

# PART 15 — HOW CLIENT CONNECTS TO DBMS CONCEPTS

| DBMS Concept | How the Client Demonstrates It |
|---|---|
| **CRUD Operations** | Every admin page performs Create/Read/Update/Delete via API calls |
| **Pagination** | VotersPage sends `page` and `limit` params → server uses `SKIP/TAKE` |
| **Search/Filtering** | VotersPage search by name → server uses `WHERE name LIKE '%...'` |
| **Foreign Keys** | Constituency dropdown in CandidatesPage → `constituencyId` foreign key |
| **Relationships** | Election → Constituencies → Candidates displayed in nested UI |
| **Aggregation** | Dashboard stat cards show COUNT results from server queries |
| **Transactions** | Vote casting button triggers the server's `prisma.$transaction()` |
| **Data Integrity** | VVPAT screen displays the SHA-256 vote hash |
| **Audit Trail** | AuditLogsPage displays all audit_logs from the database |
| **Referential Actions** | Delete party → candidates show "Independent" (SET NULL in action) |
| **Enums** | StatusBadge maps election status enum values to colored badges |
| **Soft Delete** | Deleted records disappear from UI but remain in database |
| **Normalization** | Separate pages for Elections, Constituencies, Parties, Candidates — separate tables |

---

# PART 16 — SIMPLE EXPLANATION FOR YOUR PROFESSOR

> "Our Online Voting System's **client** (frontend) is built with **React 18** using **TypeScript**, bundled by **Vite**, and styled with **Tailwind CSS**.
>
> The client is a **Single Page Application** — one HTML file with React dynamically rendering all pages. URL routing is handled by **React Router**, which maps paths like `/admin/elections` to specific React components without page reloads.
>
> **Authentication** uses **JWT tokens** stored in the browser's `localStorage`. An **Axios interceptor** automatically attaches the token to every API request. A **RequireAuth** route guard component checks the token and user role before rendering protected pages — though real security enforcement happens on the server.
>
> All API communication is centralized in **service files** (`api.service.ts`, `auth.service.ts`). These call the Express backend through **Vite's development proxy** (which avoids CORS issues). Every admin page follows the same pattern: **useAsync** hook fetches data, **useMutation** hook handles create/update/delete with toast notifications, and **react-hook-form + Zod** handle form state and validation.
>
> The most complex client component is the **VotingMachinePage** — a 603-line simulation of an Electronic Voting Machine with 9 sequential screens: welcome, verification method selection, ID entry, OTP verification, candidate selection, vote confirmation, and VVPAT receipt display. The vote casting action triggers the server's **database transaction** (`prisma.$transaction`) which is the core DBMS concept in our project.
>
> The client also demonstrates several DBMS-related frontend patterns: **pagination** (skip/take query parameters), **search and filtering** (WHERE clauses), **foreign key relationships** (dropdown selectors linked to parent tables), **aggregation** (dashboard statistics from COUNT queries), and **data visualization** (Recharts pie/bar charts showing database query results).
>
> The design system uses a **dark theme** with glassmorphism effects, **Framer Motion** animations for smooth transitions, and **Lucide icons** for a professional, premium feel."
