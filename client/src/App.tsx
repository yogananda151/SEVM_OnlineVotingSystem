import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Auth
import { LoginPage } from './pages/auth/LoginPage';

// Layouts
import { AdminLayout } from './layouts/AdminLayout';
import { OfficerLayout } from './layouts/OfficerLayout';

// Admin pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ElectionsPage } from './pages/admin/ElectionsPage';
import { ElectionSetupPage } from './pages/admin/ElectionSetupPage';
import { RegionsPage } from './pages/admin/RegionsPage';
import { ConstituenciesPage } from './pages/admin/ConstituenciesPage';
import { PollingStationsPage } from './pages/admin/PollingStationsPage';
import { PartiesPage } from './pages/admin/PartiesPage';
import { CandidatesPage } from './pages/admin/CandidatesPage';
import { OfficersPage } from './pages/admin/OfficersPage';
import { VotersPage } from './pages/admin/VotersPage';
import { ResultsPage } from './pages/admin/ResultsPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { NotificationsPage } from './pages/admin/NotificationsPage'; // #1 / #10
import { SettingsPage } from './pages/admin/SettingsPage';           // #1 / #11

// Officer pages
import { OfficerDashboard } from './pages/officer/OfficerDashboard';
import { MachineControlPage } from './pages/officer/MachineControlPage'; // #1 / #4

// Voting Machine & Public VVPAT
import { VotingMachinePage } from './pages/voting/VotingMachinePage';
import { VvpatPage } from './pages/voting/VvpatPage';

// Auth guard
import { authService } from './services/auth.service';

const RequireAuth: React.FC<{ role: string; children: React.ReactNode }> = ({ role, children }) => {
  if (!authService.isAuthenticated()) return <Navigate to="/" replace />;
  if (!authService.hasRole(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
          success: { iconTheme: { primary: '#10b981', secondary: '#f1f5f9' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } },
        }}
      />

      <Routes>
        {/* Public */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/voting-machine" element={<VotingMachinePage />} />
        <Route path="/vvpat" element={<VvpatPage />} />

        {/* Admin */}
        <Route path="/admin" element={<RequireAuth role="COMMISSIONER"><AdminLayout><AdminDashboard /></AdminLayout></RequireAuth>} />
        <Route path="/admin/elections" element={<RequireAuth role="COMMISSIONER"><AdminLayout><ElectionsPage /></AdminLayout></RequireAuth>} />
        {/* #12: Removed duplicate route — canonical URL is /admin/elections/:id/setup */}
        <Route path="/admin/elections/:id/setup" element={<RequireAuth role="COMMISSIONER"><AdminLayout><ElectionSetupPage /></AdminLayout></RequireAuth>} />
        <Route path="/admin/elections/:id" element={<Navigate to="/admin/elections" replace />} />
        <Route path="/admin/regions" element={<RequireAuth role="COMMISSIONER"><AdminLayout><RegionsPage /></AdminLayout></RequireAuth>} />
        <Route path="/admin/constituencies" element={<RequireAuth role="COMMISSIONER"><AdminLayout><ConstituenciesPage /></AdminLayout></RequireAuth>} />
        <Route path="/admin/polling-stations" element={<RequireAuth role="COMMISSIONER"><AdminLayout><PollingStationsPage /></AdminLayout></RequireAuth>} />
        <Route path="/admin/parties" element={<RequireAuth role="COMMISSIONER"><AdminLayout><PartiesPage /></AdminLayout></RequireAuth>} />
        <Route path="/admin/candidates" element={<RequireAuth role="COMMISSIONER"><AdminLayout><CandidatesPage /></AdminLayout></RequireAuth>} />
        <Route path="/admin/officers" element={<RequireAuth role="COMMISSIONER"><AdminLayout><OfficersPage /></AdminLayout></RequireAuth>} />
        <Route path="/admin/voters" element={<RequireAuth role="COMMISSIONER"><AdminLayout><VotersPage /></AdminLayout></RequireAuth>} />
        <Route path="/admin/results" element={<RequireAuth role="COMMISSIONER"><AdminLayout><ResultsPage /></AdminLayout></RequireAuth>} />
        <Route path="/admin/reports" element={<RequireAuth role="COMMISSIONER"><AdminLayout><ReportsPage /></AdminLayout></RequireAuth>} />
        <Route path="/admin/audit-logs" element={<RequireAuth role="COMMISSIONER"><AdminLayout><AuditLogsPage /></AdminLayout></RequireAuth>} />
        {/* #1 / #10: Real notifications page */}
        <Route path="/admin/notifications" element={<RequireAuth role="COMMISSIONER"><AdminLayout><NotificationsPage /></AdminLayout></RequireAuth>} />
        {/* #1 / #11: Real settings page */}
        <Route path="/admin/settings" element={<RequireAuth role="COMMISSIONER"><AdminLayout><SettingsPage /></AdminLayout></RequireAuth>} />

        {/* Officer */}
        <Route path="/officer" element={<RequireAuth role="OFFICER"><OfficerLayout><OfficerDashboard /></OfficerLayout></RequireAuth>} />
        <Route path="/officer/voters" element={<RequireAuth role="OFFICER"><OfficerLayout><VotersPage /></OfficerLayout></RequireAuth>} />
        {/* #1 / #4: Real MachineControlPage instead of PlaceholderPage */}
        <Route path="/officer/machine" element={<RequireAuth role="OFFICER"><OfficerLayout><MachineControlPage /></OfficerLayout></RequireAuth>} />
        <Route path="/officer/vvpat" element={<Navigate to="/officer" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
