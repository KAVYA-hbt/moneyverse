import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './pages/DashboardLayout';
import { DashboardHomePage } from './pages/DashboardHomePage';
import { ProfilesListPage } from './pages/ProfilesListPage';
import { ProfileDetailPage } from './pages/ProfileDetailPage';
import { HandoffQueuePage } from './pages/HandoffQueuePage';
import { HandoffCaseDetailPage } from './pages/HandoffCaseDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// No /login route: per product decision the app never shows a sign-in form.
// ProtectedRoute now just gates on the silent dev auto-login resolving
// (see AuthContext) and lands the user straight on /dashboard.
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardHomePage />} />
                <Route path="/profiles" element={<ProfilesListPage />} />
                <Route
                  path="/profiles/:playerId"
                  element={<ProfileDetailPage />}
                />
                <Route path="/handoffs" element={<HandoffQueuePage />} />
                <Route
                  path="/handoffs/:caseId"
                  element={<HandoffCaseDetailPage />}
                />
                <Route path="/analytics" element={<AnalyticsPage />} />
              </Route>
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
