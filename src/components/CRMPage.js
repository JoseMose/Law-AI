import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchContacts,
  createContact,
  updateContact,
  fetchOrganizations,
  createOrganization,
  fetchInteractions,
  createInteraction
} from '../services/crmService';

const CRM_PIPELINE_STATUSES = [
  { value: 'lead', label: 'Lead', color: 'bg-gray-500' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
  { value: 'qualified', label: 'Qualified', color: 'bg-indigo-500' },
  { value: 'proposal-sent', label: 'Proposal Sent', color: 'bg-purple-500' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-yellow-500' },
  { value: 'closed-won', label: 'Closed - Won', color: 'bg-green-500' },
  { value: 'closed-lost', label: 'Closed - Lost', color: 'bg-red-500' },
  { value: 'nurture', label: 'Nurturing', color: 'bg-teal-500' }
];

const CRM_PIPELINE_LABELS = CRM_PIPELINE_STATUSES.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const CRM_PIPELINE_COLORS = CRM_PIPELINE_STATUSES.reduce((acc, item) => {
  acc[item.value] = item.color;
  return acc;
}, {});

const getPipelineStatusLabel = (status) => {
  if (CRM_PIPELINE_LABELS[status]) return CRM_PIPELINE_LABELS[status];
  if (!status) return 'Lead';
  return status.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
};

const getPipelineStatusColor = (status) => {
  return CRM_PIPELINE_COLORS[status] || 'bg-gray-500';
};

const INTERACTION_TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Note' },
  { value: 'task', label: 'Task' }
];

const defaultContact = {
  name: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  title: '',
  organizationId: '',
  organizationName: '',
  company_name: '',
  crmStatus: 'lead',
  tags: '',
  notes: ''
};

const defaultOrganization = {
  name: '',
  industry: '',
  size: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  notes: ''
};

const defaultInteraction = {
  type: 'note',
  subject: '',
  contactId: '',
  organizationId: '',
  caseId: '',
  date: new Date().toISOString().slice(0, 10),
  notes: ''
};

const CRMPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('clients');
  const [contacts, setContacts] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showOrganizationModal, setShowOrganizationModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [newContact, setNewContact] = useState(defaultContact);
  const [newOrganization, setNewOrganization] = useState(defaultOrganization);
  const [newInteraction, setNewInteraction] = useState(defaultInteraction);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [contactsData, organizationsData, interactionsData] = await Promise.all([
          fetchContacts(),
          fetchOrganizations(),
          fetchInteractions()
        ]);
        setContacts(contactsData);
        setOrganizations(organizationsData);
        setInteractions(interactionsData);
      } catch (err) {
        console.error('Failed to load CRM data:', err);
        setError('Unable to load CRM data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [successMessage]);

  const organizationMap = useMemo(() => {
    const map = new Map();
    organizations.forEach((org) => {
      map.set(org.id, org);
    });
    return map;
  }, [organizations]);

  const recentInteractions = useMemo(() => {
    return [...interactions]
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
      .slice(0, 10)
      .map((interaction) => {
        const contact = contacts.find((c) => c.id === interaction.contactId);
        const organization = organizationMap.get(interaction.organizationId);
        return {
          ...interaction,
          contactName: contact?.name,
          organizationName: organization?.name
        };
      });
  }, [contacts, interactions, organizationMap]);

  const pipelineMetrics = useMemo(() => {
    const totals = contacts.reduce((acc, contact) => {
      const status = (contact.crmStatus || contact.pipelineStatus || 'lead').toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return CRM_PIPELINE_STATUSES.map(({ value, label }) => ({
      value,
      label,
      count: totals[value] || 0
    }));
  }, [contacts]);  const contactCountByOrg = useMemo(() => {
    return organizations.map((org) => ({
      id: org.id,
      name: org.name,
      count: contacts.filter((contact) => contact.organizationId === org.id).length
    }));
  }, [contacts, organizations]);

  const handleContactSubmit = async (event) => {
    event.preventDefault();
    try {
      const formTags = newContact.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      const selectedOrganizationName = newContact.organizationId
        ? organizationMap.get(newContact.organizationId)?.name || ''
        : '';

      const payload = {
        ...newContact,
        tags: formTags,
        organizationName: selectedOrganizationName || newContact.organizationName || newContact.company_name || '',
        company_name: newContact.company_name || selectedOrganizationName || newContact.organizationName || '',
        pipelineStatus: newContact.crmStatus,
        crmStatus: newContact.crmStatus
      };

      const created = await createContact(payload);
      setContacts((prev) => [...prev, created]);
      setSuccessMessage('Client added successfully.');
      setShowContactModal(false);
      setNewContact(defaultContact);
    } catch (err) {
      console.error('Failed to create contact:', err);
      setError(err.message || 'Failed to create client.');
    }
  };

  const handleOrganizationSubmit = async (event) => {
    event.preventDefault();
    try {
      const created = await createOrganization(newOrganization);
      setOrganizations((prev) => [...prev, created]);
      setSuccessMessage('Organization added successfully.');
      setShowOrganizationModal(false);
      setNewOrganization(defaultOrganization);
    } catch (err) {
      console.error('Failed to create organization:', err);
      setError(err.message || 'Failed to create organization.');
    }
  };

  const handleInteractionSubmit = async (event) => {
    event.preventDefault();
    try {
      const isoDate = newInteraction.date
        ? new Date(newInteraction.date).toISOString()
        : new Date().toISOString();

      const payload = {
        ...newInteraction,
        date: isoDate
      };

      const created = await createInteraction(payload);
      setInteractions((prev) => [...prev, created]);
      setSuccessMessage('Interaction logged successfully.');
      setShowInteractionModal(false);
      setNewInteraction({ ...defaultInteraction, date: new Date().toISOString().slice(0, 10) });
    } catch (err) {
      console.error('Failed to log interaction:', err);
      setError(err.message || 'Failed to log interaction.');
    }
  };

  const renderEmptyState = (message, action) => (
    <div className="empty-state">
      <div className="empty-state-icon">📓</div>
      <h3>{message}</h3>
      {action}
    </div>
  );

  const renderClientsTab = () => {
    if (contacts.length === 0) {
      return renderEmptyState('No clients yet', (
        <button className="btn btn-primary mt-4" onClick={() => setShowContactModal(true)}>
          Add your first client
        </button>
      ));
    }

    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Company</th>
              <th>Phone</th>
              <th>Pipeline Stage</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((client) => {
              const initials = (client.name || '')
                .split(' ')
                .filter(Boolean)
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'CL';

              const companyName = client.company_name
                || client.company
                || client.organizationName
                || organizationMap.get(client.organizationId)?.name
                || '-';

              return (
                <tr key={client.id || client.email}>
                  <td>
                    <div className="flex items-center gap-6">
                      <div className="avatar avatar-sm">
                        <span className="avatar-initials">{initials}</span>
                      </div>
                      <div>
                        <div className="font-medium">{client.name || 'Unnamed Client'}</div>
                        {client.id && (
                          <div className="text-sm text-muted">Client ID: {client.id}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{client.email || '-'}</td>
                  <td>{companyName}</td>
                  <td>{client.phone || '-'}</td>
                  <td>
                    <select
                      value={client.crmStatus || client.pipelineStatus || 'lead'}
                      onChange={async (e) => {
                        try {
                          const updated = await updateContact(client.id, { crmStatus: e.target.value });
                          setContacts((prev) => 
                            prev.map((c) => c.id === client.id ? { ...c, crmStatus: updated.crmStatus } : c)
                          );
                          setSuccessMessage('Pipeline stage updated successfully.');
                        } catch (err) {
                          setError('Failed to update pipeline stage.');
                        }
                      }}
                      className={`form-select text-xs font-medium text-white border-0 ${getPipelineStatusColor(client.crmStatus || client.pipelineStatus || 'lead')}`}
                      style={{ 
                        padding: '0.25rem 1.75rem 0.25rem 0.625rem',
                        borderRadius: '9999px',
                        appearance: 'none',
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%23fff\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")',
                        backgroundPosition: 'right 0.25rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.25em 1.25em',
                        cursor: 'pointer'
                      }}
                    >
                      {CRM_PIPELINE_STATUSES.map((status) => (
                        <option key={status.value} value={status.value} style={{ color: '#000' }}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    {client.lastInteractionAt && (
                      <div className="text-xs text-muted mt-1">
                        Last touch {new Date(client.lastInteractionAt).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="table-actions">
                      {client.id ? (
                        <button
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="btn-table-action btn-primary"
                          title="View client details"
                        >
                          <span className="mr-1">👁️</span>
                          View
                        </button>
                      ) : (
                        <span className="text-xs text-muted">No profile</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderOrganizationsTab = () => {
    if (organizations.length === 0) {
      return renderEmptyState('No organizations yet', (
        <button className="btn btn-primary mt-4" onClick={() => setShowOrganizationModal(true)}>
          Add your first organization
        </button>
      ));
    }

    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Industry</th>
              <th>Size</th>
              <th>Primary Contact</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Total Clients</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => {
              const primaryContact = contacts.find((contact) => contact.id === org.primaryContactId);
              const summary = contactCountByOrg.find((item) => item.id === org.id);
              return (
                <tr key={org.id}>
                  <td>
                    <div className="font-medium">{org.name}</div>
                    <div className="text-sm text-muted">{org.website || '-'}</div>
                  </td>
                  <td>{org.industry || '-'}</td>
                  <td>{org.size || '-'}</td>
                  <td>{primaryContact?.name || '-'}</td>
                  <td>{org.email || '-'}</td>
                  <td>{org.phone || '-'}</td>
                  <td>{summary?.count || 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderInteractionsTab = () => {
    if (recentInteractions.length === 0) {
      return renderEmptyState('No interactions logged yet', (
        <button className="btn btn-primary mt-4" onClick={() => setShowInteractionModal(true)}>
          Log an interaction
        </button>
      ));
    }

    return (
      <div className="space-y-4">
        {recentInteractions.map((interaction) => (
          <div key={interaction.id} className="card">
            <div className="card-body p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{interaction.subject}</span>
                    <span>•</span>
                    <span>{new Date(interaction.date || interaction.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-gray-700">{interaction.notes || 'No notes provided.'}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                    {interaction.type && (
                      <span className="px-2 py-1 bg-gray-100 rounded-full uppercase tracking-wide">
                        {interaction.type}
                      </span>
                    )}
                    {interaction.contactName && (
                      <span>Client: {interaction.contactName}</span>
                    )}
                    {interaction.organizationName && (
                      <span>Organization: {interaction.organizationName}</span>
                    )}
                    {interaction.caseId && (
                      <span>Case: {interaction.caseId}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container main-content">
        <div className="flex items-center justify-center h-96">
          <div className="loading-spinner"></div>
          <span className="ml-3 text-gray-600">Loading CRM workspace…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container main-content">
      <div className="page-header">
        <h1 className="page-title">CRM Workspace</h1>
        <p className="page-description">
          Track every relationship across prospects, active clients, and firm partners.
        </p>
      </div>

      {(error || successMessage) && (
        <div className={`alert ${error ? 'alert-error' : 'alert-success'}`}>
          {error || successMessage}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Pipeline</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {pipelineMetrics.filter(m => m.count > 0 || ['lead', 'contacted', 'qualified', 'closed-won'].includes(m.value)).map((metric) => (
            <div key={metric.value} className="card">
              <div className="card-body p-4">
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white mb-2 ${getPipelineStatusColor(metric.value)}`}>
                  {metric.label}
                </div>
                <div className="text-2xl font-bold text-gray-900">{metric.count}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card mb-6">
        <div className="card-body p-4">
          <div className="tabs">
            <button
              type="button"
              className={`tab ${activeTab === 'clients' ? 'tab-active' : 'tab-inactive'}`}
              onClick={() => setActiveTab('clients')}
            >
              <span className="tab-icon">👥</span>
              <span className="tab-label">Clients</span>
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'organizations' ? 'tab-active' : 'tab-inactive'}`}
              onClick={() => setActiveTab('organizations')}
            >
              <span className="tab-icon">🏢</span>
              <span className="tab-label">Organizations</span>
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'interactions' ? 'tab-active' : 'tab-inactive'}`}
              onClick={() => setActiveTab('interactions')}
            >
              <span className="tab-icon">🗓️</span>
              <span className="tab-label">Activity</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mb-6">
        {activeTab === 'clients' && (
          <button className="btn btn-primary" onClick={() => setShowContactModal(true)}>
            + New Client
          </button>
        )}
        {activeTab === 'organizations' && (
          <button className="btn btn-primary" onClick={() => setShowOrganizationModal(true)}>
            + New Organization
          </button>
        )}
        {activeTab === 'interactions' && (
          <button className="btn btn-primary" onClick={() => setShowInteractionModal(true)}>
            + Log Interaction
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-body p-6">
          {activeTab === 'clients' && renderClientsTab()}
          {activeTab === 'organizations' && renderOrganizationsTab()}
          {activeTab === 'interactions' && renderInteractionsTab()}
        </div>
      </div>

      {showContactModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Add Client</h3>
              <button className="modal-close" onClick={() => setShowContactModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newContact.name}
                    onChange={(event) => setNewContact({ ...newContact, name: event.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      value={newContact.email}
                      onChange={(event) => setNewContact({ ...newContact, email: event.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      value={newContact.phone}
                      onChange={(event) => setNewContact({ ...newContact, phone: event.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Company Name</label>
                  <input
                    type="text"
                    value={newContact.company_name}
                    onChange={(event) => setNewContact({ ...newContact, company_name: event.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Title</label>
                    <input
                      type="text"
                      value={newContact.title}
                      onChange={(event) => setNewContact({ ...newContact, title: event.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Pipeline Stage</label>
                    <select
                      value={newContact.crmStatus}
                      onChange={(event) => setNewContact({ ...newContact, crmStatus: event.target.value })}
                      className="form-select"
                    >
                      {CRM_PIPELINE_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Linked Organization (optional)</label>
                  <select
                    value={newContact.organizationId}
                    onChange={(event) => setNewContact({ ...newContact, organizationId: event.target.value })}
                    className="form-select"
                  >
                    <option value="">Unassigned</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={newContact.tags}
                    onChange={(event) => setNewContact({ ...newContact, tags: event.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Notes</label>
                  <textarea
                    rows={3}
                    value={newContact.notes}
                    onChange={(event) => setNewContact({ ...newContact, notes: event.target.value })}
                    className="form-textarea"
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={() => setShowContactModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Client
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showOrganizationModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Add Organization</h3>
              <button className="modal-close" onClick={() => setShowOrganizationModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleOrganizationSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={newOrganization.name}
                    onChange={(event) => setNewOrganization({ ...newOrganization, name: event.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Industry</label>
                    <input
                      type="text"
                      value={newOrganization.industry}
                      onChange={(event) => setNewOrganization({ ...newOrganization, industry: event.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Company Size</label>
                    <input
                      type="text"
                      value={newOrganization.size}
                      onChange={(event) => setNewOrganization({ ...newOrganization, size: event.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      value={newOrganization.email}
                      onChange={(event) => setNewOrganization({ ...newOrganization, email: event.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      value={newOrganization.phone}
                      onChange={(event) => setNewOrganization({ ...newOrganization, phone: event.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Website</label>
                  <input
                    type="url"
                    value={newOrganization.website}
                    onChange={(event) => setNewOrganization({ ...newOrganization, website: event.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Notes</label>
                  <textarea
                    rows={3}
                    value={newOrganization.notes}
                    onChange={(event) => setNewOrganization({ ...newOrganization, notes: event.target.value })}
                    className="form-textarea"
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={() => setShowOrganizationModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Organization
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showInteractionModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Log Interaction</h3>
              <button className="modal-close" onClick={() => setShowInteractionModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleInteractionSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Type</label>
                    <select
                      value={newInteraction.type}
                      onChange={(event) => setNewInteraction({ ...newInteraction, type: event.target.value })}
                      className="form-select"
                    >
                      {INTERACTION_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      value={newInteraction.date}
                      onChange={(event) => setNewInteraction({ ...newInteraction, date: event.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Subject</label>
                  <input
                    type="text"
                    value={newInteraction.subject}
                    onChange={(event) => setNewInteraction({ ...newInteraction, subject: event.target.value })}
                    className="form-input"
                    placeholder="Follow-up call, contract review, etc."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Client</label>
                    <select
                      value={newInteraction.contactId}
                      onChange={(event) => setNewInteraction({ ...newInteraction, contactId: event.target.value })}
                      className="form-select"
                    >
                      <option value="">Unassigned</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>{contact.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Organization</label>
                    <select
                      value={newInteraction.organizationId}
                      onChange={(event) => setNewInteraction({ ...newInteraction, organizationId: event.target.value })}
                      className="form-select"
                    >
                      <option value="">Unassigned</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Linked Case (optional)</label>
                  <input
                    type="text"
                    value={newInteraction.caseId}
                    onChange={(event) => setNewInteraction({ ...newInteraction, caseId: event.target.value })}
                    className="form-input"
                    placeholder="case-123"
                  />
                </div>
                <div>
                  <label className="form-label">Notes</label>
                  <textarea
                    rows={4}
                    value={newInteraction.notes}
                    onChange={(event) => setNewInteraction({ ...newInteraction, notes: event.target.value })}
                    className="form-textarea"
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={() => setShowInteractionModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Log Interaction
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

export default CRMPage;
