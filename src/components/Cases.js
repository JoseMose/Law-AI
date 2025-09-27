import React, { useEffect, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '';

export default function Cases({ onSelect, onDeleted }) {
  const [cases, setCases] = useState([]);
  const [title, setTitle] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/cases`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}` } })
      .then(r => r.json())
      .then(setCases)
      .catch(() => setCases([]));
  }, []);

  // Close any open menu when clicking outside
  useEffect(() => {
    function onDocClick() {
      setOpenMenuId(null);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  async function createCase(e) {
    e.preventDefault();
    if (!title) return;
    const res = await fetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}` },
      body: JSON.stringify({ title })
    });
    if (res.ok) {
      const data = await res.json();
      setCases(c => [data, ...c]);
      setTitle('');
    }
  }

  return (
    <div>
      <h3>Your cases</h3>
      <form onSubmit={createCase} className="createCaseForm" style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="New case title" />
        <button type="submit" className="primaryBtn">Create</button>
      </form>
      <div>
        {cases.map(c => (
          <div key={c.id} className="caseListItem card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
              <button onClick={() => onSelect(c)} style={{ flex: 1 }}>{c.title}</button>
              <div style={{ marginLeft: 8, position: 'relative' }}>
                <button title="More" className="threeDotsBtn" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === c.id ? null : c.id); }} aria-haspopup="true" aria-expanded={openMenuId === c.id}>{/* larger hit area */}⋯</button>
                {openMenuId === c.id && (
                  <div className="dotsMenu" onClick={(e) => e.stopPropagation()} role="menu">
                    <button className="menuItem" onClick={async () => {
                      if (!window.confirm(`Delete case '${c.title}' and all its documents? This cannot be undone.`)) return;
                      try {
                        const res = await fetch(`${API_BASE}/cases/${c.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}` } });
                        // Treat 404 (already deleted) as success (idempotent)
                        if (res.ok || res.status === 404) {
                          if (res.status === 404) console.info('Case already missing on server, removing locally:', c.id);
                          setCases(curr => curr.filter(x => x.id !== c.id));
                          setOpenMenuId(null);
                          if (onDeleted) onDeleted(c.id);
                          return;
                        }

                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || `Delete failed (${res.status})`);
                      } catch (err) {
                        console.error('Failed to delete case:', err);
                        alert('Delete failed: ' + (err.message || err));
                      }
                    }} role="menuitem">Delete case</button>
                  </div>
                )}
              </div>
            </div>
            <div className="muted small">{(c.documents || []).length} documents</div>
          </div>
        ))}
      </div>
    </div>
  );
}
