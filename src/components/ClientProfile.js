import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || 'https://sb7snqtgc3.execute-api.us-east-1.amazonaws.com/dev';

const ClientProfile = () => {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState([]);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [linkedCases, setLinkedCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);

  // Helper function to get current user info
  const getCurrentUser = () => {
    // Try to get user info from sessionStorage or other auth data
    const userInfo = sessionStorage.getItem('userInfo');
    if (userInfo) {
      try {
        return JSON.parse(userInfo);
      } catch (e) {
        return { name: 'Unknown User', email: 'unknown@example.com' };
      }
    }
    return { name: 'Unknown User', email: 'unknown@example.com' };
  };

  // Helper functions for status display
  const getStatusClass = (status) => {
    const statusMap = {
      'prospect': 'prospect',
      'active': 'active',
      'on-hold': 'on-hold',
      'closed': 'closed',
      'pending-intake': 'pending-intake',
      'billing-issue': 'billing-issue',
      'vip-priority': 'vip-priority'
    };
    return statusMap[status] || 'active';
  };

  const getStatusLabel = (status) => {
    const labelMap = {
      'prospect': 'Prospect',
      'active': 'Active',
      'on-hold': 'On Hold',
      'closed': 'Closed',
      'pending-intake': 'Pending Intake',
      'billing-issue': 'Billing Issue',
      'vip-priority': 'VIP / Priority'
    };
    return labelMap[status] || 'Active';
  };

  const statusOptions = [
    { value: 'prospect', label: 'Prospect – someone who might become a client but hasn\'t signed yet.' },
    { value: 'active', label: 'Active – currently an ongoing client with open cases.' },
    { value: 'on-hold', label: 'On Hold – temporarily inactive (maybe paused case/work).' },
    { value: 'closed', label: 'Closed – relationship finished, no active cases.' },
    { value: 'pending-intake', label: 'Pending Intake – client signed up but hasn\'t been fully onboarded yet.' },
    { value: 'billing-issue', label: 'Billing Issue – client has outstanding invoices or disputes.' },
    { value: 'vip-priority', label: 'VIP / Priority – high-value or priority client.' }
  ];
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    }
  });
  const [updating, setUpdating] = useState(false);

  const fetchClient = useCallback(async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/clients/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Handle both formats: direct client object or wrapped in success response
        setClient(data.client || data);
      } else {
        console.error('Failed to fetch client');
      }
    } catch (error) {
      console.error('Error fetching client:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchDocuments = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/clients/${id}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Full response data:', data);
        console.log('Documents array:', data.documents);
        if (data.documents && data.documents.length > 0) {
          console.log('First document:', data.documents[0]);
          console.log('First document key:', data.documents[0].key);
        }
        setDocuments(data.documents || []);
      } else {
        console.error('Response not OK:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  useEffect(() => {
    if (activeTab === 'documents') {
      fetchDocuments();
    }
  }, [activeTab, fetchDocuments]);

  // Fetch linked cases when cases tab is active
  useEffect(() => {
    if (activeTab === 'cases' && client && (client.linked_cases || []).length > 0) {
      const fetchLinkedCases = async () => {
        setLoadingCases(true);
        try {
          const token = sessionStorage.getItem('accessToken');
          const response = await fetch(`${API_BASE}/cases`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            const allCases = data.cases || [];
            // Filter cases that are linked to this client
            const clientCases = allCases.filter(c => 
              (client.linked_cases || []).includes(c.id) ||
              c.clientId === client.id ||
              c.client_id === client.id ||
              c.client === client.id
            );
            setLinkedCases(clientCases);
          }
        } catch (error) {
          console.error('Error fetching linked cases:', error);
        } finally {
          setLoadingCases(false);
        }
      };
      fetchLinkedCases();
    }
  }, [activeTab, client]);

  // Populate edit form when client data loads
  useEffect(() => {
    if (client) {
      setEditForm({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        company_name: client.company_name || '',
        status: client.status || 'active',
        address: client.address || {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: ''
        }
      });
        // If notes is a string (legacy), convert to array
        if (typeof client.notes === 'string') {
          setNotes([{
            id: 'legacy-note',
            text: client.notes,
            timestamp: client.updated_at || client.created_at,
            created_at: client.created_at,
            updated_at: client.updated_at,
            created_by: { name: 'Unknown', email: 'unknown@law-ai.com' }
          }]);
        } else if (Array.isArray(client.notes)) {
          // Ensure all notes have creator info for backward compatibility
          const notesWithCreators = client.notes.map(note => ({
            ...note,
            created_by: note.created_by || { name: 'Unknown', email: 'unknown@law-ai.com' }
          }));
          setNotes(notesWithCreators);
        }
    }
  }, [client]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const token = sessionStorage.getItem('accessToken');

      // First, get a presigned URL for upload
      const presignResponse = await fetch(`${API_BASE}/s3/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          key: `clients/${id}/${Date.now()}_${file.name}`
        }),
      });

      if (presignResponse.ok) {
        const presignData = await presignResponse.json();

        // Upload file to S3
        const uploadResponse = await fetch(presignData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (uploadResponse.ok) {
          // Refresh documents list
          fetchDocuments();
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (docKey) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/s3/object`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ key: docKey }),
      });

      if (response.ok) {
        setDocuments(documents.filter(doc => doc.key !== docKey));
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...editForm,
          last_updated_by: getCurrentUser(),
          last_updated_at: new Date().toISOString()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setClient(data);
        setIsEditing(false); // Exit edit mode after successful update
      } else {
        console.error('Failed to update client');
      }
    } catch (error) {
      console.error('Error updating client:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setUpdating(true);

    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...client,
          status: newStatus,
          last_updated_by: getCurrentUser(),
          last_updated_at: new Date().toISOString()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setClient(data);
      } else {
        console.error('Failed to update client status');
      }
    } catch (error) {
      console.error('Error updating client status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;

    const noteData = {
      id: `note-${Date.now()}`,
      text: newNoteText.trim(),
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: getCurrentUser()
    };

    try {
      const token = sessionStorage.getItem('accessToken');
      const updatedNotes = [...notes, noteData];
      
      const response = await fetch(`${API_BASE}/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          notes: updatedNotes,
          last_updated_by: getCurrentUser(),
          last_updated_at: new Date().toISOString()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setClient(data);
        setNotes(updatedNotes);
        setNewNoteText('');
      } else {
        console.error('Failed to add note');
      }
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleEditNote = async (noteId, newText) => {
    if (!newText.trim()) return;

    try {
      const token = sessionStorage.getItem('accessToken');
      const updatedNotes = notes.map(note => 
        note.id === noteId 
          ? { ...note, text: newText.trim(), updated_at: new Date().toISOString(), updated_by: getCurrentUser() }
          : note
      );
      
      const response = await fetch(`${API_BASE}/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          notes: updatedNotes,
          last_updated_by: getCurrentUser(),
          last_updated_at: new Date().toISOString()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setClient(data);
        setNotes(updatedNotes);
        setEditingNoteId(null);
      } else {
        console.error('Failed to edit note');
      }
    } catch (error) {
      console.error('Error editing note:', error);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      const token = sessionStorage.getItem('accessToken');
      const updatedNotes = notes.filter(note => note.id !== noteId);
      
      const response = await fetch(`${API_BASE}/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          notes: updatedNotes,
          last_updated_by: getCurrentUser(),
          last_updated_at: new Date().toISOString()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setClient(data);
        setNotes(updatedNotes);
      } else {
        console.error('Failed to delete note');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleDeleteClient = async () => {
    const clientName = client.name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'this client';
    
    if (!window.confirm(`Are you sure you want to delete ${clientName}? This action cannot be undone.`)) {
      return;
    }

    if (!window.confirm('This will permanently delete the client and all associated data. Are you absolutely sure?')) {
      return;
    }

    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/clients/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Redirect to clients page after successful deletion
        window.location.href = '/clients';
      } else {
        const error = await response.json().catch(() => ({}));
        alert('Failed to delete client: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="flex justify-center items-center h-64">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Client Not Found</h1>
          <Link to="/clients" className="text-blue-600 hover:text-blue-800">
            ← Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="page-header mb-6 mt-8">
        <div className="flex items-center gap-6">
          <div className="avatar avatar-xl">
            <span className="avatar-initials">
              {(client.name || `${client.first_name || ''} ${client.last_name || ''}` || 'C').split(' ').filter(n => n).map(n => n[0]).join('').toUpperCase() || 'C'}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="page-title">{client.name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown Client'}</h1>
            <p className="page-description">{client.company_name || 'Individual Client'}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className={`status-badge ${getStatusClass(client.status)}`}>
                {getStatusLabel(client.status)}
              </span>
              {(client.created_at || client.createdAt) && (
                <span className="text-sm text-muted">
                  Client since {new Date(client.created_at || client.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDeleteClient}
            className="btn btn-outline text-red-600 hover:bg-red-50 border-red-300"
            title="Delete Client"
          >
            🗑️ Delete Client
          </button>
          <Link
            to="/clients"
            className="btn btn-outline"
          >
            ← Back to Clients
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-6">
        {[
          { id: 'overview', label: 'Overview', icon: '👤' },
          { id: 'cases', label: 'Cases', icon: '📋' },
          { id: 'billing', label: 'Billing', icon: '💰' },
          { id: 'documents', label: 'Documents', icon: '📄' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card">
        <div className="card-body">
          {activeTab === 'overview' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Client Information</h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn btn-primary"
                  >
                    ✏️ Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateClient}
                      disabled={updating}
                      className="btn btn-primary"
                    >
                      {updating ? 'Saving...' : '💾 Save Changes'}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="btn btn-outline"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {!isEditing ? (
                <div>
                  {/* Read-only view */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-3">Contact Details</h3>
                      <div className="space-y-2">
                        <p><span className="font-medium">Email:</span> {client.email}</p>
                        <p><span className="font-medium">Phone:</span> {client.phone || 'Not provided'}</p>
                        {client.date_of_birth && (
                          <p><span className="font-medium">Date of Birth:</span> {new Date(client.date_of_birth).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-3">Client Status</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="form-label">Status</label>
                          <select
                            value={client.status || 'active'}
                            onChange={handleStatusChange}
                            className="form-select"
                          >
                            {statusOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label.split(' – ')[0]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="text-sm text-gray-600">
                          {statusOptions.find(option => option.value === (client.status || 'active'))?.label.split(' – ')[1]}
                        </div>
                      </div>
                    </div>

                    {client.address && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Address</h3>
                        <div className="space-y-1">
                          <p>{client.address.street}</p>
                          <p>{client.address.city}, {client.address.state} {client.address.zip}</p>
                          <p>{client.address.country}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Edit view
                <form onSubmit={handleUpdateClient} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="form-label">Full Name *</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                        className="form-input"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Company Name</label>
                    <input
                      type="text"
                      value={editForm.company_name}
                      onChange={(e) => setEditForm({...editForm, company_name: e.target.value})}
                      className="form-input"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="form-label">Address</label>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editForm.address.street}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          address: {...editForm.address, street: e.target.value}
                        })}
                        className="form-input"
                        placeholder="Street Address"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={editForm.address.city}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            address: {...editForm.address, city: e.target.value}
                          })}
                          className="form-input"
                          placeholder="City"
                        />
                        <input
                          type="text"
                          value={editForm.address.state}
                          onChange={(e) => setEditForm({
                            ...editForm.address, state: e.target.value
                          })}
                          className="form-input"
                          placeholder="State"
                        />
                        <input
                          type="text"
                          value={editForm.address.zip}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            address: {...editForm.address, zip: e.target.value}
                          })}
                          className="form-input"
                          placeholder="ZIP Code"
                        />
                      </div>
                      <input
                        type="text"
                        value={editForm.address.country}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          address: {...editForm.address, country: e.target.value}
                        })}
                        className="form-input"
                        placeholder="Country"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Client Status</label>
                    <select
                      value={editForm.status || 'active'}
                      onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                      className="form-select"
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label.split(' – ')[0]}
                        </option>
                      ))}
                    </select>
                    <div className="text-sm text-gray-600 mt-1">
                      {statusOptions.find(option => option.value === (editForm.status || 'active'))?.label.split(' – ')[1]}
                    </div>
                  </div>
                </form>
              )}

              {/* Notes Section */}
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Notes</h3>

                {/* Display notes */}
                {notes.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {notes.map((note) => (
                      <div key={note.id} className="bg-gray-50 p-4 rounded-lg">
                        {editingNoteId === note.id ? (
                          <div className="space-y-2">
                            <textarea
                              defaultValue={note.text}
                              className="form-input w-full"
                              rows="3"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  const newText = e.target.value;
                                  handleEditNote(note.id, newText);
                                } else if (e.key === 'Escape') {
                                  setEditingNoteId(null);
                                }
                              }}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  const textarea = e.target.closest('.space-y-2').querySelector('textarea');
                                  handleEditNote(note.id, textarea.value);
                                }}
                                className="btn btn-sm btn-primary"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingNoteId(null)}
                                className="btn btn-sm btn-outline"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-gray-700 mb-2">{note.text}</p>
                            <div className="flex justify-between items-center text-sm text-gray-500">
                              <div>
                                <span>{new Date(note.timestamp).toLocaleString()}</span>
                                {note.created_by && (
                                  <span className="ml-2"> by  {note.created_by.name}</span>
                                )}
                                {note.updated_by && note.updated_by.name !== note.created_by?.name && (
                                  <span className="ml-2">(edited by  {note.updated_by.name})</span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingNoteId(note.id)}
                                  className="btn btn-sm btn-outline"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="btn btn-sm btn-danger"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Add new note */}
                <div className="border-t pt-4">
                  <div className="mb-2">
                    <label className="text-sm font-light text-gray-600 tracking-wide">Add a new note</label>
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="form-input flex-1"
                      rows="2"
                      placeholder="Type your note here..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddNote();
                        }
                      }}
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!newNoteText.trim()}
                      className="btn btn-primary self-end font-light tracking-wide"
                    >
                      Add Note
                    </button>
                  </div>
                </div>

                {notes.length === 0 && (
                  <p className="text-gray-500 mt-4">No notes yet. Add your first note above.</p>
                )}
              </div>

              {!isEditing && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>
                      Created: {new Date(client.created_at).toLocaleDateString()}
                      {client.created_by && <span> by {client.created_by.name}</span>}
                    </span>
                    {client.last_updated_at && client.last_updated_by && (
                      <span>
                        Last Updated: {new Date(client.last_updated_at).toLocaleDateString()}
                        <span> by {client.last_updated_by.name}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'cases' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Linked Cases</h2>
              {loadingCases ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading cases...</p>
                </div>
              ) : linkedCases.length > 0 ? (
                <div className="space-y-3">
                  {linkedCases.map((caseItem) => (
                    <div key={caseItem.id} className="card hover:shadow-md transition-shadow">
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{caseItem.title || `Case ${caseItem.id}`}</h3>
                            {caseItem.description && (
                              <p className="text-gray-600 text-sm mb-2">{caseItem.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                caseItem.status === 'Active' || caseItem.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : caseItem.status === 'Closed' || caseItem.status === 'closed'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {caseItem.status || 'Active'}
                              </span>
                              {caseItem.createdAt && (
                                <span>Created: {new Date(caseItem.createdAt).toLocaleDateString()}</span>
                              )}
                              {caseItem.documents && (
                                <span>📄 {caseItem.documents.length} doc{caseItem.documents.length !== 1 ? 's' : ''}</span>
                              )}
                            </div>
                          </div>
                          <Link
                            to={`/case/${caseItem.id}`}
                            className="btn btn-primary btn-sm ml-4"
                          >
                            View Case
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-3">📁</div>
                  <p>No cases linked to this client yet.</p>
                  <Link to="/cases" className="btn btn-primary mt-4">
                    Create New Case
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'billing' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Billing & Payments</h2>
              
              {(client.payments || []).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-3">💰</div>
                  <p>No payments yet</p>
                  <p className="text-sm mt-2">Payments made by this client will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Payment Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="card bg-green-50 border-green-200">
                      <div className="p-4">
                        <p className="text-sm text-green-700 font-medium">Total Paid</p>
                        <p className="text-2xl font-bold text-green-900">
                          ${((client.payments || [])
                            .filter(p => p.status === 'paid' || p.status === 'complete')
                            .reduce((sum, p) => sum + (p.amount || 0), 0) / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="card bg-blue-50 border-blue-200">
                      <div className="p-4">
                        <p className="text-sm text-blue-700 font-medium">Total Payments</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {(client.payments || []).length}
                        </p>
                      </div>
                    </div>
                    <div className="card bg-purple-50 border-purple-200">
                      <div className="p-4">
                        <p className="text-sm text-purple-700 font-medium">Last Payment</p>
                        <p className="text-lg font-bold text-purple-900">
                          {(client.payments || []).length > 0 
                            ? new Date(Math.max(...(client.payments || []).map(p => new Date(p.paidAt || p.createdAt)))).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment History */}
                  <h3 className="text-lg font-semibold mb-3">Payment History</h3>
                  <div className="space-y-3">
                    {(client.payments || [])
                      .sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))
                      .map((payment, index) => (
                        <div key={payment.id || index} className="card hover:shadow-md transition-shadow">
                          <div className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    payment.status === 'paid' || payment.status === 'complete' 
                                      ? 'bg-green-100 text-green-800' 
                                      : payment.status === 'pending' 
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {payment.status || 'N/A'}
                                  </span>
                                  <span className="text-sm text-gray-600 font-medium">
                                    {payment.paymentType || 'Payment'}
                                  </span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900 mb-1">
                                  ${((payment.amount || 0) / 100).toFixed(2)}
                                </p>
                                {payment.caseId && (
                                  <p className="text-sm text-gray-600 mb-1">
                                    Case: {payment.caseTitle || payment.caseId}
                                  </p>
                                )}
                                <p className="text-sm text-gray-500">
                                  Paid on {new Date(payment.paidAt || payment.createdAt).toLocaleDateString()} at {new Date(payment.paidAt || payment.createdAt).toLocaleTimeString()}
                                </p>
                                {payment.sessionId && (
                                  <p className="text-xs text-gray-400 mt-1 font-mono">
                                    Session: {payment.sessionId.substring(0, 20)}...
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Documents</h2>
                <div>
                  <label className="btn btn-primary cursor-pointer">
                    {uploading ? 'Uploading...' : '📎 Upload Document'}
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </label>
                </div>
              </div>

              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc, index) => {
                    console.log(`Rendering document ${index}:`, doc);
                    console.log(`Document key: "${doc.key}"`);
                    return (
                    <div key={doc.key || `doc-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {doc.file_type.includes('pdf') ? '📄' :
                           doc.file_type.includes('image') ? '🖼️' : '📝'}
                        </span>
                        <div>
                          <p className="font-medium">{doc.filename}</p>
                          <p className="text-sm text-gray-500">
                            {(doc.size / 1024).toFixed(1)} KB • {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`${API_BASE}/s3/download?key=${encodeURIComponent(doc.key)}&t=${sessionStorage.getItem('accessToken')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline"
                          onClick={() => console.log('Downloading document:', doc)}
                        >
                          Download
                        </a>
                        <button
                          onClick={() => deleteDocument(doc.key)}
                          className="btn btn-sm btn-danger"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No documents uploaded yet.</p>
                  <p className="text-sm mt-2">Upload contracts, IDs, or other client documents.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientProfile;