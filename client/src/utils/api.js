import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Student APIs
export const getStudents = (params) => api.get('/students', { params });
export const getStudent = (id) => api.get(`/students/${id}`);
export const createStudent = (data) => api.post('/students', data);
export const updateStudentStatus = (id, statusData) => api.patch(`/students/${id}/status`, statusData);
export const deleteStudent = (id) => api.delete(`/students/${id}`);
export const getStudentStats = () => api.get('/students/stats/summary');
export const sendStudentReminder = (id) => api.post(`/students/${id}/send-reminder`);

// Alumni APIs
export const getAlumni = (params) => api.get('/alumni', { params });
export const getAlumniById = (id) => api.get(`/alumni/${id}`);
export const createAlumni = (data) => api.post('/alumni', data);
export const updateAlumni = (id, data) => api.put(`/alumni/${id}`, data);
export const deleteAlumni = (id) => api.delete(`/alumni/${id}`);
export const connectWithAlumni = (id, data) => api.post(`/alumni/${id}/connect`, data);

// Auth APIs
export const login = (credentials) => api.post('/auth/login', credentials);
export const verifyToken = () => api.get('/auth/verify');

// Export API
export const downloadExcel = () => api.get('/students/export', { responseType: 'blob' });

export default api;
