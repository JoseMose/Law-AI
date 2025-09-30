import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthUI } from './components/AuthUI';
import { useAuth } from './contexts/AuthContext';
import CasesPage from './components/CasesPage';
import CaseView from './components/CaseViewNew';
import { DemoMode } from './components/DemoMode';
import Navigation from './components/Navigation';
import './styles/modern.css';

function AppContent() {
  const { user, signOut } = useAuth();
  
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} onSignOut={signOut} />
        <Routes>
          <Route path="/" element={<Navigate to="/cases" replace />} />
          <Route path="/cases" element={<CasesPage />} />
          <Route path="/case/:id" element={<CaseView />} />
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
      <AuthUI>
        <AppContent />
      </AuthUI>
    </AuthProvider>
  );
}

export default App;
