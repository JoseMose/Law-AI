import React from 'react';
import PDFUpload from './PDFUpload';
import { AuthProvider } from './contexts/AuthContext';
import { AuthUI } from './components/AuthUI';
import { useAuth } from './contexts/AuthContext';
import Cases from './components/Cases';
import CaseView from './components/CaseView';
import './App.css';

function AppContent() {
  const { user, signOut } = useAuth();
  const [selectedCase, setSelectedCase] = React.useState(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  
  return (
    <div className="App">
      <div className="header">
        <div className="logoText">Law‑AI Dashboard</div>
        <div>
          <span className="muted">Welcome, {user?.username}</span>
          <button style={{ marginLeft: 12 }} onClick={signOut} className="primaryBtn">Sign out</button>
        </div>
      </div>
      <div className="layout">
        <aside className="sidebar">
          <Cases key={refreshKey} onSelect={c => setSelectedCase(c)} onDeleted={(id) => { if (selectedCase && selectedCase.id === id) setSelectedCase(null); setRefreshKey(k => k + 1); }} />
        </aside>
        <main className={`main ${selectedCase ? 'caseFull' : ''}`} aria-live="polite">
          {selectedCase ? <CaseView caseObj={selectedCase} onDeleted={(id) => { setSelectedCase(null); setRefreshKey(k => k + 1); }} /> : <div className="card"><h3>Your cases</h3><p className="muted">Select or create a case from the left to get started.</p></div>}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthUI>
        <AppContent />
      </AuthUI>
    </AuthProvider>
  );
}

export default App;
