import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://phd54f79fk.execute-api.us-east-1.amazonaws.com/dev';

const ClientsPage = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    notes: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    }
  });

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      } else {
        console.error('Failed to fetch clients');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch clients on component mount
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleAddClient = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newClient),
      });

      if (response.ok) {
        const data = await response.json();
        setClients([...clients, data.client]);
        setShowAddModal(false);
        setNewClient({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          company_name: '',
          notes: '',
          address: {
            street: '',
            city: '',
            state: '',
            zip: '',
            country: ''
          }
        });
      } else {
        console.error('Failed to add client');
      }
    } catch (error) {
      console.error('Error adding client:', error);
    }
  };

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.company_name && client.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container main-content">
      <div className="page-header">
        <h1 className="page-title">Clients</h1>
        <p className="page-description">Manage your client directory and relationships.</p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          <span>+</span>
          Add Client
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search clients by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input w-full"
              />
            </div>
            <select className="form-select">
              <option>All Clients</option>
              <option>Active Cases</option>
              <option>Recent Activity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clients Table */}
            {/* Clients Table */}
      <div className="card">
        <div className="card-body">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-sm">
                          <span className="avatar-initials">
                            {client.first_name[0]}{client.last_name[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{client.first_name} {client.last_name}</div>
                          <div className="text-sm text-muted">Client ID: {client.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{client.email}</td>
                    <td>{client.company || '-'}</td>
                    <td>{client.phone || '-'}</td>
                    <td>
                      <span className={`status-badge ${client.status === 'active' ? 'active' : 'inactive'}`}>
                        {client.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="btn-table-action btn-primary"
                          title="View client details"
                        >
                          <span className="mr-1">👁️</span>
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Add New Client</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddClient} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      required
                      value={newClient.first_name}
                      onChange={(e) => setNewClient({...newClient, first_name: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={newClient.last_name}
                      onChange={(e) => setNewClient({...newClient, last_name: e.target.value})}
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    required
                    value={newClient.email}
                    onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Company Name</label>
                  <input
                    type="text"
                    value={newClient.company_name}
                    onChange={(e) => setNewClient({...newClient, company_name: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Notes</label>
                  <textarea
                    value={newClient.notes}
                    onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                    rows={3}
                    className="form-textarea"
                  />
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Add Client
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;
