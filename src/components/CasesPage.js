import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CasesPage = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseDescription, setNewCaseDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [deletingCaseId, setDeletingCaseId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadCases();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCases = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://phd54f79fk.execute-api.us-east-1.amazonaws.com/dev/cases', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`,
        }
      });
      if (response.ok) {
        const data = await response.json();
        // API may return an array or an object containing the array
        if (Array.isArray(data)) {
          setCases(data);
        } else if (Array.isArray(data.cases)) {
          setCases(data.cases);
        } else if (Array.isArray(data.data)) {
          setCases(data.data);
        } else {
          // Fallback: try to extract any array value
          const arr = Object.values(data).find(v => Array.isArray(v));
          setCases(arr || []);
        }
      }
    } catch (error) {
      console.error('Error loading cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async () => {
    if (!newCaseTitle.trim()) return;

    try {
      setCreating(true);
      const response = await fetch('https://phd54f79fk.execute-api.us-east-1.amazonaws.com/dev/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          title: newCaseTitle.trim(),
          description: newCaseDescription.trim(),
        }),
      });

      if (response.ok) {
        const created = await response.json();
        // created.case may hold the new case
        const createdCase = created.case || created || null;
        setShowCreateModal(false);
        setNewCaseTitle('');
        setNewCaseDescription('');
        // Optimistically append the created case to the list
        if (createdCase) {
          setCases(prev => [ ...prev, createdCase ]);
        }
        // Refresh from server to ensure canonical data
        loadCases();
      } else {
        const errorData = await response.text();
        console.error('Error response:', response.status, errorData);
        alert(`Error creating case: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      console.error('Error creating case:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCase = async (caseId) => {
    if (!window.confirm('Delete this case? This action cannot be undone.')) return;
    
    setDeletingCaseId(caseId);
    try {
      const response = await fetch(`https://phd54f79fk.execute-api.us-east-1.amazonaws.com/dev/cases/${caseId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`,
        }
      });

      if (response.ok) {
        // Remove from local state
        setCases(prev => prev.filter(c => c.id !== caseId));
        // Close dropdown after successful deletion
        setOpenDropdown(null);
      } else {
        const text = await response.text();
        console.error('Failed to delete case:', response.status, text);
        alert('Failed to delete case: ' + response.status);
      }
    } catch (e) {
      console.error('Error deleting case:', e);
      alert('Error deleting case');
    } finally {
      setDeletingCaseId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusClass = status === 'active' ? 'active' : 
                       status === 'closed' ? 'inactive' : 'pending';
    return (
      <span className={`status-badge ${statusClass}`}>
        {status || 'active'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="main-content">
          <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
            <div className="loading-spinner"></div>
            <span className="ml-4 text-gray-600">Loading cases...</span>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">Cases</h1>
              <p className="page-description">
                Manage and organize all your legal cases in one place.
              </p>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <span>+</span>
              Create Case
            </button>
          </div>
        </div>

        {/* Cases Grid */}
        {cases.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <h3>No cases yet</h3>
            <p>Create your first case to get started with document management.</p>
            <button 
              className="btn btn-primary mt-4"
              onClick={() => setShowCreateModal(true)}
            >
              Create Your First Case
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {cases.map((caseItem) => (
              <div key={caseItem.id} className="card">
                <div className="card-body">
                  {/* Case Header with Actions */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 cursor-pointer" onClick={() => navigate(`/case/${caseItem.id}`)}>
                      <h3 className="card-title">{caseItem.title}</h3>
                      {caseItem.description && (
                        <p className="card-subtitle">{caseItem.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {getStatusBadge(caseItem.status)}
                      <div className="dropdown">
                        <button 
                          className="btn btn-sm btn-outline dropdown-toggle"
                          onClick={() => setOpenDropdown(openDropdown === caseItem.id ? null : caseItem.id)}
                        >
                          ⋯
                        </button>
                        {openDropdown === caseItem.id && (
                          <div className="dropdown-menu">
                            <button 
                              className="dropdown-item"
                              onClick={() => {
                                navigate(`/case/${caseItem.id}`);
                                setOpenDropdown(null);
                              }}
                            >
                              📂 Open Case
                            </button>
                            <button 
                              className="dropdown-item"
                              onClick={() => {
                                navigate(`/legal-research?case=${caseItem.id}`);
                                setOpenDropdown(null);
                              }}
                            >
                              🔍 Research
                            </button>
                            <button 
                              className="dropdown-item"
                              onClick={() => {
                                navigate(`/case/${caseItem.id}?tab=research`);
                                setOpenDropdown(null);
                              }}
                            >
                              📋 Add Case Law
                            </button>
                            <div className="dropdown-divider"></div>
                            <button 
                              className="dropdown-item text-red-600"
                              onClick={() => {
                                handleDeleteCase(caseItem.id);
                                setOpenDropdown(null);
                              }}
                              disabled={deletingCaseId === caseItem.id}
                            >
                              {deletingCaseId === caseItem.id ? (
                                <>
                                  <div className="loading-spinner inline-block w-3 h-3 mr-2"></div>
                                  Deleting...
                                </>
                              ) : (
                                '🗑️ Delete'
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Case Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{caseItem.documentCount || 0}</div>
                      <div className="text-sm text-gray-600">Documents</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{caseItem.caseLawCount || 0}</div>
                      <div className="text-sm text-gray-600">Case Law</div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mb-4">
                    <button 
                      className="btn btn-sm btn-outline flex-1"
                      onClick={() => navigate(`/case/${caseItem.id}`)}
                    >
                      � View Details
                    </button>
                    <button 
                      className="btn btn-sm btn-outline flex-1"
                      onClick={() => navigate(`/legal-research?case=${caseItem.id}`)}
                    >
                      🔍 Research
                    </button>
                  </div>

                  {/* Case Info */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Created {formatDate(caseItem.createdAt)}</span>
                    <span>Last updated {formatDate(caseItem.updatedAt || caseItem.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Case Modal */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Create New Case</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowCreateModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="caseTitle">
                    Case Title *
                  </label>
                  <input
                    id="caseTitle"
                    type="text"
                    className="form-input"
                    placeholder="Enter case title"
                    value={newCaseTitle}
                    onChange={(e) => setNewCaseTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="caseDescription">
                    Description
                  </label>
                  <textarea
                    id="caseDescription"
                    className="form-textarea"
                    placeholder="Brief case description (optional)"
                    rows={3}
                    value={newCaseDescription}
                    onChange={(e) => setNewCaseDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleCreateCase}
                  disabled={creating || !newCaseTitle.trim()}
                >
                  {creating ? (
                    <>
                      <div className="loading-spinner"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Case'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CasesPage;