import api from '../apiClient';

const normalizeArrayResponse = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.data && Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.cases)) return res.data.cases;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  if (Array.isArray(res.body)) return res.body;
  return [];
};

const getCases = async () => {
  const res = await api.get('/cases');
  return normalizeArrayResponse(res);
};

const normalizeObjectResponse = (res) => {
  if (!res) return null;
  let data = res;
  if (res.data) data = res.data;
  // API Gateway / Lambda proxy often wraps JSON in `body`
  if (data.body) {
    try {
      const parsed = JSON.parse(data.body);
      // parsed may be { case } or { data: case }
      return parsed.case || parsed.data || parsed;
    } catch (err) {
      // body wasn't JSON
      return data.body;
    }
  }

  // common shapes
  if (data.case) return data.case;
  if (data.data) return data.data;
  // if the object itself looks like a case (has id/title) return it
  if (data.id || data.title) return data;
  return data;
};

const getCaseById = async (id) => {
  const res = await api.get(`/cases/${id}`);
  return normalizeObjectResponse(res);
};

export default { getCases, getCaseById };
