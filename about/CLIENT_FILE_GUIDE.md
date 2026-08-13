# CLIENT_FILE_GUIDE.md
## Smart EVM — Client-Side Study Guide
> Created for DBMS presentation study. Based entirely on actual code in this workspace.

---

# 1. Client Overview

The client is the **front-end** (browser-side) of the **Smart EVM** (Electronic Voting Machine) project. It is a simulation of the Election Commission of India's digital voting system.

**What the client does:**
- Displays the login screen for two types of users: **Election Commissioner** (admin) and **Election Officer**.
- After login, shows a role-specific dashboard and navigation.
- The **Commissioner** can manage elections, constituencies, polling stations, political parties, candidates, officers, voters, view results, reports, and audit logs.
- The **Election Officer** can monitor their assigned polling station's voter turnout and control the machine status (start, pause, lock, close).
- The **Voting Machine** page simulates a real EVM touchscreen where a voter verifies their identity (Aadhaar or Voter ID), enters a one-time password (OTP), chooses a candidate, and receives a VVPAT (paper audit trail) slip.
- All data shown on screen comes from the **server**, fetched through HTTP API calls. The client never touches the database directly.

---

# 2. Client Folder Structure

```
client/
├── index.html                  ← HTML shell (entry point for browser)
├── package.json                ← Dependencies and npm scripts
├── vite.config.ts              ← Vite build and proxy configuration
├── tailwind.config.js          ← Tailwind CSS configuration
├── tsconfig.json               ← TypeScript configuration
├── postcss.config.js           ← PostCSS configuration
├── public/                     ← Static assets (served as-is)
├── dist/                       ← Built/compiled output (generated, not edited)
├── node_modules/               ← Installed packages (not edited)
└── src/
    ├── main.tsx                ← React entry point (mounts <App>)
    ├── App.tsx                 ← All client-side routes defined here
    ├── index.css               ← Global styles, design tokens, component classes
    ├── App.css                 ← Additional app-level styles
    ├── assets/                 ← Images/SVGs used in source
    ├── lib/
    │   └── axios.ts            ← Configured Axios HTTP client (with JWT)
    ├── services/
    │   ├── api.service.ts      ← All API calls grouped by resource
    │   └── auth.service.ts     ← Login, logout, and session helpers
    ├── hooks/
    │   └── useAsync.ts         ← Custom React hooks (data fetching, mutations, etc.)
    ├── components/
    │   └── ui/
    │       └── index.tsx       ← Reusable UI components (Modal, ConfirmDialog, etc.)
    ├── layouts/
    │   ├── AdminLayout.tsx     ← Sidebar + header shell for Commissioner pages
    │   └── OfficerLayout.tsx   ← Sidebar + header shell for Officer pages
    └── pages/
        ├── auth/
        │   └── LoginPage.tsx         ← Login screen (public)
        ├── admin/
        │   ├── AdminDashboard.tsx    ← Commissioner home with stats and charts
        │   ├── ElectionsPage.tsx     ← Manage elections
        │   ├── ConstituenciesPage.tsx
        │   ├── PollingStationsPage.tsx
        │   ├── PartiesPage.tsx
        │   ├── CandidatesPage.tsx
        │   ├── OfficersPage.tsx
        │   ├── VotersPage.tsx
        │   ├── ResultsPage.tsx
        │   ├── ReportsPage.tsx
        │   └── AuditLogsPage.tsx
        ├── officer/
        │   └── OfficerDashboard.tsx  ← Officer home with machine controls
        └── voting/
            └── VotingMachinePage.tsx ← Touchscreen EVM simulation
```

---

# 3. Client Entry Point

**What happens when the browser opens the application:**

**Step 1 — Browser loads `index.html`**
- The browser fetches `client/index.html`.
- This file contains a single `<div id="root"></div>` which is empty.
- It also has a `<script type="module" src="/src/main.tsx">` tag.

**Step 2 — Vite loads `main.tsx`**
- `main.tsx` is the JavaScript entry point.
- It calls `ReactDOM.createRoot(document.getElementById('root')).render(<App />)`.
- This mounts the entire React application inside the `#root` div.
- It also imports `index.css` to apply global styles.

**Step 3 — `App.tsx` runs**
- `App.tsx` wraps everything in `<BrowserRouter>` (enables URL-based navigation).
- It sets up the `<Toaster>` for toast pop-up notifications.
- It defines all the `<Routes>` — which URL path loads which component.
- Based on the current URL, React renders the correct page.

**Step 4 — User sees the Login Page**
- The default route `/` renders `<LoginPage />`.
- All other protected routes check authentication before rendering.

---

# 4. Routing

All routes are defined in `src/App.tsx`.

## Route Guard: `RequireAuth`
Before rendering any protected page, `RequireAuth` checks:
1. Is the user logged in? (`authService.isAuthenticated()` — checks if `access_token` exists in `localStorage`)
2. Does the user have the correct role? (`authService.hasRole(role)`)
3. If either check fails, the user is redirected to `/` (login page).

## Route Table

| URL Path | Component Loaded | Who Can Access |
|---|---|---|
| `/` | `LoginPage` | Public (anyone) |
| `/voting-machine` | `VotingMachinePage` | Public (EVM screen) |
| `/vvpat` | `VvpatPage` (inline in App.tsx) | Public |
| `/admin` | `AdminDashboard` inside `AdminLayout` | COMMISSIONER only |
| `/admin/elections` | `ElectionsPage` inside `AdminLayout` | COMMISSIONER only |
| `/admin/constituencies` | `ConstituenciesPage` inside `AdminLayout` | COMMISSIONER only |
| `/admin/polling-stations` | `PollingStationsPage` inside `AdminLayout` | COMMISSIONER only |
| `/admin/parties` | `PartiesPage` inside `AdminLayout` | COMMISSIONER only |
| `/admin/candidates` | `CandidatesPage` inside `AdminLayout` | COMMISSIONER only |
| `/admin/officers` | `OfficersPage` inside `AdminLayout` | COMMISSIONER only |
| `/admin/voters` | `VotersPage` inside `AdminLayout` | COMMISSIONER only |
| `/admin/results` | `ResultsPage` inside `AdminLayout` | COMMISSIONER only |
| `/admin/reports` | `ReportsPage` inside `AdminLayout` | COMMISSIONER only |
| `/admin/audit-logs` | `AuditLogsPage` inside `AdminLayout` | COMMISSIONER only |
| `/admin/notifications` | Placeholder page inside `AdminLayout` | COMMISSIONER only |
| `/admin/settings` | Placeholder page inside `AdminLayout` | COMMISSIONER only |
| `/officer` | `OfficerDashboard` inside `OfficerLayout` | OFFICER only |
| `/officer/voters` | `VotersPage` inside `OfficerLayout` | OFFICER only |
| `/officer/machine` | Placeholder page inside `OfficerLayout` | OFFICER only |
| `*` (anything else) | Redirects to `/` | — |

---

# 5. Important Files

---

## `client/index.html`
- **Type:** HTML file
- **Purpose:** The single HTML shell for the entire application. Contains the `<div id="root">` where React injects all content. Sets the page title ("Smart EVM – Electronic Voting System") and meta tags for SEO.
- **Why needed:** Every browser-based app needs at least one HTML file. Vite uses this as the template.
- **Key lines:**
  - `<div id="root"></div>` — React mounts here.
  - `<script type="module" src="/src/main.tsx">` — loads the JS entry point.

---

## `client/src/main.tsx`
- **Type:** TypeScript React file
- **Purpose:** The JavaScript entry point. Tells React to mount the `<App>` component inside `#root`.
- **Why needed:** React needs a starting point to inject itself into the HTML page.
- **Important imports:** `React`, `ReactDOM`, `App`, `./index.css`
- **Key function:** `ReactDOM.createRoot(...).render(<App />)`

---

## `client/src/App.tsx`
- **Type:** TypeScript React file (main routing file)
- **Purpose:** Defines all application routes using React Router. Contains the `RequireAuth` guard component.
- **Why needed:** Without this file, the browser would not know which page to show for each URL.
- **Important imports:** `BrowserRouter`, `Routes`, `Route`, `Navigate` from `react-router-dom`; all page components; `authService`
- **Important exports:** Default export `App` function component
- **Components defined:**
  - `RequireAuth` — checks login and role before rendering protected pages
  - `VvpatPage` — inline placeholder VVPAT lookup page
  - `PlaceholderPage` — shows a "fully implemented" message for unfinished pages
  - `App` — the root component with all routes

---

## `client/vite.config.ts`
- **Type:** TypeScript configuration file
- **Purpose:** Configures the Vite development server and build tool.
- **Why needed:** Tells Vite: (1) which port to run on, (2) how to resolve `@` imports, (3) how to forward `/api` and `/uploads` requests to the backend.
- **Key settings:**
  - `port: 5173` — dev server runs on this port
  - `alias: '@' to './src'` — allows `import X from '@/components/...'`
  - `proxy '/api' to 'http://localhost:5000'` — forwards all `/api/*` requests to the backend server

---

## `client/src/lib/axios.ts`
- **Type:** TypeScript file (HTTP client configuration)
- **Purpose:** Creates a pre-configured Axios HTTP instance that all API service files use.
- **Why needed:** Centralises the base URL, JWT token attachment, and error handling in one place instead of repeating it everywhere.
- **Important imports:** `axios`, `toast` from `react-hot-toast`
- **Important exports:** `api` (the configured Axios instance)
- **Key logic:**
  - `baseURL: '/api'` — all requests go to `/api/...`
  - `timeout: 30000` — 30 second timeout
  - **Request interceptor:** Before every request, reads `access_token` from `localStorage` and adds it to the `Authorization: Bearer <token>` header.
  - **Response interceptor:** If the server returns `401 Unauthorized`, clears `access_token` and `user` from `localStorage` and redirects the user to `/` (forces re-login).

---

## `client/src/services/api.service.ts`
- **Type:** TypeScript file (API service layer)
- **Purpose:** Contains all API call functions, grouped by resource. Each function calls the server and returns the data.
- **Why needed:** Keeps API logic separated from UI components. Components call a service function; they do not write raw Axios calls themselves.
- **Important imports:** `api` from `../lib/axios`
- **Exported service objects:**

| Service Object | What it manages |
|---|---|
| `electionService` | Elections — get all, get by ID, get stats, create, update, delete, publish results |
| `constituencyService` | Constituencies — get all (with optional electionId filter), create, update, delete |
| `pollingStationService` | Polling stations — get all, get by ID, turnout, create, update, machine status, delete |
| `partyService` | Political parties — CRUD + upload symbol image (multipart) |
| `candidateService` | Candidates — CRUD + upload photo (multipart) |
| `officerService` | Officers — get all, create, update, delete |
| `voterService` | Voters — get all (with search params), get by ID, create, update, delete |
| `votingService` | Voting flow — initiate verification, verify OTP, simulate biometric, cast vote, get VVPAT |
| `auditService` | Audit logs — get all (with filters) |
| `reportService` | Reports — opens PDF/Excel download links in new browser tab |

---

## `client/src/services/auth.service.ts`
- **Type:** TypeScript file (authentication service)
- **Purpose:** Manages login, logout, and session state on the client side.
- **Why needed:** Centralises all authentication logic so any component can check the user's login status.
- **Important imports:** `api` from `../lib/axios`
- **Exported object:** `authService`

| Function | What it does |
|---|---|
| `login(data)` | POST /api/auth/login. On success, saves `access_token` and `user` to `localStorage`. |
| `logout()` | POST /api/auth/logout. Removes token and user from `localStorage`. |
| `getProfile()` | GET /api/auth/profile. Returns user profile from server. |
| `getCurrentUser()` | Reads `user` from `localStorage` and parses it. No network call. |
| `isAuthenticated()` | Returns `true` if `access_token` exists in `localStorage`. No network call. |
| `hasRole(role)` | Checks if the stored user object's `role` matches the required role. No network call. |

---

## `client/src/hooks/useAsync.ts`
- **Type:** TypeScript file (custom React hooks)
- **Purpose:** Provides reusable hooks that handle loading states, error handling, and async operations.
- **Why needed:** Without these hooks, every component would have to duplicate loading/error state management code.
- **Important imports:** `useState`, `useCallback`, `useEffect` from React; `toast` from `react-hot-toast`

### `useAsync<T>(asyncFn, immediate)`
- **What it does:** Runs an async function and tracks its `data`, `loading`, and `error` state.
- **Input:** An async function that returns data, and a boolean `immediate` (run automatically on mount).
- **Output:** `{ data, loading, error, execute, setData }`
- **Used in:** `AdminDashboard`, `OfficerDashboard`, and most page components to fetch list data.

### `useMutation<TInput, TOutput>(mutationFn, options)`
- **What it does:** Runs a write operation (create/update/delete), shows a success or error toast, and tracks loading.
- **Input:** An async function, plus optional `onSuccess`, `onError`, and `successMessage` callbacks.
- **Output:** `{ mutate, loading }`
- **Used in:** Most admin pages for form submissions.

### `useLocalStorage<T>(key, initialValue)`
- **What it does:** Works like `useState` but syncs the value to `localStorage`.
- **Output:** `[value, setStoredValue]`

### `useCountdown(seconds, onComplete)`
- **What it does:** Counts down from a given number of seconds. Used for the OTP expiry timer.
- **Input:** Total seconds, optional callback when timer reaches zero.
- **Output:** `{ remaining, running, start }`
- **Used in:** `OTPScreen` inside `VotingMachinePage`.

---

## `client/src/components/ui/index.tsx`
- **Type:** TypeScript React file (reusable component library)
- **Purpose:** A collection of shared UI components used across all pages.
- **Why needed:** Avoids repeating the same modal, badge, or spinner code in every page.
- **Important imports:** React, `framer-motion`, `lucide-react` icons

### Components defined:

| Component | Props | What it renders |
|---|---|---|
| `Modal` | `open, onClose, title, children, size?` | Animated overlay modal with a title and close button. Closes when backdrop is clicked. |
| `ConfirmDialog` | `open, onClose, onConfirm, title, message, confirmText?, variant?, loading?` | A confirmation popup with Cancel and Confirm buttons. Used before deleting records. |
| `Skeleton` | `className?` | Pulsing grey placeholder shown while data is loading. |
| `TableSkeleton` | `rows?, cols?` | A full table-shaped skeleton loader. |
| `EmptyState` | `icon, title, description, action?` | Shown when a list is empty (e.g., no elections found). |
| `StatusBadge` | `status` | Coloured pill badge for statuses like ACTIVE, DRAFT, CLOSED, etc. |
| `StatCard` | `title, value, icon, iconBg, change?, changeDir?` | A dashboard statistic card with an icon, number, and optional trend. |
| `Spinner` | `size?, className?` | Animated SVG spinning circle (loading indicator). |
| `Pagination` | `page, totalPages, onPageChange` | Previous/Next and numbered page buttons. |

---

## `client/src/layouts/AdminLayout.tsx`
- **Type:** TypeScript React file (layout wrapper)
- **Purpose:** Provides the sidebar navigation and top header for all Commissioner (admin) pages.
- **Why needed:** Every admin page shares the same sidebar. The layout is defined once here and wraps each page.
- **Important imports:** `NavLink`, `useNavigate` from `react-router-dom`; `framer-motion`; `authService`; `lucide-react` icons

**State:**
- `sidebarOpen: boolean` — controls whether the mobile sidebar overlay is visible

**Functions:**
- `handleLogout()` — calls `authService.logout()`, shows a success toast, then navigates to `/`.

**Navigation Groups defined** (hardcoded array `navGroups`):
- Overview: Dashboard
- Election Management: Elections, Constituencies, Polling Stations
- People: Political Parties, Candidates, Election Officers, Voters
- Results and Reports: Election Results, Reports, Digital VVPAT, Audit Logs
- System: Notifications, Settings

**Buttons:**
- **Hamburger menu (mobile):** Sets `sidebarOpen = true`
- **Backdrop click:** Sets `sidebarOpen = false`
- **Logout button** (LogOut icon): Calls `handleLogout()`
- **NavLink items:** Navigate to the linked admin route

**Props:** `children: React.ReactNode` — the page content to display in the main area

---

## `client/src/layouts/OfficerLayout.tsx`
- **Type:** TypeScript React file (layout wrapper)
- **Purpose:** Provides the sidebar and header for Election Officer pages.
- **Similar to AdminLayout but simpler** — no mobile hamburger, only 3 nav items: Dashboard, Voters, Machine Control.
- **Buttons:**
  - **Logout button:** Calls `handleLogout()` → `authService.logout()` → navigate to `/`

---

# 6. Components

The reusable components live in `src/components/ui/index.tsx`. See Section 5 above for full details on each one.

**Summary of most-used components:**
- `Modal` — used for "Add" and "Edit" forms across all admin pages
- `ConfirmDialog` — used before every delete action
- `StatusBadge` — used in election and station tables
- `StatCard` — used on AdminDashboard and OfficerDashboard
- `Spinner` — shown on buttons while an API call is in progress
- `TableSkeleton` — shown while table data is loading
- `EmptyState` — shown when a list has no records

---

# 7. Pages

---

## `LoginPage.tsx` — route `/`

**Purpose:** The first screen the user sees. Lets the user pick a role and log in.

**State:**
- `selectedRole: 'COMMISSIONER' | 'OFFICER'` — which login tab is active
- `showPassword: boolean` — toggles password field visibility
- `loading: boolean` — true while the login API call is in progress

**Form:** Uses `react-hook-form` with `zod` validation.
- Fields: `email` (must be valid email), `password` (minimum 6 characters)

**Functions:**
- `onSubmit(data)` — the form submit handler.

**Full login flow:**
```
USER types email and password, clicks "Sign In Securely"
    ↓
handleSubmit(onSubmit) — react-hook-form validates the fields
    ↓
onSubmit() is called with { email, password }
    ↓
setLoading(true)
    ↓
authService.login(data) → POST /api/auth/login
    ↓
SERVER validates credentials in database, returns { accessToken, user }
    ↓
authService stores token in localStorage('access_token') and user in localStorage('user')
    ↓
Checks: result.user.role === selectedRole?
  If not → toast.error, authService.logout()
  If yes → toast.success("Welcome back!") + navigate('/admin' or '/officer')
    ↓
UI redirects to the appropriate dashboard
```

**Buttons:**
- **Role selector tabs** (Commissioner / Officer): `setSelectedRole(role)` and clears form fields.
- **Eye icon on password field:** `setShowPassword(!showPassword)`
- **"Sign In Securely" (submit button):** Validates form then calls `onSubmit()`.
- **"Fill: [email]" (demo credentials):** Auto-fills the email and password fields using `setValue()`.
- **"Open Touchscreen Voting Machine":** Opens `/voting-machine` in a new browser tab.

---

## `AdminDashboard.tsx` — route `/admin`

**Purpose:** Home screen for the Election Commissioner. Shows statistics and charts.

**API calls on mount:**
- `electionService.getDashboardStats()` → `GET /api/elections/stats/dashboard`
  - Returns: total elections, active election, total stations, total voters, total candidates, total parties, total votes, turnout percentage.
- `electionService.getAll()` → `GET /api/elections`
  - Returns: list of all elections (used for the "Recent Elections" list and the pie chart).

**Data flow:**
```
Component mounts
    ↓
useAsync runs fetchStats() immediately
    ↓
GET /api/elections/stats/dashboard
    ↓
SERVER queries database for aggregated stats
    ↓
data (stats) is set in state
    ↓
UI renders 8 StatCards, a PieChart, a recent elections list, and quick action links
```

**Sections rendered:**
- 8 `StatCard` tiles (Total Elections, Active Election, Polling Stations, Registered Voters, Candidates, Political Parties, Votes Cast, Turnout %)
- Active Election banner (conditional — only if there is an active election)
- PieChart of elections grouped by status (uses `recharts`)
- Recent Elections list (last 5 elections)
- Quick Action links: New Election, Add Candidate, Register Voter, View Reports

---

## `OfficerDashboard.tsx` — route `/officer`

**Purpose:** The Election Officer's dashboard for their assigned polling station.

**State:**
- `actionLoading: boolean` — true while a machine status change is in progress

**Data fetched on mount:**
- `pollingStationService.getById(stationId)` → `GET /api/polling-stations/:id`
- `pollingStationService.getTurnout(stationId)` → `GET /api/polling-stations/:id/turnout`

The `stationId` comes from `authService.getCurrentUser().profile.pollingStationId` (stored in localStorage after login).

**Function: `updateStatus(status, isPollingActive)`**
- Calls `pollingStationService.updateMachineStatus(stationId, status, isPollingActive)`
- Sends: `PATCH /api/polling-stations/:id/machine-status`
- On success: shows toast, then refetches station and turnout data.

**Machine Control Buttons** (shown conditionally based on current `machineStatus`):

| Button | Visible when | Action sent to server |
|---|---|---|
| Start Voting | machineStatus = IDLE | status: 'ACTIVE', isPollingActive: true |
| Lock Machine | machineStatus = ACTIVE | status: 'LOCKED', isPollingActive: false |
| Pause Voting | machineStatus = ACTIVE | status: 'PAUSED', isPollingActive: false |
| Unlock Machine | machineStatus = LOCKED | status: 'ACTIVE', isPollingActive: true |
| Resume Voting | machineStatus = PAUSED | status: 'ACTIVE', isPollingActive: true |
| Close Polling | ACTIVE or PAUSED | status: 'CLOSED', isPollingActive: false |

**Sections rendered:**
- 4 StatCards: Total Voters, Votes Cast, Remaining, Turnout %
- Animated progress bar showing voting progress
- Machine Controls panel
- Station Information (name, code, address)

---

## `VotingMachinePage.tsx` — route `/voting-machine`

The largest file (603 lines). Complete flow is documented in Section 13.

---

# 8. State Management

This project does **not** use Redux, Zustand, or React Context for global state.

State is managed at two levels:

### Component-Level State (`useState`)
Each component manages its own local state. Examples:
- `LoginPage`: `selectedRole`, `showPassword`, `loading`
- `AdminLayout`: `sidebarOpen`
- `OfficerDashboard`: `actionLoading`
- `VotingMachinePage`: `screen`, `voter`, `candidates`, `selectedCandidate`, `vvpatData`, `castingVote`

### Server State (via `useAsync` / `useMutation` hooks)
Data fetched from the server is held in `useAsync`'s `data` state variable inside each component. There is no global data store.

### Persistent State (`localStorage`)
After login, the server's response is saved to `localStorage`:
- Key `access_token` — the JWT token, attached to every API request
- Key `user` — the user's profile object (role, name, email, assigned station ID)

These are read by:
- `authService.isAuthenticated()` — checks if `access_token` exists
- `authService.hasRole(role)` — reads `user.role`
- `authService.getCurrentUser()` — returns the full user object
- `OfficerDashboard` — reads `user.profile.pollingStationId`
- `AdminLayout` / `OfficerLayout` — reads `user.profile.fullName` and `user.email` to display in the sidebar

### `useEffect`
Used in `useAsync` to auto-run the fetch function when the component mounts (`immediate = true`). Also used in `OTPScreen` to start the countdown timer when that screen appears.

---

# 9. API Communication

All API calls flow through this chain:

```
React Component
  calls a service function (api.service.ts or auth.service.ts)
    uses the Axios instance (lib/axios.ts)
      HTTP request to /api/...
        Vite proxy forwards to http://localhost:5000
          Backend server handles the request
            Server talks to the database
              Server sends response back
        Axios interceptor processes the response
      Service function returns data
    Component state is updated
  React re-renders the UI
```

## Full List of API Endpoints Used by the Client

| Service | Function | HTTP Method | Endpoint |
|---|---|---|---|
| `authService` | `login` | POST | `/api/auth/login` |
| `authService` | `logout` | POST | `/api/auth/logout` |
| `authService` | `getProfile` | GET | `/api/auth/profile` |
| `electionService` | `getAll` | GET | `/api/elections` |
| `electionService` | `getById` | GET | `/api/elections/:id` |
| `electionService` | `getStats` | GET | `/api/elections/:id/stats` |
| `electionService` | `getDashboardStats` | GET | `/api/elections/stats/dashboard` |
| `electionService` | `getResults` | GET | `/api/elections/:id/results` |
| `electionService` | `create` | POST | `/api/elections` |
| `electionService` | `update` | PUT | `/api/elections/:id` |
| `electionService` | `updateStatus` | PATCH | `/api/elections/:id/status` |
| `electionService` | `publishResults` | POST | `/api/elections/:id/publish-results` |
| `electionService` | `delete` | DELETE | `/api/elections/:id` |
| `constituencyService` | `getAll` | GET | `/api/constituencies` |
| `constituencyService` | `create` | POST | `/api/constituencies` |
| `constituencyService` | `update` | PUT | `/api/constituencies/:id` |
| `constituencyService` | `delete` | DELETE | `/api/constituencies/:id` |
| `pollingStationService` | `getAll` | GET | `/api/polling-stations` |
| `pollingStationService` | `getById` | GET | `/api/polling-stations/:id` |
| `pollingStationService` | `getTurnout` | GET | `/api/polling-stations/:id/turnout` |
| `pollingStationService` | `create` | POST | `/api/polling-stations` |
| `pollingStationService` | `update` | PUT | `/api/polling-stations/:id` |
| `pollingStationService` | `updateMachineStatus` | PATCH | `/api/polling-stations/:id/machine-status` |
| `pollingStationService` | `delete` | DELETE | `/api/polling-stations/:id` |
| `partyService` | `getAll` | GET | `/api/parties` |
| `partyService` | `create` | POST | `/api/parties` |
| `partyService` | `update` | PUT | `/api/parties/:id` |
| `partyService` | `uploadSymbol` | POST | `/api/parties/:id/symbol` (multipart) |
| `partyService` | `delete` | DELETE | `/api/parties/:id` |
| `candidateService` | `getAll` | GET | `/api/candidates` |
| `candidateService` | `create` | POST | `/api/candidates` |
| `candidateService` | `update` | PUT | `/api/candidates/:id` |
| `candidateService` | `uploadPhoto` | POST | `/api/candidates/:id/photo` (multipart) |
| `candidateService` | `delete` | DELETE | `/api/candidates/:id` |
| `officerService` | `getAll` | GET | `/api/officers` |
| `officerService` | `create` | POST | `/api/officers` |
| `officerService` | `update` | PUT | `/api/officers/:id` |
| `officerService` | `delete` | DELETE | `/api/officers/:id` |
| `voterService` | `getAll` | GET | `/api/voters` |
| `voterService` | `getById` | GET | `/api/voters/:id` |
| `voterService` | `create` | POST | `/api/voters` |
| `voterService` | `update` | PUT | `/api/voters/:id` |
| `voterService` | `delete` | DELETE | `/api/voters/:id` |
| `votingService` | `initiateVerification` | POST | `/api/voting/verify/initiate` |
| `votingService` | `verifyOTP` | POST | `/api/voting/verify/otp` |
| `votingService` | `simulateBiometric` | POST | `/api/voting/verify/biometric` |
| `votingService` | `castVote` | POST | `/api/voting/cast` |
| `votingService` | `getVVPAT` | GET | `/api/voting/vvpat/:referenceNumber` |
| `auditService` | `getAll` | GET | `/api/audit-logs` |
| `reportService` | `downloadElectionSummaryPDF` | GET (new tab) | `/api/reports/election/:id/summary/pdf` |
| `reportService` | `downloadResultsExcel` | GET (new tab) | `/api/reports/election/:id/results/excel` |
| `reportService` | `downloadVotersExcel` | GET (new tab) | `/api/reports/station/:id/voters/excel` |
| `reportService` | `downloadAuditLogPDF` | GET (new tab) | `/api/reports/audit-log/pdf` |

---

# 10. Forms

## Login Form (`LoginPage.tsx`)
- **Library:** `react-hook-form` with `zodResolver`
- **Schema:** Email (valid format), Password (min 6 characters)
- **On submit:** Calls `authService.login()` — POST /api/auth/login
- **On success:** Saves JWT to localStorage, redirects to dashboard
- **On error:** Shows `toast.error` with the server's error message

## Admin CRUD Forms (Elections, Voters, Candidates, etc.)
- Each admin page has its own "Add" and "Edit" forms displayed inside a `Modal`.
- Forms are built with plain HTML `<input>`, `<select>`, `<textarea>` elements styled with `.input` and `.label` CSS classes.
- On submit, the form data is passed to the relevant `api.service.ts` function (e.g., `electionService.create(formData)`).
- `useMutation` hook handles loading state and success/error toasts automatically.

## Verify Form (`VotingMachinePage` — `VerifyScreen`)
- A single input for Aadhaar number (12 digits) or Voter ID.
- On submit: calls `votingService.initiateVerification()` — POST /api/voting/verify/initiate
- On success: moves to OTP screen

## OTP Form (`VotingMachinePage` — `OTPScreen`)
- A single 6-digit numeric input.
- On submit: calls `votingService.verifyOTP()` — POST /api/voting/verify/otp
- On success: moves to candidate selection screen

---

# 11. Buttons

## Login Page Buttons

| Button | What happens |
|---|---|
| Commissioner tab | `setSelectedRole('COMMISSIONER')`, clears form |
| Officer tab | `setSelectedRole('OFFICER')`, clears form |
| Eye icon | Toggles `showPassword` state to show/hide password text |
| "Fill: [email]" | Calls `setValue('email', ...)` and `setValue('password', ...)` to auto-fill credentials |
| "Sign In Securely" | Validates form → calls `onSubmit()` → POST /api/auth/login → redirects |
| "Open Touchscreen Voting Machine" | Opens `/voting-machine` in a new browser tab |

## Admin Layout Buttons

| Button | What happens |
|---|---|
| Hamburger (mobile) | `setSidebarOpen(true)` — opens sidebar overlay |
| Backdrop click | `setSidebarOpen(false)` — closes sidebar |
| Logout icon | `authService.logout()` → clears localStorage → `navigate('/')` |
| Nav link items | React Router navigates to the linked route |

## Officer Dashboard Buttons

| Button | Visible when | API call |
|---|---|---|
| Start Voting | IDLE | PATCH /api/polling-stations/:id/machine-status → ACTIVE |
| Lock Machine | ACTIVE | PATCH /api/polling-stations/:id/machine-status → LOCKED |
| Pause Voting | ACTIVE | PATCH /api/polling-stations/:id/machine-status → PAUSED |
| Unlock Machine | LOCKED | PATCH /api/polling-stations/:id/machine-status → ACTIVE |
| Resume Voting | PAUSED | PATCH /api/polling-stations/:id/machine-status → ACTIVE |
| Close Polling | ACTIVE or PAUSED | PATCH /api/polling-stations/:id/machine-status → CLOSED |

## Voting Machine Buttons

| Button | Screen | What happens |
|---|---|---|
| BEGIN VOTING | welcome | `setScreen('method')` |
| Aadhaar | method | `setMethod('AADHAAR')`, `setScreen('verify')` |
| Voter ID | method | `setMethod('VOTER_ID')`, `setScreen('verify')` |
| "Verify & Send OTP" | verify | POST /api/voting/verify/initiate — then `setScreen('otp')` |
| "Confirm OTP" | otp | POST /api/voting/verify/otp — then loads candidates — `setScreen('candidates')` |
| Candidate card | candidates | `setSelectedCandidate(candidate)`, `setScreen('confirm')` |
| "Cast My Vote" | confirm | POST /api/voting/cast — then `setScreen('vvpat')` |
| "Back" | verify, otp, confirm | Returns to previous screen |
| Reset (footer) | any except welcome/vvpat | `reset()` — clears all state — `setScreen('welcome')` |

---

# 12. Authentication

## Client-Side Responsibilities

The client handles three authentication concerns: **login**, **session storage**, and **access control**.

### Login Flow (client side)
1. User fills in email and password on `LoginPage.tsx`.
2. `react-hook-form` validates: email format and password length (minimum 6 characters).
3. If valid, `authService.login({ email, password })` is called.
4. The Axios instance (`lib/axios.ts`) sends `POST /api/auth/login` with `{ email, password }` in the request body.
5. The server (not the client) checks the credentials against the database and returns `{ accessToken, user }`.
6. The client stores `accessToken` in `localStorage` under key `access_token`.
7. The client stores the `user` object in `localStorage` under key `user`.
8. The client checks `result.user.role === selectedRole`. If they do not match, it calls `authService.logout()` and shows an error.
9. If they match, it navigates to the dashboard.

### Per-Request Token Attachment (client side)
On every subsequent API request, the Axios request interceptor (in `lib/axios.ts`) reads `access_token` from `localStorage` and adds the header `Authorization: Bearer <token>`. The server uses this token to verify the user's identity and permissions.

### Session Expiry Handling (client side)
If the server returns `401 Unauthorized` (token expired or invalid), the Axios response interceptor:
1. Removes `access_token` from `localStorage`
2. Removes `user` from `localStorage`
3. Redirects the browser to `/` (login page)

### Route Guard (`RequireAuth` in `App.tsx`)
Before rendering any protected page:
- `authService.isAuthenticated()` — checks if `access_token` exists in `localStorage`
- `authService.hasRole(role)` — checks if `user.role` matches the required role
- If either fails — `<Navigate to="/" replace />` (redirect to login)

### Logout
The logout button calls `authService.logout()`:
1. Sends `POST /api/auth/logout` to the server.
2. Removes `access_token` and `user` from `localStorage`.
3. Navigates to `/`.

### Server-Side Responsibilities (NOT handled by client)
- Validating the email and password against the database
- Generating the JWT access token
- Verifying the token on protected API routes
- Role-based access control on each API endpoint

---

# 13. Voting Machine Client

The `VotingMachinePage.tsx` simulates a physical EVM touchscreen. Accessible publicly at `/voting-machine`.

## Screens (controlled by `screen` state)
```
'welcome'  →  'method'  →  'verify'  →  'otp'  →  'candidates'  →  'confirm'  →  'vvpat'
                                                                                      ↓
                                                                    (countdown resets to 'welcome')
```

## State Variables in `VotingMachinePage`

| Variable | Type | Purpose |
|---|---|---|
| `screen` | string union type `Screen` | Which screen is currently shown |
| `method` | `'AADHAAR' or 'VOTER_ID'` | Which verification method the voter chose |
| `initData` | `{ voterId, voterName, simulatedOtp }` | Data returned from the initiate verification API |
| `voter` | `VerifiedVoter` | The fully verified voter object |
| `candidates` | `Candidate[]` | List of candidates for this voter's constituency |
| `selectedCandidate` | `Candidate` | The candidate the voter tapped on |
| `vvpatData` | `VvpatRecord` | The VVPAT record returned after a vote is cast |
| `castingVote` | `boolean` | True while the cast vote API call is in progress |

## Sub-Components

| Component | Screen | Purpose |
|---|---|---|
| `EVMHeader` | All screens | Fixed top bar showing system name, LED indicators, and current time |
| `WelcomeScreen` | welcome | Animated logo and BEGIN VOTING button |
| `MethodScreen` | method | Two buttons: Aadhaar or Voter ID |
| `VerifyScreen` | verify | Input field for Aadhaar or Voter ID + Verify and Send OTP button |
| `OTPScreen` | otp | Shows simulated OTP + input + countdown timer |
| `CandidateScreen` | candidates | Scrollable list of candidates with serial number, photo, name, party |
| `ConfirmScreen` | confirm | Shows selected candidate's details + "Cast My Vote" button |
| `VVPATScreen` | vvpat | Shows "VOTE RECORDED!" + VVPAT paper slip with candidate, party, reference number, hash |

## Complete Voting Flow with API Calls

```
Screen: WELCOME
  User taps "BEGIN VOTING"
  → setScreen('method')

Screen: METHOD
  User taps "Aadhaar" or "Voter ID"
  → setMethod(...), setScreen('verify')

Screen: VERIFY
  User types Aadhaar number or Voter ID
  User taps "Verify & Send OTP"
  →
  votingService.initiateVerification({ method, aadhaarNumber or voterId, pollingStationId })
  POST /api/voting/verify/initiate
  ← SERVER checks voter in database, generates simulated OTP
  ← returns { voterId, voterName, simulatedOtp }
  → setInitData(result), setScreen('otp')

Screen: OTP
  useCountdown(300) starts — 5-minute timer
  Simulated OTP is shown on screen for the demo
  User types 6-digit OTP
  User taps "Confirm OTP"
  →
  votingService.verifyOTP(voterId, otp)
  POST /api/voting/verify/otp
  ← SERVER verifies OTP, returns verified voter object
  →
  handleVoterVerified(verifiedVoter):
    setVoter(verifiedVoter)
    candidateService.getAll(verifiedVoter.constituencyId)
    GET /api/candidates?constituencyId=X
    ← SERVER returns candidates for this voter's constituency
    setCandidates(data)
    setScreen('candidates')

Screen: CANDIDATES
  Candidates shown sorted by serialNumber
  Each shows: serial number, photo, full name, party name, party symbol
  User taps a candidate card
  → setSelectedCandidate(candidate), setScreen('confirm')

Screen: CONFIRM
  Shows selected candidate details
  User taps "Cast My Vote"
  →
  handleCastVote():
    setCastingVote(true)
    votingService.castVote({ voterId, candidateId, pollingStationId })
    POST /api/voting/cast
    ← SERVER records vote in database, generates VVPAT with SHA-256 hash
    setVvpatData(result.vvpat)
    setScreen('vvpat')

Screen: VVPAT
  Shows "VOTE RECORDED!" message
  Shows VVPAT slip: election name, candidate name, party name, party symbol,
    reference number, SHA-256 hash, timestamp
  useCountdown(15) starts — visible for 15 seconds
  After countdown → reset() → all state cleared → setScreen('welcome')
```

---

# 14. Admin Client

The admin section is accessible only to users with role `COMMISSIONER`, protected by `RequireAuth`.
All admin pages are wrapped in `AdminLayout` which provides the sidebar and header.

## Pages

### `AdminDashboard.tsx`
Shows aggregate statistics fetched from `GET /api/elections/stats/dashboard` and `GET /api/elections`. Renders StatCards, a pie chart (elections by status using `recharts`), a recent elections list, and quick-action links.

### `ElectionsPage.tsx`
- Lists all elections from `GET /api/elections`.
- "Add Election" button opens a `Modal` with a form to create an election — `POST /api/elections`.
- Each row has "Edit" (opens edit modal — `PUT /api/elections/:id`), "Change Status" (`PATCH /api/elections/:id/status`), and "Delete" (`DELETE /api/elections/:id`) actions.
- "Publish Results" button calls `POST /api/elections/:id/publish-results`.

### `ConstituenciesPage.tsx`
- Lists all constituencies from `GET /api/constituencies`.
- CRUD operations: create (POST), update (PUT), delete (DELETE).

### `PollingStationsPage.tsx`
- Lists polling stations (filterable by constituency).
- CRUD plus machine status update.

### `PartiesPage.tsx`
- Lists political parties from `GET /api/parties`.
- CRUD plus party symbol image upload — `POST /api/parties/:id/symbol` with `multipart/form-data`.

### `CandidatesPage.tsx`
- Lists candidates (filterable by constituency).
- CRUD plus candidate photo upload — `POST /api/candidates/:id/photo`.

### `OfficersPage.tsx`
- Lists election officers from `GET /api/officers`.
- Create, update, delete officers.

### `VotersPage.tsx`
- Lists voters with `GET /api/voters` and optional search/filter params.
- Includes `Pagination` component.
- CRUD for voter records.

### `ResultsPage.tsx`
- Shows election results for a selected election.
- Fetches from `GET /api/elections/:id/results`.
- Displays candidate results with vote counts and percentages.

### `ReportsPage.tsx`
- Download buttons for PDF and Excel reports.
- Calls `reportService` functions which use `window.open(url, '_blank')` to trigger file downloads.

### `AuditLogsPage.tsx`
- Shows audit log records from `GET /api/audit-logs`.
- Includes filtering options.

---

# 15. Election Officer Client

The officer section is accessible only to users with role `OFFICER`, protected by `RequireAuth`.
All officer pages are wrapped in `OfficerLayout`.

## Pages

### `OfficerDashboard.tsx`
- The officer's main screen. Shows their assigned polling station's live data.
- The station ID comes from `authService.getCurrentUser().profile.pollingStationId` stored in localStorage.
- If no station is assigned, shows an error message: "No Station Assigned".
- Fetches station info and turnout data on mount.
- Shows a live turnout progress bar (animated with Framer Motion).
- **Machine Controls:** Buttons to Start, Pause, Lock, Unlock, Resume, or Close the polling machine. Each button calls `PATCH /api/polling-stations/:id/machine-status`.

### `VotersPage.tsx` (shared with admin)
- The same `VotersPage` component is reused at `/officer/voters` to let the officer view and search voters.

---

# 16. Styling

The client uses **Tailwind CSS v3** for all styling.

### Global Styles — `src/index.css`
- Imports `Inter` (body font) and `JetBrains Mono` (monospace font) from Google Fonts.
- Defines CSS custom properties (design tokens):
  - `--color-primary: 26 115 232` (government blue)
  - `--color-surface: 15 23 42` (very dark background)
  - `--color-card: 30 41 59` (slightly lighter card background)
- Sets the body background to `bg-slate-900` (dark mode throughout).

### Reusable Component Classes (defined in `@layer components` in `index.css`)
These are Tailwind utility combinations given short class names:

| Class | What it styles |
|---|---|
| `.card` | Glass-effect card panel (dark semi-transparent background, border, rounded corners) |
| `.card-glass` | White/transparent glass card for lighter contexts |
| `.btn-primary` | Blue primary action button with hover lift and shadow |
| `.btn-secondary` | Grey secondary button |
| `.btn-danger` | Red destructive button |
| `.btn-success` | Green success button |
| `.btn-ghost` | Transparent/subtle button |
| `.input` | Dark-themed text input with blue focus ring |
| `.input-error` | Red border version of input |
| `.label` | Small form field label |
| `.table-wrapper` | Scrollable table container |
| `.table` | Styled HTML table |
| `.badge`, `.badge-blue/green/red/yellow/gray/purple` | Coloured status pills |
| `.stat-card` | Dashboard statistic card (extends `.card`) |
| `.page-header` | Flex header row for page title and action button |
| `.nav-item`, `.nav-item-active` | Sidebar navigation link styles |
| `.evm-button`, `.evm-led` | Voting Machine specific button and LED styles |

### Animations
- **Framer Motion** is used for page transitions, modal open/close, sidebar slide-in, stat card fade-in, and the VVPAT reveal animation.
- Tailwind `animate-pulse` is used for LED indicators and skeleton loaders.
- Tailwind `animate-spin` is used in the `Spinner` component.

### Colour Palette
The theme is a dark mode government system:
- Background: `slate-900` / `slate-950`
- Cards: `slate-800`
- Primary accent: Google-blue `#1a73e8`
- Success: Emerald green
- Warning: Amber
- Danger: Red
- Text: `slate-100` (main), `slate-400` (secondary), `slate-500` (muted)

---

# 17. Assets

### Icons
All icons are from the **`lucide-react`** package. No image files are used for icons. Icons used include: Vote, Shield, Fingerprint, Users, Building2, Flag, Award, BarChart3, TrendingUp, LogOut, Menu, X, Eye, EyeOff, CheckCircle, Clock, Scan, RefreshCw, and many more.

### Party Symbol and Candidate Photo Uploads
- Party symbols and candidate photos are uploaded via the admin interface using `multipart/form-data` POST requests.
- The uploaded files are stored on the **server** (not in the client folder).
- The client references them by their URL path (e.g., `/uploads/parties/...`) which is proxied to the backend server.

### Favicon
- The default Vite favicon (`vite.svg`) is referenced in `index.html`. It is located in the `public/` folder.

---

# 18. Client to Server to Database Concept

The client **never** talks to the database directly. The communication always goes through the server. Here is how it works in this project:

## General Pattern

```
CLIENT (browser)                    SERVER (Node.js)              DATABASE
        |                                   |                          |
        |  HTTP Request                     |                          |
        |  e.g. GET /api/elections          |                          |
        | --------------------------------> |                          |
        |                                   |  SQL Query               |
        |                                   |  SELECT * FROM elections |
        |                                   | -----------------------> |
        |                                   |                          |
        |                                   |  Result rows             |
        |                                   | <----------------------- |
        |                                   |                          |
        |  JSON Response                    |                          |
        |  { data: [...elections] }         |                          |
        | <-------------------------------- |                          |
        |                                   |
  React state updated,
  UI re-renders with data
```

## Concrete Examples from This Project

### Example 1: Commissioner views election list
1. `ElectionsPage` mounts → `useAsync` calls `electionService.getAll()`
2. Client sends: `GET /api/elections` with `Authorization: Bearer <token>`
3. Server validates the JWT, queries the `elections` table in the database
4. Server returns `{ data: [{ id, name, status, scheduledDate, ... }, ...] }`
5. Client sets `data = [...]`, re-renders the table

### Example 2: Voter casts a vote
1. Voter taps "Cast My Vote" → `handleCastVote()` is called
2. Client sends: `POST /api/voting/cast` with `{ voterId, candidateId, pollingStationId }`
3. Server verifies the voter has not already voted, inserts a vote record into the `votes` table
4. Server creates a VVPAT record with a reference number and SHA-256 hash
5. Server returns `{ vvpat: { candidateName, partyName, referenceNumber, voteHash, ... } }`
6. Client stores `vvpatData`, switches to VVPAT screen

### Example 3: Officer changes machine status
1. Officer clicks "Lock Machine" → `updateStatus('LOCKED', false)` is called
2. Client sends: `PATCH /api/polling-stations/:id/machine-status` with `{ status: 'LOCKED', isPollingActive: false }`
3. Server updates the `machine_status` column in the `polling_stations` table
4. Server returns the updated polling station object
5. Client calls `refetchStation()` and `refetchTurnout()` to refresh displayed data

---

# 19. Simple Explanation for My Professor

> "In our project, the client side is the browser-based user interface built with React. It is responsible for displaying information and collecting user input. We have three types of interfaces: the Election Commissioner's admin panel, the Election Officer's dashboard, and a simulated touchscreen Electronic Voting Machine.
>
> When a user performs an action — for example, when the Commissioner creates a new election or when a voter casts their vote — the client does not directly access the database. Instead, it sends an HTTP request to our Node.js server through a set of API service functions. These requests always carry a JWT authentication token so the server can identify who is making the request and whether they have permission.
>
> The server receives the request, validates the token, performs the required operation on the database — such as inserting a vote record or fetching election results — and then returns a JSON response. The client receives this response, updates its internal state, and React automatically re-renders the user interface to reflect the new data.
>
> For example, when a voter finishes the voting process, the client sends a POST request to /api/voting/cast. The server inserts the vote into the database and returns a VVPAT record containing the candidate's name, party name, a reference number, and a SHA-256 hash for verification. The client then displays this as a paper audit trail on the screen, visible for 15 seconds before the machine resets.
>
> The key DBMS concept here is that the client and the database are always separated. The client never writes SQL. All database operations are the server's responsibility. This architecture is called a three-tier architecture: the Presentation tier (React client), the Logic tier (Node.js server), and the Data tier (the database)."

---

*End of CLIENT_FILE_GUIDE.md*
*This guide is based entirely on the actual files in the DBMS_project/client folder.*
