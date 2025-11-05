import api from '../apiClient';

const getClients = async () => {
  const res = await api.get('/auth/clients');
  if (res.data && Array.isArray(res.data.clients)) return res.data.clients;
  if (Array.isArray(res.data)) return res.data;
  return [];
};

const getClientById = async (id) => {
  const res = await api.get(`/clients/${id}`);
  const data = res.data || {};
  if (data.body) return JSON.parse(data.body);
  return data;
};

export default { getClients, getClientById };
