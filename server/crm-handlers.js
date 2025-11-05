const { createResponse } = require('./helpers');
const {
  loadClientsFromS3,
  saveClientsToS3,
  loadCRMOrganizationsFromS3,
  saveCRMOrganizationsToS3,
  loadCRMInteractionsFromS3,
  saveCRMInteractionsToS3
} = require('./s3-operations');

const parseJsonBody = (event) => {
  if (!event || !event.body) return {};
  try {
    let bodyStr = event.body;
    if (event.isBase64Encoded) {
      bodyStr = Buffer.from(event.body, 'base64').toString('utf-8');
    }
    return JSON.parse(bodyStr || '{}');
  } catch (error) {
    throw new Error('Invalid JSON payload');
  }
};

const normalizePath = (path) => {
  if (!path) {
    return '/';
  }

  const ensureLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  const segments = ensureLeadingSlash.split('/').filter(Boolean);

  while (segments.length > 0 && (segments[0] === 'dev' || segments[0] === 'auth')) {
    segments.shift();
  }

  if (segments.length === 0) {
    return '/';
  }

  return `/${segments.join('/')}`;
};

const extractClientDataset = (maybeClients) => {
  if (Array.isArray(maybeClients)) {
    return {
      list: maybeClients,
      save: async (updated) => saveClientsToS3(updated)
    };
  }

  if (maybeClients && Array.isArray(maybeClients.clients)) {
    return {
      list: maybeClients.clients,
      save: async (updated) => saveClientsToS3({ ...maybeClients, clients: updated })
    };
  }

  return {
    list: [],
    save: async (updated) => saveClientsToS3(updated)
  };
};

const generateId = (prefix) => {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${random}`;
};

const coerceTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter(Boolean);
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

const splitFullName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') {
    return { first: '', last: '' };
  }
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) {
    return { first: '', last: '' };
  }
  if (parts.length === 1) {
    return { first: parts[0], last: '' };
  }
  const first = parts.shift();
  return { first, last: parts.join(' ') };
};

const deriveDisplayName = (record) => {
  if (record.name && record.name.trim()) return record.name.trim();
  if (record.full_name && record.full_name.trim()) return record.full_name.trim();
  const first = record.firstName || record.first_name || '';
  const last = record.lastName || record.last_name || '';
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  if (record.email) return record.email;
  return 'Unnamed Contact';
};

const normalizeClientRecord = (client) => {
  if (!client) return null;
  const name = deriveDisplayName(client);
  const { first, last } = splitFullName(name);

  const normalized = {
    ...client,
    id: client.id || generateId('client'),
    name,
    firstName: client.firstName || client.first_name || first || null,
    lastName: client.lastName || client.last_name || last || null,
    first_name: client.firstName || client.first_name || first || null,
    last_name: client.lastName || client.last_name || last || null,
    status: client.status || 'active',
    crmStatus: client.crmStatus || client.pipelineStatus || 'lead',
    pipelineStatus: client.pipelineStatus || client.crmStatus || 'lead',
    tags: coerceTags(client.tags || client.crmTags),
    company_name: client.company_name || client.company || null,
    organizationName: client.organizationName || client.company_name || null,
    organizationId: client.organizationId || null,
    owner: client.owner || 'Unassigned',
    lastInteractionAt: client.lastInteractionAt || client.last_interaction_at || null,
    createdAt: client.createdAt || client.created_at || new Date().toISOString(),
    updatedAt: client.updatedAt || client.updated_at || client.createdAt || new Date().toISOString()
  };

  if (!normalized.email && client.contactEmail) {
    normalized.email = client.contactEmail;
  }

  return normalized;
};

const buildClientRecord = (payload) => {
  const now = new Date().toISOString();
  const name = deriveDisplayName(payload);
  const { first, last } = splitFullName(name);

  const organizationName = payload.organizationName || payload.company_name || payload.company || null;

  return {
    id: generateId('client'),
    name,
    firstName: payload.firstName || first || null,
    lastName: payload.lastName || last || null,
    first_name: payload.firstName || first || null,
    last_name: payload.lastName || last || null,
    email: payload.email || null,
    phone: payload.phone || null,
    title: payload.title || null,
    organizationId: payload.organizationId || null,
    organizationName,
    company_name: organizationName,
    status: payload.status || 'active',
    crmStatus: payload.crmStatus || payload.pipelineStatus || 'lead',
    pipelineStatus: payload.pipelineStatus || payload.crmStatus || 'lead',
    tags: coerceTags(payload.tags),
    owner: payload.owner || 'Unassigned',
    notes: payload.notes || '',
    address: payload.address || null,
    lastInteractionAt: payload.lastInteractionAt || null,
    createdAt: now,
    updatedAt: now
  };
};

const mergeClientRecord = (existing, payload) => {
  const normalizedExisting = normalizeClientRecord(existing);
  const merged = {
    ...normalizedExisting,
    ...payload
  };

  const tags = payload.tags !== undefined ? coerceTags(payload.tags) : normalizedExisting.tags;
  merged.tags = tags;

  const organizationName = payload.organizationName
    || payload.company_name
    || merged.organizationName
    || merged.company_name
    || null;

  merged.organizationName = organizationName;
  merged.company_name = organizationName;
  merged.status = payload.status || normalizedExisting.status || 'active';
  merged.crmStatus = payload.crmStatus || payload.pipelineStatus || normalizedExisting.crmStatus || 'lead';
  merged.pipelineStatus = payload.pipelineStatus || payload.crmStatus || normalizedExisting.pipelineStatus || 'lead';
  merged.owner = payload.owner || normalizedExisting.owner || 'Unassigned';
  merged.lastInteractionAt = payload.lastInteractionAt || normalizedExisting.lastInteractionAt || null;

  const name = deriveDisplayName(merged);
  const { first, last } = splitFullName(name);
  merged.name = name;
  merged.firstName = payload.firstName || payload.first_name || merged.firstName || first || null;
  merged.lastName = payload.lastName || payload.last_name || merged.lastName || last || null;
  merged.first_name = merged.firstName;
  merged.last_name = merged.lastName;

  merged.updatedAt = new Date().toISOString();

  return merged;
};

const handleContactsCollection = async (method, event) => {
  if (method === 'GET') {
    const rawClients = await loadClientsFromS3();
    const dataset = extractClientDataset(rawClients);
    const normalized = dataset.list.map(normalizeClientRecord).filter(Boolean);
    return createResponse(200, {
      success: true,
      contacts: normalized,
      total: normalized.length
    });
  }

  if (method === 'POST') {
    let payload;
    try {
      payload = parseJsonBody(event);
    } catch (error) {
      return createResponse(400, { success: false, error: error.message });
    }

    if (!payload || (!payload.email && !payload.name && !payload.firstName)) {
      return createResponse(400, {
        success: false,
        error: 'Contact requires at least a name or email.'
      });
    }

    const rawClients = await loadClientsFromS3();
    const dataset = extractClientDataset(rawClients);
    const newClient = buildClientRecord(payload);
    dataset.list.push(newClient);
    await dataset.save(dataset.list);

    return createResponse(201, {
      success: true,
      contact: normalizeClientRecord(newClient),
      message: 'Contact created successfully.'
    });
  }

  return createResponse(405, { success: false, error: 'Method not allowed for contacts.' });
};

const handleContactById = async (method, contactId, event) => {
  const rawClients = await loadClientsFromS3();
  const dataset = extractClientDataset(rawClients);
  const clients = dataset.list;
  const targetIndex = clients.findIndex((c) => c.id === contactId);

  if (targetIndex === -1) {
    return createResponse(404, { success: false, error: 'Contact not found.' });
  }

  if (method === 'GET') {
    return createResponse(200, { success: true, contact: normalizeClientRecord(clients[targetIndex]) });
  }

  if (method === 'PUT' || method === 'PATCH') {
    let payload;
    try {
      payload = parseJsonBody(event);
    } catch (error) {
      return createResponse(400, { success: false, error: error.message });
    }

    const merged = mergeClientRecord(clients[targetIndex], payload);
    clients[targetIndex] = merged;
    await dataset.save(clients);

    return createResponse(200, {
      success: true,
      contact: normalizeClientRecord(merged),
      message: 'Contact updated successfully.'
    });
  }

  if (method === 'DELETE') {
  clients.splice(targetIndex, 1);
  await dataset.save(clients);
    return createResponse(200, { success: true, message: 'Contact removed.' });
  }

  return createResponse(405, { success: false, error: 'Method not allowed for contact record.' });
};

const handleOrganizationsCollection = async (method, event) => {
  if (method === 'GET') {
    const organizations = await loadCRMOrganizationsFromS3();
    return createResponse(200, {
      success: true,
      organizations,
      total: organizations.length
    });
  }

  if (method === 'POST') {
    const payload = parseJsonBody(event);
    if (!payload || !payload.name) {
      return createResponse(400, { success: false, error: 'Organization name is required.' });
    }

    const now = new Date().toISOString();
    const organizations = await loadCRMOrganizationsFromS3();

    const newOrganization = {
      id: generateId('org'),
      name: payload.name,
      industry: payload.industry || null,
      size: payload.size || null,
      email: payload.email || null,
      phone: payload.phone || null,
      website: payload.website || null,
      address: payload.address || null,
      notes: payload.notes || '',
      primaryContactId: payload.primaryContactId || null,
      createdAt: now,
      updatedAt: now
    };

    organizations.push(newOrganization);
    await saveCRMOrganizationsToS3(organizations);

    return createResponse(201, {
      success: true,
      organization: newOrganization,
      message: 'Organization created successfully.'
    });
  }

  return createResponse(405, { success: false, error: 'Method not allowed for organizations.' });
};

const handleOrganizationById = async (method, organizationId, event) => {
  const organizations = await loadCRMOrganizationsFromS3();
  const targetIndex = organizations.findIndex((org) => org.id === organizationId);

  if (targetIndex === -1) {
    return createResponse(404, { success: false, error: 'Organization not found.' });
  }

  if (method === 'GET') {
    return createResponse(200, { success: true, organization: organizations[targetIndex] });
  }

  if (method === 'PUT' || method === 'PATCH') {
    const payload = parseJsonBody(event);
    const updatedOrganization = {
      ...organizations[targetIndex],
      ...payload,
      updatedAt: new Date().toISOString()
    };
    organizations[targetIndex] = updatedOrganization;
    await saveCRMOrganizationsToS3(organizations);

    return createResponse(200, {
      success: true,
      organization: updatedOrganization,
      message: 'Organization updated successfully.'
    });
  }

  if (method === 'DELETE') {
    organizations.splice(targetIndex, 1);
    await saveCRMOrganizationsToS3(organizations);
    return createResponse(200, { success: true, message: 'Organization removed.' });
  }

  return createResponse(405, { success: false, error: 'Method not allowed for organization record.' });
};

const handleInteractionsCollection = async (method, event) => {
  if (method === 'GET') {
    const interactions = await loadCRMInteractionsFromS3();
    return createResponse(200, {
      success: true,
      interactions,
      total: interactions.length
    });
  }

  if (method === 'POST') {
    const payload = parseJsonBody(event);
    const now = new Date().toISOString();

    if (!payload || (!payload.subject && !payload.notes)) {
      return createResponse(400, { success: false, error: 'Interaction requires a subject or notes.' });
    }

    const interactions = await loadCRMInteractionsFromS3();
    const rawClients = await loadClientsFromS3();
    const clientDataset = extractClientDataset(rawClients);

    const newInteraction = {
      id: generateId('interaction'),
      type: payload.type || 'note',
      subject: payload.subject || 'Relationship touchpoint',
      contactId: payload.contactId || null,
      organizationId: payload.organizationId || null,
      caseId: payload.caseId || null,
      date: payload.date || now,
      notes: payload.notes || '',
      createdAt: now,
      createdBy: payload.createdBy || 'System'
    };

    interactions.push(newInteraction);
    await saveCRMInteractionsToS3(interactions);

    if (newInteraction.contactId) {
      const clientIndex = clientDataset.list.findIndex((c) => c.id === newInteraction.contactId);
      if (clientIndex !== -1) {
        clientDataset.list[clientIndex] = {
          ...clientDataset.list[clientIndex],
          lastInteractionAt: newInteraction.date,
          updatedAt: now
        };
        await clientDataset.save(clientDataset.list);
      }
    }

    return createResponse(201, {
      success: true,
      interaction: newInteraction,
      message: 'Interaction logged successfully.'
    });
  }

  return createResponse(405, { success: false, error: 'Method not allowed for interactions.' });
};

async function handleCRMRequest(path, method, event) {
  const normalizedPath = normalizePath(path);

  if (!normalizedPath.startsWith('/crm')) {
    return null;
  }

  if (normalizedPath === '/crm/contacts') {
    return handleContactsCollection(method, event);
  }

  const contactMatch = normalizedPath.match(/^\/crm\/contacts\/([^\/]+)$/);
  if (contactMatch) {
    return handleContactById(method, contactMatch[1], event);
  }

  if (normalizedPath === '/crm/organizations') {
    return handleOrganizationsCollection(method, event);
  }

  const organizationMatch = normalizedPath.match(/^\/crm\/organizations\/([^\/]+)$/);
  if (organizationMatch) {
    return handleOrganizationById(method, organizationMatch[1], event);
  }

  if (normalizedPath === '/crm/interactions') {
    return handleInteractionsCollection(method, event);
  }

  return createResponse(404, { success: false, error: 'CRM endpoint not found.' });
}

module.exports = {
  handleCRMRequest
};
