import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiFilter, FiCheck, FiMoreVertical, FiMail } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getStudents, updateStudentStatus, getStudentStats, login, sendStudentReminder } from '../utils/api';
import StatsCards from '../components/StatsCards';
import StatusBadge from '../components/StatusBadge';
import ExportButton from '../components/ExportButton';

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [password, setPassword] = useState('');
  
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    status: '',
    department: '',
    search: ''
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [studentsRes, statsRes] = await Promise.all([
        getStudents(filters),
        getStudentStats()
      ]);
      setStudents(studentsRes.data.data || studentsRes.data);
      setStats(statsRes.data.data || statsRes.data);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      }
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated, filters.status, filters.department]); // Debounced search in real app

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await login({ username: 'admin', password});
      localStorage.setItem('token', res.data.token);
      setIsAuthenticated(true);
      toast.success('Logged in successfully');
    } catch (error) {
      toast.error('Invalid credentials');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDashboardData();
  };

  const markAsChecked = async (id, currentReviewed) => {
    try {
      await updateStudentStatus(id, { isReviewed: !currentReviewed });
      toast.success(currentReviewed ? 'Marked as unreviewed' : 'Marked as reviewed');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleSendReminder = async (id, studentName) => {
    try {
      toast.loading(`Sending reminder to ${studentName}...`, { id: 'reminderToast' });
      await sendStudentReminder(id);
      toast.success(`Reminder sent to ${studentName}`, { id: 'reminderToast' });
    } catch (error) {
      toast.error('Failed to send reminder email', { id: 'reminderToast' });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="card w-full max-w-md">
          <h2 className="text-2xl font-heading mb-6 text-center">Admin Login</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="input" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-full justify-center">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="text-2xl font-heading mb-1">Admin Dashboard</h1>
          <p className="text-text-secondary text-sm">Overview of all higher education applications</p>
        </div>
        <div className="flex gap-4">
          <ExportButton />
          <Link to="/admin/alumni" className="btn btn-secondary">Manage Alumni</Link>
        </div>
      </div>

      <StatsCards stats={stats} />

      <div className="filter-bar">
        <form onSubmit={handleSearch} className="search-wrapper">
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            className="input search-input" 
            placeholder="Search by TU4F ID or Name..." 
            value={filters.search}
            onChange={(e) => setFilters(prev => ({...prev, search: e.target.value}))}
          />
          <button type="submit" className="hidden">Search</button>
        </form>
        
        <div className="filter-item">
          <select 
            className="select"
            value={filters.department}
            onChange={(e) => setFilters(prev => ({...prev, department: e.target.value}))}
          >
            <option value="">All Departments</option>
            <option value="IT">IT</option>
            <option value="CS">CS</option>
            <option value="EXTC">EXTC</option>
          </select>
        </div>
        
        <div className="filter-item">
          <select 
            className="select"
            value={filters.status}
            onChange={(e) => setFilters(prev => ({...prev, status: e.target.value}))}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="completed">Completed</option>
            <option value="follow_up">Follow Up</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="p-8 text-center text-text-secondary">Loading data...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID / Name</th>
                <th>Dept</th>
                <th>Target</th>
                <th>Exam</th>
                <th>Status</th>
                <th>Review</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-8">No students found</td></tr>
              ) : (
                students.map(student => (
                  <tr key={student._id} className={`row-${student.isReviewed ? 'checked' : student.status}`}>
                    <td>
                      <div className="font-medium">{student.tu4fId}</div>
                      <div className="text-xs text-text-secondary">{student.name}</div>
                    </td>
                    <td>{student.department}</td>
                    <td>
                      {student.pursuingHigherEd === 'Yes' ? (
                        <>
                          <div>{student.country}</div>
                          <div className="text-xs text-text-secondary">{student.applyingFor}</div>
                        </>
                      ) : 'No'}
                    </td>
                    <td>
                      {student.appearedForExam === 'Yes' ? (
                        <>
                          <div>{student.examName}</div>
                          <div className="text-xs text-text-secondary">Score: {student.examScore}</div>
                        </>
                      ) : 'No'}
                    </td>
                    <td>
                      <StatusBadge status={student.status} />
                    </td>
                    <td>
                      <button 
                        onClick={() => markAsChecked(student._id, student.isReviewed)}
                        className={`btn btn-sm ${student.isReviewed ? 'btn-ghost text-status-blue' : 'btn-ghost'}`}
                        title={student.isReviewed ? "Mark as unreviewed" : "Mark as reviewed"}
                      >
                        <FiCheck className={student.isReviewed ? "text-xl" : "text-xl opacity-30"} />
                      </button>
                    </td>
                    <td className="flex gap-2 items-center">
                      <Link to={`/admin/student/${student.id || student._id}`} className="btn btn-secondary py-1 px-3 text-xs">
                        View
                      </Link>
                      <button 
                        onClick={() => handleSendReminder(student.id || student._id, student.name)}
                        className="btn btn-ghost py-1 px-2 text-xs"
                        title="Send Document Reminder Email"
                      >
                        <FiMail className="text-base text-accent-purple" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
