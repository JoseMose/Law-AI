const API_BASE = process.env.REACT_APP_API_URL || 'https://sb7snqtgc3.execute-api.us-east-1.amazonaws.com/dev';

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const parseJson = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return {};
  }
  return response.json();
};

const request = async (path, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await parseJson(response);

  if (!response.ok) {
    const error = new Error(data?.error || 'Request failed');
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
};

export const fetchContacts = async () => {
  const data = await request('/auth/crm/contacts');
  return data.contacts || [];
};

export const createContact = async (payload) => {
  const data = await request('/auth/crm/contacts', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return data.contact;
};

export const updateContact = async (contactId, payload) => {
  const data = await request(`/auth/crm/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  return data.contact;
};

export const fetchOrganizations = async () => {
  const data = await request('/auth/crm/organizations');
  return data.organizations || [];
};

export const createOrganization = async (payload) => {
  const data = await request('/auth/crm/organizations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return data.organization;
};

export const updateOrganization = async (organizationId, payload) => {
  const data = await request(`/auth/crm/organizations/${organizationId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  return data.organization;
};

export const fetchInteractions = async () => {
  const data = await request('/auth/crm/interactions');
  return data.interactions || [];
};

export const createInteraction = async (payload) => {
  const data = await request('/auth/crm/interactions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return data.interaction;
};
