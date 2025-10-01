import React, { useEffect, useState } from 'react';

const fetchCases = async () => {
  try {
    const response = await fetch('https://phd54f79fk.execute-api.us-east-1.amazonaws.com/dev/cases', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}`,
      }
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.cases)) return data.cases;
      if (Array.isArray(data.data)) return data.data;
      const arr = Object.values(data).find(v => Array.isArray(v));
      return arr || [];
    }
  } catch (e) {
    // eslint-disable-next-line
    console.error('Error fetching cases:', e);
  }
  return [];
};

const DashboardPage = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const allCases = await fetchCases();
      setCases(allCases);
      setLoading(false);
    })();
  }, []);

  const topCases = cases.slice(0, 3);

  return (
    <div className="container">
      <h1>Dashboard</h1>
      <p>Overview of cases, billing, deadlines, etc.</p>

      <div className="card" style={{ maxWidth: 600, margin: '32px auto 0', padding: 0 }}>
        <div className="card-header" style={{ padding: '24px 24px 12px 24px' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Top 3 Cases</h2>
        </div>
        <div className="card-body" style={{ padding: 24 }}>
          {loading ? (
            <span>Loading...</span>
          ) : topCases.length === 0 ? (
            <span>No cases found.</span>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {topCases.map((c) => (
                <li key={c.id} style={{ marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
                  <strong>{c.title || c.name}</strong><br />
                  {c.description && <span style={{ color: '#64748b' }}>{c.description}<br /></span>}
                  <span>Status: {c.status || 'active'}</span><br />
                  <span>Created: {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
