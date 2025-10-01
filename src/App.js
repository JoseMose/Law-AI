import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import AboutPage from './components/AboutPage';
import HelpCenter from './components/HelpCenter';
import Documentation from './components/Documentation';
import SignInPage from './components/SignInPage';
import CasesPage from './components/CasesPage';
import CaseView from './components/CaseViewNew';
import DashboardPage from './components/DashboardPage';
import ClientsPage from './components/ClientsPage';
import BillingPage from './components/BillingPage';
import SettingsPage from './components/SettingsPage';
import { DemoMode } from './components/DemoMode';
import Navigation from './components/Navigation';
import './styles/modern.css';
import './styles/landing.css';
import './styles/help.css';
import './styles/documentation.css';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/signin" replace />;
  }
  
  return (
    <>
      <Navigation user={user} onSignOut={() => window.location.href = '/'} />
      {children}
    </>
  );
}

// Auth Route Component  
function AuthRoute({ children }) {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

function AppContent() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Public about page */}
          <Route path="/about" element={<AboutPage />} />
          
          {/* Public help center */}
          <Route path="/help" element={<HelpCenter />} />
          
          {/* Public documentation */}
          <Route path="/documentation" element={<Documentation />} />
          
          {/* Authentication route */}
          <Route 
            path="/signin" 
            element={
              <AuthRoute>
                <SignInPage />
              </AuthRoute>
            } 
          />
          
          {/* Protected dashboard routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />

          <Route path="/cases" element={
            <ProtectedRoute>
              <CasesPage />
            </ProtectedRoute>
          } />

          <Route path="/case/:id" element={
            <ProtectedRoute>
              <CaseView />
            </ProtectedRoute>
          } />

          <Route path="/clients" element={
            <ProtectedRoute>
              <ClientsPage />
            </ProtectedRoute>
          } />

          <Route path="/billing" element={
            <ProtectedRoute>
              <BillingPage />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  const backendDisabled = process.env.REACT_APP_BACKEND_DISABLED === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  
  // Show demo mode if backend is disabled or in production with localhost API
  if (backendDisabled || (isProduction && apiUrl.includes('localhost'))) {
    return <DemoMode />;
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
