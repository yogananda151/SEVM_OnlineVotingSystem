# SEVM Client Analysis — Part 2: File-by-File Explanation

---

# PART 6 — FILE-BY-FILE EXPLANATION

---

## 6.1 — CONFIGURATION FILES

---

### FILE: `client/index.html`

**TYPE:** HTML Entry Point

**PURPOSE:** The single HTML page of the entire application. React renders ALL content inside the `<div id="root">` element.

**WHY IT EXISTS:** Browsers need an HTML file to load. This is the only one — React takes over from here and creates all other "pages" by swapping components in and out (Single Page Application pattern).

**WHAT IT CONTAINS:**
- `<meta charset="UTF-8">` — character encoding
- `<meta name="viewport">` — responsive design viewport
- `<meta name="description">` — SEO description for search engines
- `<meta name="keywords">` — SEO keywords (EVM, election, VVPAT)
- `<title>Smart EVM – Electronic Voting System</title>` — browser tab title
- `<div id="root"></div>` — the single DOM element React mounts into
- `<script type="module" src="/src/main.tsx">` — loads the React application

**KEY CONCEPT:** This is NOT a traditional multi-page website. The browser loads this ONE HTML file, then React dynamically renders different "pages" by changing what's inside `<div id="root">`.

---

### FILE: `client/vite.config.ts`

**TYPE:** Build Tool Configuration

**PURPOSE:** Configures Vite — the build tool that bundles the React app, starts the dev server, and handles hot module replacement.

**WHY IT EXISTS:** Vite needs to know: which plugins to use (React), what path aliases exist (`@` → `./src`), and how to proxy API requests to the backend server.

**WHAT IT CONFIGURES:**

| Setting | Value | Why |
|---|---|---|
| `plugins: [react()]` | Enables React | Allows JSX/TSX syntax and React Fast Refresh |
| `resolve.alias: '@'` | `./src` | Shorter imports: `@/services/api.service` instead of `../../services/api.service` |
| `server.port` | `5173` | Dev server port |
| `proxy: '/api'` | `http://localhost:5000` | Forwards API calls to the Express backend |
| `proxy: '/uploads'` | `http://localhost:5000` | Forwards file/image requests to the backend |

**The proxy is CRITICAL:** Without it, the browser would block API requests due to CORS (different ports = different origins). The proxy makes the browser think all requests go to the same origin.

---

### FILE: `client/tailwind.config.js`

**TYPE:** Styling Configuration

**PURPOSE:** Customizes the Tailwind CSS framework with project-specific colors, fonts, and animations.

**WHY IT EXISTS:** The default Tailwind theme doesn't match the dark, professional voting system design. This file extends Tailwind with custom design tokens.

**WHAT IT CONFIGURES:**

| Customization | Values | Used For |
|---|---|---|
| **Primary colors** | Blue shades (#eff6ff → #1e3a8a) | Buttons, links, highlights |
| **Primary-600** | `#1a73e8` (Google Blue) | Main brand color |
| **Surface colors** | `#0f172a`, `#1e293b`, `#334155` | Dark backgrounds, cards, hover states |
| **Fonts** | Inter (sans), JetBrains Mono (mono) | Body text, code/IDs |
| **Animations** | fade-in, slide-up, pulse-slow, led-blink | Page transitions, loading, EVM LED indicators |
| **Dark mode** | `class` strategy | Dark mode via CSS class |

---

### FILE: `client/package.json`

**TYPE:** Project Configuration

**PURPOSE:** Lists all npm dependencies, defines scripts, and project metadata.

**Key dependencies explained:**

| Dependency | What It Does | Used Where |
|---|---|---|
| `react` (v18) | UI component library | Everywhere |
| `react-dom` (v18) | Connects React to browser DOM | `main.tsx` |
| `react-router-dom` (v6) | Client-side URL routing | `App.tsx`, layouts |
| `axios` (v1.7) | HTTP client for API calls | `lib/axios.ts` |
| `react-hook-form` (v7) | Form state management | All CRUD pages |
| `@hookform/resolvers` | Connects Zod schemas to react-hook-form | `LoginPage.tsx`, `ElectionsPage.tsx` |
| `zod` (v3.23) | Schema-based validation | Login form, election form |
| `framer-motion` (v11) | Declarative animations | Layouts, modals, voting machine |
| `recharts` (v2.12) | Chart library (bar, pie, etc.) | Dashboard, results page |
| `lucide-react` | Icon library (400+ icons) | Every page |
| `react-hot-toast` (v2.4) | Toast notification popups | All pages (success/error feedback) |
| `date-fns` (v3.6) | Date formatting utilities | Date displays |
| `tailwindcss` (v3.4) | Utility-first CSS framework | All styling |

---

## 6.2 — LIBRARY FILES

---

### FILE: `client/src/lib/axios.ts`

**TYPE:** Library / HTTP Client

**PURPOSE:** Creates a pre-configured Axios instance that ALL service files use to communicate with the server.

**WHY IT EXISTS:** Without this, every API call would need to manually: set the base URL, set the content type, attach the JWT token, and handle 401 errors. This file does it ONCE for everyone.

**WHO USES IT:** `api.service.ts`, `auth.service.ts`

**WHAT IT EXPORTS:** `api` — an Axios instance

**WHAT IT DOES:**

1. **Creates Axios instance** with:
   - `baseURL: '/api'` — all requests automatically start with `/api`
   - `timeout: 30000` — requests fail after 30 seconds
   - `Content-Type: application/json` — sends/expects JSON

2. **Request interceptor** (runs BEFORE every request):
   ```
   1. Reads 'access_token' from localStorage
   2. If token exists → adds header: Authorization: "Bearer eyJhbG..."
   3. Sends the request
   ```
   This means: after login, EVERY API call automatically includes the JWT token.

3. **Response interceptor** (runs AFTER every response):
   ```
   On SUCCESS → passes response through unchanged
   On 401 ERROR → removes token from localStorage
                → removes user from localStorage
                → redirects browser to '/' (login page)
   ```
   This means: if the token expires or is invalid, the user is automatically logged out.

**How it connects to the server's auth middleware:**
```
Client: axios interceptor attaches "Bearer eyJhbG..." header
  ↓
Server: auth.middleware.ts reads the Authorization header
  ↓
Server: calls verifyAccessToken(token) from utils/jwt.ts
  ↓
Server: if valid → continues to controller
Server: if invalid → sends 401 → client interceptor catches → redirects to login
```

---

## 6.3 — SERVICE FILES

---

### FILE: `client/src/services/auth.service.ts`

**TYPE:** Service

**PURPOSE:** Handles authentication — login, logout, and user state management using localStorage.

**WHY IT EXISTS:** Login logic involves multiple steps (API call, token storage, user storage). This service encapsulates all auth operations in one place so any component can check auth state.

**WHO USES IT:** `App.tsx` (RequireAuth guard), `AdminLayout.tsx`, `OfficerLayout.tsx`, `LoginPage.tsx`

**WHAT IT EXPORTS:**

| Export | Purpose | Used By |
|---|---|---|
| `LoginPayload` interface | Shape: `{ email: string; password: string }` | `LoginPage.tsx` |
| `authService.login(data)` | POST `/auth/login` → stores token + user in localStorage → returns user data | `LoginPage.tsx` |
| `authService.logout()` | POST `/auth/logout` → removes token + user from localStorage | Layouts (logout button) |
| `authService.getProfile()` | GET `/auth/profile` → returns current user profile from server | Not currently used in UI |
| `authService.getCurrentUser()` | Reads user from localStorage (synchronous, no API call) | Layouts, RequireAuth |
| `authService.isAuthenticated()` | Checks if `access_token` exists in localStorage → `true/false` | `RequireAuth` in App.tsx |
| `authService.hasRole(role)` | Checks if current user's role matches the given role → `true/false` | `RequireAuth` in App.tsx |

**Login flow:**
```
LoginPage calls authService.login({ email, password })
  ↓
authService sends POST /api/auth/login with { email, password }
  ↓
Server validates → returns { accessToken, user: { id, email, role, profile } }
  ↓
authService stores:
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('user', JSON.stringify(user))
  ↓
Returns the data to LoginPage
  ↓
LoginPage checks user.role matches selected role
  ↓
If COMMISSIONER → navigate('/admin')
If OFFICER → navigate('/officer')
```

**Why localStorage:**
- JWT tokens need to persist across page refreshes
- `localStorage` survives browser refresh (unlike in-memory state)
- The Axios interceptor reads from `localStorage` on every request

---

### FILE: `client/src/services/api.service.ts`

**TYPE:** Service

**PURPOSE:** Contains ALL API call functions for every entity in the system. This is the SINGLE place where the client communicates with the server.

**WHY IT EXISTS:** Without this, each page would directly call `axios.get('/elections')` with magic URL strings scattered everywhere. This centralizes ALL API URLs and HTTP methods in one file.

**WHO USES IT:** Every admin page, officer dashboard, voting machine page

**WHAT IT EXPORTS:**

#### `electionService` (10 functions)
| Function | HTTP Call | Server Endpoint |
|---|---|---|
| `getAll()` | GET | `/api/elections` |
| `getById(id)` | GET | `/api/elections/:id` |
| `getStats(id)` | GET | `/api/elections/:id/stats` |
| `getDashboardStats()` | GET | `/api/elections/stats/dashboard` |
| `getResults(id)` | GET | `/api/elections/:id/results` |
| `create(data)` | POST | `/api/elections` |
| `update(id, data)` | PUT | `/api/elections/:id` |
| `updateStatus(id, status)` | PATCH | `/api/elections/:id/status` |
| `publishResults(id)` | POST | `/api/elections/:id/publish-results` |
| `delete(id)` | DELETE | `/api/elections/:id` |

#### `constituencyService` (5 functions)
| Function | HTTP Call | Server Endpoint |
|---|---|---|
| `getAll(electionId?)` | GET | `/api/constituencies` |
| `getById(id)` | GET | `/api/constituencies/:id` |
| `create(data)` | POST | `/api/constituencies` |
| `update(id, data)` | PUT | `/api/constituencies/:id` |
| `delete(id)` | DELETE | `/api/constituencies/:id` |

#### `pollingStationService` (7 functions)
| Function | HTTP Call | Server Endpoint |
|---|---|---|
| `getAll(constituencyId?)` | GET | `/api/polling-stations` |
| `getById(id)` | GET | `/api/polling-stations/:id` |
| `getTurnout(id)` | GET | `/api/polling-stations/:id/turnout` |
| `create(data)` | POST | `/api/polling-stations` |
| `update(id, data)` | PUT | `/api/polling-stations/:id` |
| `updateMachineStatus(id, status)` | PATCH | `/api/polling-stations/:id/machine-status` |
| `delete(id)` | DELETE | `/api/polling-stations/:id` |

#### `partyService` (6 functions)
Includes `uploadSymbol(id, file)` — creates `FormData`, sends multipart/form-data POST to `/api/parties/:id/symbol`.

#### `candidateService` (6 functions)
Includes `uploadPhoto(id, file)` — creates `FormData`, sends multipart/form-data POST to `/api/candidates/:id/photo`.

#### `officerService` (4 functions) — CRUD for officers

#### `voterService` (5 functions) — CRUD + paginated listing (returns `{ data, meta }`)

#### `votingService` (5 functions)
| Function | HTTP Call | Server Endpoint | Purpose |
|---|---|---|---|
| `initiateVerification(data)` | POST | `/api/voting/verify/initiate` | Start voter verification |
| `verifyOTP(voterId, otp)` | POST | `/api/voting/verify/otp` | Verify OTP |
| `simulateBiometric(voterId, type)` | POST | `/api/voting/verify/biometric` | Simulate biometric |
| `castVote(data)` | POST | `/api/voting/cast` | **CAST THE ACTUAL VOTE** |
| `getVVPAT(referenceNumber)` | GET | `/api/voting/vvpat/:ref` | Lookup VVPAT receipt |

#### `auditService` (1 function)
`getAll(params)` — GET `/api/audit-logs` with pagination and filters.

#### `reportService` (4 functions)
These use `window.open()` instead of Axios — they open a new browser tab that downloads the PDF/Excel file directly:
| Function | Opens URL |
|---|---|
| `downloadElectionSummaryPDF(id)` | `/api/reports/election/:id/summary/pdf` |
| `downloadResultsExcel(id)` | `/api/reports/election/:id/results/excel` |
| `downloadVotersExcel(stationId)` | `/api/reports/station/:id/voters/excel` |
| `downloadAuditLogPDF()` | `/api/reports/audit-log/pdf` |

**How every service function works (pattern):**
```typescript
getAll: async () => (await api.get('/elections')).data.data
```
1. Calls `api.get('/elections')` — the Axios instance from `lib/axios.ts`
2. Axios interceptor attaches JWT token
3. Vite proxy forwards to `http://localhost:5000/api/elections`
4. Server processes and returns `{ success: true, message: "...", data: [...] }`
5. `.data` extracts the Axios response body
6. `.data` extracts the server's `data` field
7. Returns the actual election array

---

## 6.4 — CUSTOM HOOKS

---

### FILE: `client/src/hooks/useAsync.ts`

**TYPE:** Custom React Hooks

**PURPOSE:** Provides 4 reusable hooks that handle common patterns: data fetching, mutations, localStorage, and countdown timers.

**WHY IT EXISTS:** Every admin page needs to: fetch data on mount, show loading state, handle errors, and trigger create/update/delete operations. Without these hooks, every page would have 30+ lines of duplicated `useState`/`useEffect` boilerplate.

**WHO USES IT:** Every admin page, officer dashboard, voting machine

**WHAT IT EXPORTS:**

#### `useAsync<T>(asyncFn, immediate = true)`
**Purpose:** Fetches data on component mount and provides loading/error/data state.

**How it works:**
```
1. Creates state: data (null), loading (true), error (null)
2. If immediate = true → calls asyncFn() on mount
3. Sets loading = true before the call
4. On success → sets data = result, loading = false
5. On error → extracts error.response.data.message, sets error
6. Returns { data, loading, error, execute (to re-fetch), setData }
```

**Used in every admin page like this:**
```typescript
const fetchElections = useCallback(() => electionService.getAll(), []);
const { data: elections, loading, execute: refetch } = useAsync(fetchElections);
```

#### `useMutation<TInput, TOutput>(mutationFn, options?)`
**Purpose:** Handles create/update/delete operations with loading state and toast notifications.

**How it works:**
```
1. Creates state: loading (false)
2. Returns { mutate, loading }
3. When mutate(input) is called:
   a. Sets loading = true
   b. Calls mutationFn(input)
   c. On success → shows toast.success(successMessage) → calls onSuccess callback
   d. On error → extracts error message → shows toast.error(message)
   e. Sets loading = false
```

**Used in every CRUD page like this:**
```typescript
const { mutate: createElection, loading: creating } = useMutation(
  (data) => electionService.create(data),
  { onSuccess: () => { refetch(); setModalOpen(false); }, successMessage: 'Election created' },
);
```

#### `useLocalStorage<T>(key, initialValue)`
**Purpose:** Syncs React state with localStorage. Value persists across page refreshes.

#### `useCountdown(seconds, onComplete?)`
**Purpose:** Provides a countdown timer that decrements every second and calls `onComplete` when it reaches zero.

**Used in:**
- `OTPScreen` in VotingMachinePage — 5-minute OTP expiry countdown
- `VVPATScreen` in VotingMachinePage — 7-second VVPAT display timer

---

## 6.5 — REUSABLE UI COMPONENTS

---

### FILE: `client/src/components/ui/index.tsx`

**TYPE:** Component Library

**PURPOSE:** Provides 8 reusable UI components that are used across multiple pages, ensuring visual consistency.

**WHY IT EXISTS:** Without this, every page would implement its own modal, table skeleton, badge, etc. — leading to inconsistent UI and duplicated code.

**WHO USES IT:** Every admin page, officer dashboard

**WHAT IT EXPORTS:**

#### `Modal` — Popup dialog
- Uses Framer Motion for entrance/exit animations (fade + scale + slide)
- Supports sizes: `sm`, `md`, `lg`
- Closes on backdrop click or X button
- Uses `.card` CSS class from the design system

#### `ConfirmDialog` — Destructive action confirmation
- Built on top of `Modal`
- Three variants: `danger` (red), `warning` (amber), `info` (blue)
- Shows icon + title + message + Cancel/Confirm buttons
- Supports loading state on confirm button

#### `Skeleton` — Loading placeholder
- Animated pulse effect (`animate-pulse bg-slate-700/50`)
- Used while data is being fetched

#### `TableSkeleton` — Full table loading placeholder
- Renders a table with configurable rows/columns of `Skeleton` cells

#### `EmptyState` — "No data" placeholder
- Shows icon + title + description + optional action button
- Used when a table has zero rows

#### `StatusBadge` — Election/machine status indicator
- Maps status strings to colored badges:
  - `DRAFT` → gray, `ACTIVE` → green, `PAUSED` → yellow, `CLOSED` → red, `RESULTS_PUBLISHED` → purple

#### `StatCard` — Dashboard statistics card
- Animated entrance (fade + slide up via Framer Motion)
- Shows: title, value, icon with colored background, optional change indicator

#### `Spinner` — Loading indicator
- Animated SVG circle (spinning)
- Used inside buttons during API calls

#### `Pagination` — Page navigation
- Shows page numbers with previous/next buttons
- Highlights current page
- Hidden when totalPages ≤ 1

---

## 6.6 — LAYOUT FILES

---

### FILE: `client/src/layouts/AdminLayout.tsx`

**TYPE:** Layout Component

**PURPOSE:** Wraps ALL commissioner (admin) pages with a consistent sidebar navigation, top header bar, and page content area.

**WHY IT EXISTS:** Every admin page needs the same sidebar with 14 navigation links, the same header, and the same user profile section. Without a layout, this would be duplicated in every page component.

**WHO USES IT:** `App.tsx` wraps every `/admin/*` route with `<AdminLayout>`

**WHAT IT RENDERS:**

```
┌──────────────────────────────────────────────────────┐
│ SIDEBAR (w-60, hidden on mobile)                     │
│ ┌─── Logo ───────────────────────────────────────┐   │
│ │ [Smart EVM icon] Smart EVM                     │   │
│ │                   Election Commission           │   │
│ └────────────────────────────────────────────────┘   │
│ ┌─── Navigation ─────────────────────────────────┐   │
│ │ OVERVIEW                                       │   │
│ │   📊 Dashboard                                  │   │
│ │ ELECTION MANAGEMENT                            │   │
│ │   🗳️ Elections                                   │   │
│ │   📍 Constituencies                             │   │
│ │   🏛️ Polling Stations                           │   │
│ │ PEOPLE                                         │   │
│ │   🚩 Political Parties                          │   │
│ │   🏆 Candidates                                 │   │
│ │   👤 Election Officers                          │   │
│ │   👥 Voters                                     │   │
│ │ RESULTS & REPORTS                              │   │
│ │   📈 Election Results                           │   │
│ │   📄 Reports                                    │   │
│ │   🛡️ Digital VVPAT                              │   │
│ │   📋 Audit Logs                                 │   │
│ │ SYSTEM                                         │   │
│ │   🔔 Notifications                              │   │
│ │   ⚙️ Settings                                    │   │
│ └────────────────────────────────────────────────┘   │
│ ┌─── User ───────────────────────────────────────┐   │
│ │ [C] Commissioner Name       [logout]           │   │
│ │     commissioner@evm.gov.in                    │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ MAIN AREA                                            │
│ ┌─── Header (h-14) ─────────────────────────────┐   │
│ │ [hamburger menu]              🟢 System Online  │   │
│ └────────────────────────────────────────────────┘   │
│ ┌─── Content ────────────────────────────────────┐   │
│ │                                                │   │
│ │   {children} ← whatever page is active         │   │
│ │                                                │   │
│ └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

**Key features:**
- **Responsive:** Desktop sidebar is fixed, mobile sidebar slides in/out with Framer Motion animation
- **Active link highlighting:** Uses `NavLink` from React Router — active link gets `nav-item-active` CSS class
- **User info from localStorage:** Calls `authService.getCurrentUser()` to display name and email
- **Logout:** Calls `authService.logout()` → shows toast → navigates to `/`

---

### FILE: `client/src/layouts/OfficerLayout.tsx`

**TYPE:** Layout Component

**PURPOSE:** Same concept as AdminLayout but for Election Officers. Simpler sidebar with only 3 navigation items.

**WHO USES IT:** `App.tsx` wraps every `/officer/*` route with `<OfficerLayout>`

**Key differences from AdminLayout:**
- **Brand color:** Emerald green instead of blue (to distinguish Commissioner from Officer)
- **Sidebar title:** "Officer Portal" instead of "Election Commission"
- **Only 3 nav items:** Dashboard, Voters, Machine Control
- **No mobile hamburger menu** (simpler layout)
- **Header shows:** "Election Officer Dashboard" + "Station Active" indicator

---

## 6.7 — PAGE FILES

---

### FILE: `client/src/pages/auth/LoginPage.tsx`

**TYPE:** Page Component

**PURPOSE:** The login page — the first thing users see. Provides a role selector (Commissioner/Officer) and a login form with client-side validation.

**WHO USES IT:** `App.tsx` renders this at route `/`

**WHAT IT DOES:**

1. **Role Selector** — Two toggle buttons at the top:
   - `COMMISSIONER` — blue gradient, Shield icon, routes to `/admin`
   - `OFFICER` — emerald gradient, UserCog icon, routes to `/officer`
   - Switching roles clears the form

2. **Login Form** — Uses react-hook-form with Zod validation:
   - Email field: must be valid email format
   - Password field: minimum 6 characters
   - Show/hide password toggle (Eye/EyeOff icons)
   - Form errors shown below each field in red

3. **Login Process:**
   ```
   User fills form → clicks "Sign In Securely"
     ↓ setLoading(true)
   authService.login({ email, password })
     ↓ API call to POST /api/auth/login
   If success:
     ↓ Checks result.user.role matches selectedRole
     ↓ If mismatch → toast.error("Not a Commissioner/Officer") → logout
     ↓ If match → toast.success("Welcome back!") → navigate to /admin or /officer
   If error:
     ↓ Extracts error.response.data.message → toast.error(message)
   Finally: setLoading(false)
   ```

4. **Demo Credentials Button** — Auto-fills email and password for testing:
   - Commissioner: `commissioner@evm.gov.in` / `Admin@12345`
   - Officer: `officer1@evm.gov.in` / `Officer@12345`

5. **Voting Machine Link** — Link at the bottom to open `/voting-machine` in a new tab

**Visual Design:**
- Dark slate background with three blurred gradient circles (decorative)
- Animated logo with subtle rotation
- Role selector with gradient backgrounds
- Glassmorphism card for the login form

**Client-side validation (Zod schema):**
```typescript
const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
```
This validation runs BEFORE the API call — the server ALSO validates with its own Zod schema (double validation for security).

---

### FILE: `client/src/pages/admin/AdminDashboard.tsx`

**TYPE:** Page Component

**PURPOSE:** The main Commissioner dashboard — shows system-wide statistics, active election banner, pie chart, recent elections list, and quick action links.

**WHAT IT FETCHES:**
- `electionService.getDashboardStats()` → system statistics
- `electionService.getAll()` → list of all elections

**WHAT IT DISPLAYS:**

1. **8 Stat Cards** — Total Elections, Active Election, Polling Stations, Registered Voters, Candidates, Political Parties, Votes Cast, Turnout %

2. **Active Election Banner** — If an election has status `ACTIVE`, shows a highlighted green banner with the election name, type, and date

3. **Pie Chart** — Elections grouped by status (DRAFT, ACTIVE, CLOSED, etc.) using Recharts PieChart

4. **Recent Elections List** — Last 5 elections with name, type, date, and status badge

5. **Quick Actions** — 4 shortcut cards: New Election, Add Candidate, Register Voter, View Reports

**Recharts usage (DBMS visualization):**
```
elections data → group by status → count per status → PieChart
```
This demonstrates how database query results (election counts by status) are visualized in the frontend.

---

### FILE: `client/src/pages/admin/ElectionsPage.tsx`

**TYPE:** Page Component (CRUD)

**PURPOSE:** Full CRUD interface for elections — list, create, edit, delete, and manage election status lifecycle.

**WHAT IT FETCHES:** `electionService.getAll()` → list of all elections

**WHAT IT DISPLAYS:**
- Table with columns: #, Election Name, Type, Scheduled Date, Constituencies, Status, Actions
- Create button opens a modal form
- Edit button (only for DRAFT elections) opens pre-filled modal
- Status transition buttons: Schedule → Activate → Close
- Publish Results button (for CLOSED elections)
- Delete button with confirmation dialog

**Election Status Lifecycle (managed from this page):**
```
DRAFT → SCHEDULED → ACTIVE → CLOSED → RESULTS_PUBLISHED
  ↓         ↓          ↓
  (edit)   (activate)  (close)
```

**Form validation (Zod):**
```typescript
const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  electionType: z.string().min(1, 'Election type is required'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
});
```

**Pattern used by ALL CRUD pages:**
```
1. useAsync() → fetches list data on mount
2. useMutation() → wraps create/update/delete operations
3. useState() → controls modal open/close, edit target, delete target
4. useForm() → manages form state with Zod validation
5. Render: page header + table + modal + confirm dialog
```

---

### FILE: `client/src/pages/admin/CandidatesPage.tsx`

**TYPE:** Page Component (CRUD)

**PURPOSE:** Register and manage election candidates — list, create, edit, delete, and upload candidate photos.

**Unique features:**
- **Photo upload** — Opens a file input modal, sends multipart/form-data to server
- **Constituency filter** — Dropdown to filter candidates by constituency
- **Party color dots** — Shows party color next to party name in table
- **Vote count badge** — Shows number of votes received per candidate

---

### FILE: `client/src/pages/admin/PartiesPage.tsx`

**TYPE:** Page Component (CRUD)

**PURPOSE:** Manage political parties — list, create, edit, delete, and upload party election symbols.

**Unique features:**
- **Symbol upload** — Similar to candidate photo upload
- **Color picker** — HTML `<input type="color">` for party color
- **Party color indicator** — Circular color swatch in the table
- **Candidate count** — Shows how many candidates belong to each party

---

### FILE: `client/src/pages/admin/ConstituenciesPage.tsx`

**TYPE:** Page Component (CRUD)

**PURPOSE:** Manage election constituencies — create, edit, delete. Each constituency belongs to an election.

**Unique features:**
- **Election selector** — When creating, select which election this constituency belongs to
- **Count columns** — Shows polling stations, candidates, and voters per constituency

---

### FILE: `client/src/pages/admin/PollingStationsPage.tsx`

**TYPE:** Page Component (CRUD)

**PURPOSE:** Manage polling stations and their EVM machine status.

**Unique features:**
- **Machine status management** — Inline buttons to change machine status:
  - IDLE → ACTIVE (Play button)
  - ACTIVE → LOCKED (Lock button)
  - ACTIVE → PAUSED (Pause button)
  - LOCKED → ACTIVE (Unlock button)
- **StatusBadge** — Shows machine status with color-coded badge
- **Vote counts** — Shows total voters and votes cast per station

---

### FILE: `client/src/pages/admin/OfficersPage.tsx`

**TYPE:** Page Component (CRUD)

**PURPOSE:** Register and manage election officers — create login accounts, assign to polling stations.

**Unique features:**
- **Create includes login credentials** — Email and password fields (only shown when creating, not editing)
- **Station assignment** — Dropdown to assign officer to a polling station
- **Last login tracking** — Shows when the officer last logged in

---

### FILE: `client/src/pages/admin/VotersPage.tsx`

**TYPE:** Page Component (CRUD)

**PURPOSE:** Register voters and manage the voter roll. Supports pagination, search, and filtering.

**Unique features:**
- **Pagination** — 20 voters per page with `<Pagination>` component
- **Search** — By name or voter ID (debounced, Enter key to execute)
- **Filters** — By polling station and voted/not-voted status
- **Voted status badge** — Green "Voted" or gray "Pending"
- **Delete protection** — Cannot delete a voter who has already voted (button disabled)

**DBMS concept demonstrated:** This page uses server-side pagination via `skip`/`take` query parameters — the server returns `{ data: [...], meta: { total, page, limit, totalPages } }`.

---

### FILE: `client/src/pages/admin/ResultsPage.tsx`

**TYPE:** Page Component (Read-only)

**PURPOSE:** Display published election results with bar charts and winner declarations.

**WHAT IT DOES:**
1. Loads all elections, filters to only `isResultPublished = true`
2. User selects an election from dropdown
3. Fetches results via `electionService.getResults(id)`
4. For each constituency:
   - Shows constituency header with total votes
   - Displays winner banner (🏆 trophy icon + amber highlight)
   - Renders Recharts BarChart with candidate votes (colored by party)
   - Shows results table: Rank, Candidate, Party (with color dot), Votes, Vote %

**DBMS concept demonstrated:**
- **Aggregation (COUNT):** Vote counts per candidate
- **Sorting:** Candidates ordered by vote count (winner first)
- **Percentage calculation:** `(votes / totalVotes * 100).toFixed(2)%`

---

### FILE: `client/src/pages/admin/ReportsPage.tsx`

**TYPE:** Page Component (Downloads)

**PURPOSE:** Generate and download PDF/Excel reports from the server.

**4 Report Cards:**
| Report | Format | Requires | Server Endpoint |
|---|---|---|---|
| Election Summary | PDF | Selected election | `/api/reports/election/:id/summary/pdf` |
| Election Results | Excel | Selected election | `/api/reports/election/:id/results/excel` |
| Voters List | Excel | Selected station | `/api/reports/station/:id/voters/excel` |
| Audit Log | PDF | Nothing | `/api/reports/audit-log/pdf` |

**How downloads work:** The `reportService` uses `window.open(url, '_blank')` — this opens a new browser tab that triggers the server to generate and stream the file as a download.

---

### FILE: `client/src/pages/admin/AuditLogsPage.tsx`

**TYPE:** Page Component (Read-only)

**PURPOSE:** View the system audit log — every admin action recorded with timestamp, user, and IP address.

**Table columns:** Timestamp, Action (color-coded badge), Module, User (email), Description, IP Address

**Action badge colors:**
| Action | Color |
|---|---|
| LOGIN | Green |
| LOGOUT | Gray |
| CREATE | Blue |
| UPDATE | Yellow |
| DELETE | Red |
| VOTE_CAST | Purple |
| PUBLISH_RESULTS | Purple |

**Supports:** Pagination (50 per page) + action type filter dropdown

---

### FILE: `client/src/pages/officer/OfficerDashboard.tsx`

**TYPE:** Page Component

**PURPOSE:** The Election Officer's main page — shows polling station statistics, voter turnout progress bar, and machine control buttons.

**WHAT IT DISPLAYS:**

1. **4 Stat Cards** — Total Voters, Votes Cast, Remaining, Turnout %
2. **Voting Progress Bar** — Animated bar (Framer Motion) showing turnout percentage
3. **Machine Controls** — Contextual buttons based on current machine status:
   - IDLE → "Start Voting" button
   - ACTIVE → "Lock Machine" + "Pause Voting" buttons
   - LOCKED → "Unlock Machine" button
   - PAUSED → "Resume Voting" button
   - ACTIVE/PAUSED → "Close Polling" button
4. **Station Information** — Name, code, address of assigned station

**Error state:** If no polling station is assigned to the officer, shows "No Station Assigned — Contact the Commissioner" message.
