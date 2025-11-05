import api from '../apiClient';

const uploadDocument = async (formData) => {
  // formData is FormData with file and metadata
  const res = await api.post('/s3/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

const getCaseDocuments = async (caseId) => {
  if (!caseId) return [];
  const res = await api.get(`/cases/${caseId}/documents`);
  const data = res.data || {};
  if (data.body) {
    try { return JSON.parse(data.body).documents || []; } catch { return data.body; }
  }
  return data.documents || data || [];
};

const getDocumentVersions = async (documentId) => {
  if (!documentId) return [];
  const res = await api.get(`/documents/${documentId}/versions`);
  const data = res.data || {};
  if (data.body) {
    try { return JSON.parse(data.body).versions || []; } catch { return data.body; }
  }
  return data.versions || data || [];
};

const deleteDocument = async (keyOrId) => {
  // server supports DELETE /documents/:id or DELETE /s3/object with { key }
  try {
    const res = await api.delete(`/documents/${encodeURIComponent(keyOrId)}`);
    return res.data;
  } catch (e) {
    // fallback to object delete
    const res = await api.delete('/s3/object', { data: { key: keyOrId } });
    return res.data;
  }
};

export default { uploadDocument, getCaseDocuments, getDocumentVersions, deleteDocument };
