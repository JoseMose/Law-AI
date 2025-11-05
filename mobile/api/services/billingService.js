import api from '../apiClient';

const getBillingRecords = async () => {
  const res = await api.get('/billing');
  const data = res.data || {};
  if (data.body) return JSON.parse(data.body).records || [];
  return data.records || [];
};

export default { getBillingRecords };
