import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api' });

export const orgApi = {
  list: () => api.get('/organizations').then(r => r.data),
  create: (data) => api.post('/organizations', data).then(r => r.data),
  update: (id, data) => api.put(`/organizations/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/organizations/${id}`).then(r => r.data),
};

export const deptApi = {
  listByOrg: (orgId) => api.get(`/departments/org/${orgId}`).then(r => r.data),
  create: (data) => api.post('/departments', data).then(r => r.data),
  update: (id, data) => api.put(`/departments/${id}`, data).then(r => r.data),
  updatePosition: (id, pos_x, pos_y) => api.patch(`/departments/${id}/position`, { pos_x, pos_y }).then(r => r.data),
  delete: (id) => api.delete(`/departments/${id}`).then(r => r.data),
};

export const personApi = {
  listByOrg: (orgId) => api.get(`/persons/org/${orgId}`).then(r => r.data),
  create: (data) => api.post('/persons', data).then(r => r.data),
  update: (id, data) => api.put(`/persons/${id}`, data).then(r => r.data),
  updatePosition: (id, pos_x, pos_y) => api.patch(`/persons/${id}/position`, { pos_x, pos_y }).then(r => r.data),
  delete: (id) => api.delete(`/persons/${id}`).then(r => r.data),
  addReport: (person_id, reports_to_id) => api.post('/persons/reports', { person_id, reports_to_id }).then(r => r.data),
  deleteReport: (id) => api.delete(`/persons/reports/${id}`).then(r => r.data),
};

export const relationApi = {
  listByOrg: (orgId) => api.get(`/relations/org/${orgId}`).then(r => r.data),
  create: (data) => api.post('/relations', data).then(r => r.data),
  update: (id, data) => api.put(`/relations/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/relations/${id}`).then(r => r.data),
};
