import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Student APIs
export const getStudents = (params) => api.get("/students", { params });
export const getStudent = (id) => api.get(`/students/${id}`);
export const createStudent = (data) => api.post("/students", data);
export const updateStudentStatus = (id, statusData) =>
  api.patch(`/students/${id}/status`, statusData);
export const deleteStudent = (id) => api.delete(`/students/${id}`);
export const getStudentStats = () => api.get("/students/stats/summary");
export const sendStudentReminder = (id) =>
  api.post(`/students/${id}/send-reminder`);

// Alumni APIs
export const getAlumni = (params) => api.get("/alumni", { params });
export const getAlumniById = (id) => api.get(`/alumni/${id}`);
export const createAlumni = (data) => api.post("/alumni", data);
export const updateAlumni = (id, data) => api.put(`/alumni/${id}`, data);
export const deleteAlumni = (id) => api.delete(`/alumni/${id}`);
export const connectWithAlumni = (id, data) =>
  api.post(`/alumni/${id}/connect`, data);

// Auth APIs
export const login = (credentials) => api.post("/auth/login", credentials);
export const verifyToken = () => api.get("/auth/verify");
export const startReview = (id) => api.post(`/students/${id}/review/start`);
export const requestCorrection = (id, data) =>
  api.post(`/students/${id}/review/correction`, data);
export const approveStudent = (id, data = {}) =>
  api.post(`/students/${id}/review/approve`, data);
export const rejectStudent = (id, data) =>
  api.post(`/students/${id}/review/reject`, data);
export const getCorrectionApplication = (token) =>
  api.get(`/students/correction/${token}`);
export const submitCorrection = (token, data) =>
  api.post(`/students/correction/${token}`, data);

// Export API
export const downloadExcel = () => api.get("/export/excel");

export default api;
