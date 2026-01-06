
import React from 'react';
import { MemoryRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { Attendance } from './pages/Attendance';
import { Payments } from './pages/Payments';
import { Inventory } from './pages/Inventory';
import { MenuPage } from './pages/MenuPage';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Role } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode, roles?: Role[] }> = ({ children, roles }) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" />;
  
  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute roles={['ADMIN']}><Dashboard /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute roles={['ADMIN', 'EDUCATOR']}><Students /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute roles={['ADMIN', 'EDUCATOR']}><Attendance /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute roles={['ADMIN']}><Payments /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute roles={['ADMIN']}><Inventory /></ProtectedRoute>} />
      <Route path="/menu" element={<ProtectedRoute roles={['ADMIN', 'ASISTENT']}><MenuPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute roles={['ADMIN', 'EDUCATOR']}><Reports /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute roles={['ADMIN']}><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </AppProvider>
  );
};

export default App;
