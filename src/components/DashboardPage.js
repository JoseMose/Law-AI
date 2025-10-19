import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || 'https://sb7snqtgc3.execute-api.us-east-1.amazonaws.com/dev';

const fetchCases = async () => {
  try {
    const response = await fetch(`${API_BASE}/auth/cases`, {
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

const fetchClients = async () => {
  try {
    const response = await fetch(`${API_BASE}/auth/clients`, {
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}`,
      }
    });
    if (response.ok) {
      const data = await response.json();
      return data.clients || [];
    }
  } catch (e) {
    console.error('Error fetching clients:', e);
  }
  return [];
};

const DashboardPage = () => {
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [allCases, allClients] = await Promise.all([fetchCases(), fetchClients()]);
      setCases(allCases);
      setClients(allClients);
      setLoading(false);
    })();
  }, []);

  // Calculate statistics
  const totalCases = cases.length;
  const activeCases = cases.filter(c => c.status === 'active' || !c.status).length;
  const completedCases = cases.filter(c => c.status === 'completed' || c.status === 'closed').length;
  const totalClients = clients.length;

  // Recent cases (last 5, sorted by most recently updated)
  const recentCases = [...cases]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 5);

  // Generate recent activity from real case data
  const recentActivity = [];
  
  // Add recent case updates
  cases.forEach(c => {
    if (c.updatedAt && c.updatedAt !== c.createdAt) {
      const timeDiff = Date.now() - new Date(c.updatedAt).getTime();
      const daysAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
      const timeStr = daysAgo > 0 ? `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago` : `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
      
      recentActivity.push({
        id: `case-update-${c.id}`,
        type: 'case_update',
        message: `Case "${c.title}" was updated`,
        time: timeStr,
        timestamp: new Date(c.updatedAt).getTime()
      });
    }
    
    // Add document uploads
    if (c.documents && c.documents.length > 0) {
      c.documents.forEach(doc => {
        if (doc.uploadDate) {
          const timeDiff = Date.now() - new Date(doc.uploadDate).getTime();
          const daysAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
          const timeStr = daysAgo > 0 ? `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago` : `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
          
          recentActivity.push({
            id: `doc-upload-${doc.id}`,
            type: 'document_upload',
            message: `Document "${doc.name}" uploaded to "${c.title}"`,
            time: timeStr,
            timestamp: new Date(doc.uploadDate).getTime()
          });
        }
      });
    }
  });
  
  // Sort by timestamp and take the 5 most recent
  const sortedActivity = recentActivity
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);
  
  // If no recent activity, show a placeholder
  const finalActivity = sortedActivity.length > 0 ? sortedActivity : [
    { id: 'no-activity', type: 'info', message: 'No recent activity', time: 'N/A' }
  ];

  // Generate upcoming deadlines from real case data
  const upcomingDeadlines = [];
  const now = new Date();
  
  cases.forEach(c => {
    // Check if case has a due date or deadline
    if (c.dueDate) {
      const dueDate = new Date(c.dueDate);
      const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntil >= 0 && daysUntil <= 30) { // Only show deadlines within 30 days
        upcomingDeadlines.push({
          id: `deadline-${c.id}`,
          title: `Case: ${c.title}`,
          case: c.title,
          dueDate: c.dueDate,
          priority: daysUntil <= 3 ? 'high' : daysUntil <= 7 ? 'medium' : 'low'
        });
      }
    }
  });
  
  // Sort by due date
  const sortedDeadlines = upcomingDeadlines.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5);
  
  const finalDeadlines = sortedDeadlines.length > 0 ? sortedDeadlines : [
    { id: 'no-deadlines', title: 'No upcoming deadlines', case: 'N/A', dueDate: '', priority: 'low' }
  ];

  const StatCard = ({ title, value, icon, color = 'blue' }) => (
    <div className="card">
      <div className="card-body p-6">
        <div className="flex items-center">
          <div className={`text-3xl mr-4 text-${color}-500`}>{icon}</div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-600">{title}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const QuickActionCard = ({ title, description, icon, onClick, color = 'blue' }) => (
    <div className="card cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <div className="card-body p-6 text-center">
        <div className={`text-4xl mb-3 text-${color}-500`}>{icon}</div>
        <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="container">
      <div className="main-content">
        {/* Header */}
        <div className="page-header mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's an overview of your cases and activities.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
            <div className="loading-spinner"></div>
            <span className="ml-4 text-gray-600">Loading dashboard...</span>
          </div>
        ) : (
          <>
            {/* Statistics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Cases"
                value={totalCases}
                icon="📋"
                color="blue"
              />
              <StatCard
                title="Active Cases"
                value={activeCases}
                icon="⚡"
                color="green"
              />
              <StatCard
                title="Completed Cases"
                value={completedCases}
                icon="✅"
                color="purple"
              />
              <StatCard
                title="Total Clients"
                value={totalClients}
                icon="👥"
                color="orange"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Quick Actions */}
              <div className="lg:col-span-1">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Quick Actions</h3>
                  </div>
                  <div className="card-body p-6">
                    <div className="space-y-4">
                      <QuickActionCard
                        title="New Case"
                        description="Create a new case file"
                        icon="➕"
                        onClick={() => navigate('/cases/new')}
                        color="blue"
                      />
                      <QuickActionCard
                        title="Upload Document"
                        description="Add documents to existing cases"
                        icon="📤"
                        onClick={() => navigate('/upload')}
                        color="green"
                      />
                      <QuickActionCard
                        title="Add Client"
                        description="Register a new client"
                        icon="👤"
                        onClick={() => navigate('/clients/new')}
                        color="purple"
                      />
                      <QuickActionCard
                        title="View All Cases"
                        description="Browse all case files"
                        icon="📂"
                        onClick={() => navigate('/cases')}
                        color="gray"
                      />
                    </div>
                  </div>
                </div>

                {/* Upcoming Deadlines */}
                <div className="card mt-6">
                  <div className="card-header">
                    <h3 className="card-title">Upcoming Deadlines</h3>
                  </div>
                  <div className="card-body p-6">
                    {finalDeadlines.length === 0 || finalDeadlines[0].id === 'no-deadlines' ? (
                      <p className="text-gray-500 text-sm">No upcoming deadlines</p>
                    ) : (
                      <div className="space-y-4">
                        {finalDeadlines.map(deadline => (
                          <div key={deadline.id} className="flex items-start space-x-3">
                            <div className={`w-3 h-3 rounded-full mt-1 ${
                              deadline.priority === 'high' ? 'bg-red-500' :
                              deadline.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}></div>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900">{deadline.title}</h4>
                              <p className="text-xs text-gray-600">{deadline.case}</p>
                              {deadline.dueDate && <p className="text-xs text-gray-500">Due: {new Date(deadline.dueDate).toLocaleDateString()}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Cases & Activity */}
              <div className="lg:col-span-2 space-y-6">
                {/* Recent Cases */}
                <div className="card">
                  <div className="card-header">
                    <div className="flex items-center justify-between">
                      <h3 className="card-title">Recent Cases</h3>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate('/cases')}
                      >
                        View All
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    {recentCases.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <h3>No cases yet</h3>
                        <p>Create your first case to get started.</p>
                        <button
                          className="btn btn-primary mt-4"
                          onClick={() => navigate('/cases/new')}
                        >
                          Create Case
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentCases.map((c) => (
                          <div key={c.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{c.title || c.name}</h4>
                              <p className="text-sm text-gray-600">{c.description}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  c.status === 'completed' || c.status === 'closed'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {c.status || 'active'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Created: {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                            </div>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => navigate(`/cases/${c.id}`)}
                            >
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Recent Activity</h3>
                  </div>
                  <div className="card-body">
                    <div className="space-y-4">
                      {finalActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3">
                          <div className="text-lg">
                            {activity.type === 'document_upload' && '📄'}
                            {activity.type === 'case_update' && '📝'}
                            {activity.type === 'review_complete' && '✅'}
                            {activity.type === 'client_added' && '👤'}
                            {activity.type === 'case_created' && '📋'}
                            {activity.type === 'info' && 'ℹ️'}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{activity.message}</p>
                            <p className="text-xs text-gray-500">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
