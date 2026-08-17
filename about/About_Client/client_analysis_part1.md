# SEVM Online Voting System — Client Analysis (Part 1)
## For DBMS Presentation

---

# PART 1 — CLIENT OVERVIEW

## Quick Answers

| Question | Answer |
|---|---|
| **Frontend Language** | TypeScript |
| **Frontend Framework** | React 18 |
| **Build Tool** | Vite 5 |
| **Styling** | Tailwind CSS 3.4 + Custom CSS |
| **Routing** | React Router DOM v6 |
| **HTTP Client** | Axios |
| **Form Handling** | React Hook Form + Zod (client-side validation) |
| **State Management** | React useState + custom hooks (no Redux) |
| **Animations** | Framer Motion |
| **Charts/Graphs** | Recharts |
| **Icons** | Lucide React |
| **Notifications** | React Hot Toast |
| **Fonts** | Inter (sans-serif) + JetBrains Mono (monospace) |
| **Date Formatting** | date-fns |

## What Is the Client and Why Do We Need It?

**Simple explanation:**
The client is the "face" of the voting system. It's the website that users (Commissioner, Officer, or Voter) see and interact with in their browser. It sends requests to the server and displays the responses visually.

**Why we need it:**
- Humans can't read raw JSON from the server — they need a visual interface
- Someone needs to **collect user input** through forms and buttons
- Someone needs to **display data** in tables, charts, and dashboards
- Someone needs to **navigate** between different pages (elections, voters, voting machine, etc.)
- Someone needs to **protect routes** so only authorized users see their pages
- The client does ALL of this

**Client responsibilities:**
1. **Render the UI** — displays pages with React components
2. **Handle user interactions** — button clicks, form submissions, file uploads
3. **Client-side validation** — check data format BEFORE sending to server (using Zod)
4. **Send HTTP requests** — talk to the server's REST API (via Axios)
5. **Store authentication** — save JWT token in localStorage after login
6. **Route protection** — prevent unauthorized users from accessing admin/officer pages
7. **Display feedback** — show success/error toast notifications
8. **Visualize data** — render charts (Recharts) and animated statistics
9. **Responsive design** — work on desktop, tablet, and mobile screens
10. **Simulate EVM** — provide a touchscreen voting machine interface

---

# PART 2 — COMPLETE CLIENT FOLDER STRUCTURE

```
client/
├── .gitignore                        ← Files excluded from git
├── index.html                        ← THE SINGLE HTML PAGE (SPA entry)
├── package.json                      ← Dependencies and npm scripts
├── tsconfig.json                     ← TypeScript base configuration
├── tsconfig.app.json                 ← TypeScript app-specific config
├── tsconfig.node.json                ← TypeScript Node.js config (for Vite)
├── vite.config.ts                    ← Vite build tool configuration
├── tailwind.config.js                ← Tailwind CSS theme customization
├── postcss.config.js                 ← PostCSS plugins (autoprefixer + Tailwind)
├── public/                           ← Static assets served as-is
├── src/
│   ├── main.tsx                      ← REACT ENTRY POINT (mounts App to DOM)
│   ├── App.tsx                       ← ROOT COMPONENT (routing + auth guards)
│   ├── App.css                       ← Legacy/miscellaneous CSS
│   ├── index.css                     ← GLOBAL STYLES (Tailwind + design system)
│   ├── assets/
│   │   ├── hero.png                  ← Hero image asset
│   │   ├── react.svg                 ← React logo
│   │   └── vite.svg                  ← Vite logo
│   ├── lib/
│   │   └── axios.ts                  ← AXIOS INSTANCE (API client + interceptors)
│   ├── services/
│   │   ├── api.service.ts            ← ALL API CALL FUNCTIONS (elections, voters, etc.)
│   │   └── auth.service.ts           ← LOGIN/LOGOUT + TOKEN MANAGEMENT
│   ├── hooks/
│   │   └── useAsync.ts              ← CUSTOM HOOKS (useAsync, useMutation, useCountdown, useLocalStorage)
│   ├── components/
│   │   └── ui/
│   │       └── index.tsx            ← REUSABLE UI COMPONENTS (Modal, StatCard, etc.)
│   ├── layouts/
│   │   ├── AdminLayout.tsx          ← COMMISSIONER LAYOUT (sidebar + header)
│   │   └── OfficerLayout.tsx        ← OFFICER LAYOUT (sidebar + header)
│   └── pages/
│       ├── auth/
│       │   └── LoginPage.tsx        ← LOGIN PAGE (role selector + form)
│       ├── admin/
│       │   ├── AdminDashboard.tsx    ← COMMISSIONER DASHBOARD (stats + charts)
│       │   ├── ElectionsPage.tsx     ← ELECTION CRUD + STATUS MANAGEMENT
│       │   ├── ConstituenciesPage.tsx ← CONSTITUENCY CRUD
│       │   ├── PollingStationsPage.tsx ← STATION CRUD + MACHINE STATUS
│       │   ├── PartiesPage.tsx       ← PARTY CRUD + SYMBOL UPLOAD
│       │   ├── CandidatesPage.tsx    ← CANDIDATE CRUD + PHOTO UPLOAD
│       │   ├── OfficersPage.tsx      ← OFFICER CRUD
│       │   ├── VotersPage.tsx        ← VOTER CRUD + PAGINATION + SEARCH
│       │   ├── ResultsPage.tsx       ← ELECTION RESULTS + BAR CHARTS
│       │   ├── ReportsPage.tsx       ← PDF/EXCEL REPORT DOWNLOADS
│       │   └── AuditLogsPage.tsx     ← AUDIT LOG LISTING + FILTERS
│       ├── officer/
│       │   └── OfficerDashboard.tsx  ← OFFICER DASHBOARD (turnout + machine controls)
│       └── voting/
│           └── VotingMachinePage.tsx ← FULL VOTING MACHINE SIMULATION (9 screens)
├── dist/                             ← Compiled production build
└── node_modules/                     ← Installed dependencies
```

### Why Each Folder Exists

| Folder | Why It Exists | What's Inside |
|---|---|---|
| `lib/` | Centralizes the HTTP client configuration so API calls are consistent everywhere | Axios instance with JWT interceptors |
| `services/` | Abstracts ALL server communication into clean function calls — no page knows about URLs or HTTP methods | One service per domain (auth, elections, voters, etc.) |
| `hooks/` | Reusable React logic that can be shared across all pages — avoids code duplication | `useAsync` (data fetching), `useMutation` (create/update/delete), `useCountdown` (timer), `useLocalStorage` |
| `components/ui/` | Shared UI building blocks used across many pages | Modal, ConfirmDialog, Skeleton, StatusBadge, StatCard, Spinner, Pagination, EmptyState |
| `layouts/` | Page wrappers that provide consistent structure (sidebar, header, footer) for different user roles | AdminLayout (Commissioner), OfficerLayout (Officer) |
| `pages/` | Actual page components — each one corresponds to a route in the browser | Organized by user role: auth, admin, officer, voting |
| `assets/` | Static images and SVGs used in the application | Hero image, logos |

---

# PART 3 — CLIENT ENTRY POINT & STARTUP

## What Happens When You Run `npm run dev`

```
STEP 1: You type in terminal
─────────────────────────────
npm run dev

STEP 2: package.json script executes
─────────────────────────────────────
"dev": "vite"
Vite = ultra-fast build tool for modern web apps
Starts a dev server on port 5173 with hot module replacement (HMR)

STEP 3: Vite reads vite.config.ts
─────────────────────────────────
- Registers @vitejs/plugin-react (enables JSX/TSX)
- Sets up path alias: '@' → './src' (so imports like '@/services/api.service' work)
- Configures proxy: /api → http://localhost:5000 (forwards API calls to backend)
- Configures proxy: /uploads → http://localhost:5000 (forwards file requests to backend)

STEP 4: Vite serves index.html
───────────────────────────────
FILE: client/index.html
This is the ONLY HTML file in the entire frontend (Single Page Application).
It contains: <div id="root"></div> and loads src/main.tsx as a module.

STEP 5: main.tsx executes
─────────────────────────
FILE: client/src/main.tsx
```

### Exact Startup Sequence (from main.tsx)

**Step 5a — React and ReactDOM imported**
```
import React from 'react';
import ReactDOM from 'react-dom/client';
```
- React is the UI library that creates virtual DOM elements
- ReactDOM connects React to the actual browser DOM

**Step 5b — App component imported**
```
import App from './App.tsx';
```
- This triggers ALL the code in App.tsx to be parsed
- All page imports happen here, all route definitions are set up

**Step 5c — Global CSS imported**
```
import './index.css';
```
- Loads Google Fonts (Inter, JetBrains Mono)
- Initializes Tailwind CSS (base, components, utilities)
- Defines the entire design system: card, button, input, badge, table, modal styles
- Sets dark theme, custom scrollbar, and custom animations

**Step 5d — React app mounts to DOM**
```
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```
- Finds the `<div id="root">` in index.html
- Creates a React root
- Renders the `<App />` component inside `<React.StrictMode>` (enables extra development checks)
- From this point, React controls the entire page

### The Critical Distinction (Client vs Server)

| Concept | Server | Client |
|---|---|---|
| **Language** | TypeScript (Node.js) | TypeScript (Browser) |
| **Entry point** | `src/index.ts` | `src/main.tsx` |
| **What starts** | Express server listening on port 5000 | Vite dev server on port 5173 |
| **Talks to** | MySQL database (via Prisma) | Server API (via Axios HTTP requests) |
| **Runs where** | Your computer (backend) | User's browser (frontend) |
| **Output** | JSON responses | Visual HTML/CSS interface |

### What App.tsx Does When Imported

When `main.tsx` imports `App`, the file [App.tsx](file:///d:/Yoga/DBMS/DBMS_project/client/src/App.tsx) sets up:

```
1. Import all page components (LoginPage, AdminDashboard, etc.)
2. Import layouts (AdminLayout, OfficerLayout)
3. Import authService (for route protection)
4. Define RequireAuth component (checks JWT + role before rendering children)
5. Define VvpatPage inline component (VVPAT lookup UI)
6. Define PlaceholderPage inline component (for unimplemented pages)
7. Define App function component:
   a. Wrap everything in <BrowserRouter> (enables URL-based routing)
   b. Add <Toaster> (enables toast notifications globally)
   c. Define ALL routes:
      - Public: / (Login), /voting-machine, /vvpat
      - Admin: /admin, /admin/elections, /admin/voters, etc. (COMMISSIONER only)
      - Officer: /officer, /officer/voters, /officer/machine (OFFICER only)
      - Fallback: * → redirect to /
```

> **KEY INSIGHT:** Unlike the server where routes map to API endpoints, the client routes map to PAGES that the user sees. Each route renders a different React component.

---

# PART 4 — HOW THE CLIENT TALKS TO THE SERVER

## The Communication Chain

```
USER clicks button in browser
  ↓
React EVENT HANDLER fires (e.g., onClick)
  ↓
Page calls SERVICE function (e.g., electionService.create(data))
  ↓
Service calls AXIOS instance (e.g., api.post('/elections', data))
  ↓
Axios INTERCEPTOR attaches JWT token from localStorage
  ↓
Vite PROXY forwards /api/* requests to http://localhost:5000
  ↓
EXPRESS SERVER receives the request
  ↓
Server processes it (middleware → controller → repository → MySQL)
  ↓
Server sends JSON RESPONSE back
  ↓
Axios receives response, extracts .data.data
  ↓
SERVICE returns the data to the page
  ↓
React UPDATES STATE (useState setter)
  ↓
React RE-RENDERS the component with new data
  ↓
USER sees updated UI
```

## Why the Proxy Exists

The client runs on `http://localhost:5173` and the server on `http://localhost:5000`. Without a proxy, the browser would block requests due to CORS (Cross-Origin Resource Sharing). The Vite proxy makes it so:
- Client thinks it's calling `/api/elections` on itself (port 5173)
- Vite silently forwards this to `http://localhost:5000/api/elections`
- The browser never sees the cross-origin request

In production, both are served from the same domain, so no proxy is needed.

---

# PART 5 — HOW CLIENT FILES CONNECT

## Complete Dependency Map

```
src/main.tsx (ENTRY POINT)
├── imports: react, react-dom
├── imports: ./App.tsx ────────────────────────────────────────────┐
├── imports: ./index.css (global styles)                          │
│                                                                 │
│   App.tsx ◄─────────────────────────────────────────────────────┘
│   ├── imports: react-router-dom (BrowserRouter, Routes, Route)
│   ├── imports: react-hot-toast (Toaster)
│   ├── imports: services/auth.service ──────────────────────┐
│   ├── imports: layouts/AdminLayout ────────────────────────┤
│   ├── imports: layouts/OfficerLayout ──────────────────────┤
│   ├── imports: pages/auth/LoginPage ──────────────────────┤
│   ├── imports: pages/admin/* (11 admin pages) ────────────┤
│   ├── imports: pages/officer/OfficerDashboard ────────────┤
│   └── imports: pages/voting/VotingMachinePage ────────────┤
│                                                            │
│   LAYOUTS ◄────────────────────────────────────────────────┤
│   Each layout imports:                                     │
│   ├── react-router-dom (NavLink, useNavigate)              │
│   ├── framer-motion (motion, AnimatePresence)              │
│   ├── lucide-react (icons)                                 │
│   └── services/auth.service (for user info + logout)       │
│                                                            │
│   PAGES ◄──────────────────────────────────────────────────┤
│   Each admin page imports:                                 │
│   ├── hooks/useAsync (useAsync, useMutation)               │
│   ├── services/api.service (API call functions) ──────┐    │
│   ├── components/ui (Modal, Table, StatusBadge, etc.) │    │
│   ├── react-hook-form (form handling)                 │    │
│   ├── zod (client-side validation)                    │    │
│   ├── lucide-react (icons)                            │    │
│   └── react-hot-toast (notifications)                 │    │
│                                                       │    │
│   SERVICES ◄──────────────────────────────────────────┘    │
│   services/api.service.ts                                  │
│   ├── imports: lib/axios (configured Axios instance) ──┐   │
│   └── exports: electionService, voterService,          │   │
│       candidateService, votingService, etc.             │   │
│                                                        │   │
│   services/auth.service.ts ◄───────────────────────────│───┘
│   ├── imports: lib/axios                               │
│   └── exports: authService (login, logout,             │
│       getCurrentUser, isAuthenticated, hasRole)         │
│                                                        │
│   LIB ◄───────────────────────────────────────────────┘
│   lib/axios.ts
│   ├── Creates axios instance (baseURL: '/api', timeout: 30s)
│   ├── REQUEST interceptor: attaches JWT from localStorage
│   └── RESPONSE interceptor: on 401 error → clear token → redirect to login
│
│   HOOKS
│   hooks/useAsync.ts
│   └── exports: useAsync, useMutation, useLocalStorage, useCountdown
│       Used by: ALL admin pages, officer dashboard, voting machine
│
│   COMPONENTS
│   components/ui/index.tsx
│   └── exports: Modal, ConfirmDialog, Skeleton, TableSkeleton,
│       EmptyState, StatusBadge, StatCard, Spinner, Pagination
│       Used by: ALL admin pages, officer dashboard
```

## Simplified Flow

```
main.tsx → App.tsx → layouts → pages → hooks + services → lib/axios → Server API
                              → components/ui (shared UI building blocks)
```

## Why Each Connection Exists

| From → To | Why |
|---|---|
| `main.tsx` → `App.tsx` | main needs the root component to mount React to the DOM |
| `App.tsx` → layouts | App needs layout wrappers for consistent page structure |
| `App.tsx` → pages | App needs to register URL routes to specific page components |
| `App.tsx` → `auth.service` | App needs auth checks for the `RequireAuth` route guard |
| pages → `api.service` | Pages need to fetch/send data to the server |
| pages → `hooks/useAsync` | Pages need to handle loading states, errors, and data fetching |
| pages → `components/ui` | Pages need shared UI components (modals, tables, badges) |
| `api.service` → `lib/axios` | Services need the configured HTTP client to make API calls |
| `auth.service` → `lib/axios` | Auth service needs the HTTP client for login/logout requests |
| `lib/axios` → `localStorage` | Axios interceptor needs to read/write JWT tokens |
| layouts → `auth.service` | Layouts need user info (name, email) and logout functionality |
| everyone → `lucide-react` | Everyone needs icons for visual elements |
| everyone → `framer-motion` | Everyone needs animations for smooth transitions |
