import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = 'https://phd54f79fk.execute-api.us-east-1.amazonaws.com/dev';

export default function CaseView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cs, setCs] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCase = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/cases/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCs(data.case);
      } else if (response.status === 404) {
        navigate('/cases');
      }
    } catch (error) {
      console.error('Error loading case:', error);
      navigate('/cases');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (id) {
      loadCase();
    }
  }, [id, loadCase]);

  if (loading) {
    return (
      <div className="container">
        <div className="main-content">
          <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
            <div className="loading-spinner"></div>
            <span className="ml-4 text-gray-600">Loading case...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!cs) {
    return (
      <div className="container">
        <div className="main-content">
          <div className="empty-state">
            <div className="empty-state-icon">❌</div>
            <h3>Case not found</h3>
            <p>The case you're looking for doesn't exist or has been deleted.</p>
            <button 
              className="btn btn-primary mt-4"
              onClick={() => navigate('/cases')}
            >
              Back to Cases
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="main-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="breadcrumb">
            <button 
              className="breadcrumb-item cursor-pointer"
              onClick={() => navigate('/cases')}
            >
              Cases
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-item active">{cs.title}</span>
          </div>
          <h1 className="page-title">{cs.title}</h1>
          {cs.description && (
            <p className="page-description">{cs.description}</p>
          )}
        </div>

        {/* Content */}
        <div className="card">
          <div className="card-body">
            <h3 className="card-title">Case Details</h3>
            <p className="card-subtitle">
              This is a simplified view of the case. Full functionality will be restored shortly.
            </p>
            <div className="mt-4">
              <button 
                className="btn btn-secondary"
                onClick={() => navigate('/cases')}
              >
                ← Back to Cases
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}