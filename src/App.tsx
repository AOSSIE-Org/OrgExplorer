import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import LandingPage from './pages/LandingPage';
import CallbackPage from './pages/CallbackPage';
import DashboardPage from './pages/DashboardPage';
import SecurityPage from './pages/SecurityPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useApp();
  return token ? <>{children}</> : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { token } = useApp();
  return (
    <Routes>
      <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/security"
        element={
          <ProtectedRoute>
            <SecurityPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
