import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiFilter,
  FiCheck,
  FiMoreVertical,
  FiMail,
} from "react-icons/fi";
import toast from "react-hot-toast";
import {
  getStudents,
  updateStudentStatus,
  getStudentStats,
  login,
  sendStudentReminder,
} from "../utils/api";
import StatsCards from "../components/StatsCards";
import StatusBadge from "../components/StatusBadge";
import ExportButton from "../components/ExportButton";

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token"),
  );
  const [password, setPassword] = useState("");

  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    status: "",
    ai_status: "",
    department: "",
    search: "",
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [studentsRes, statsRes] = await Promise.all([
        getStudents(filters),
        getStudentStats(),
      ]);
      setStudents(studentsRes.data.data || studentsRes.data);
      setStats(statsRes.data.data || statsRes.data);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
      }
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  };
  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated, filters.status, filters.ai_status, filters.department]); // Debounced search in real app

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await login({ username: "admin", password });
      localStorage.setItem("token", res.data.token);
      setIsAuthenticated(true);
      toast.success("Logged in successfully");
    } catch (error) {
      toast.error("Invalid credentials");
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDashboardData();
  };

  const markAsChecked = async (id, isChecked) => {
    try {
      await updateStudentStatus(id, {
        review_status: isChecked ? "unchecked" : "checked",
      });
      toast.success(isChecked ? "Marked as unchecked" : "Marked as checked");
      fetchDashboardData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleSendReminder = async (id, studentName) => {
    try {
      toast.loading(`Sending reminder to ${studentName}...`, {
        id: "reminderToast",
      });
      await sendStudentReminder(id);
      toast.success(`Reminder sent to ${studentName}`, { id: "reminderToast" });
    } catch (error) {
      toast.error("Failed to send reminder email", { id: "reminderToast" });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="card w-full max-w-md">
          <h2 className="text-2xl font-heading mb-6 text-center">
            Admin Login
          </h2>
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
            <button
              type="submit"
              className="btn btn-primary w-full justify-center"
            >
              Login
            </button>
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
          <p className="text-text-secondary text-sm">
            Overview of all higher education applications
          </p>
        </div>
        <div className="flex gap-4">
          <ExportButton />
          <Link to="/admin/alumni" className="btn btn-secondary">
            Manage Alumni
          </Link>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleLogout}
          >
            Logout
          </button>
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
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
          />
          <button type="submit" className="hidden">
            Search
          </button>
        </form>

        <div className="filter-item">
          <select
            className="select"
            value={filters.department}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, department: e.target.value }))
            }
          >
            <option value="">All Departments</option>
            <option value="IT">IT</option>
            <option value="CS">CS</option>
            <option value="EXTC">EXTC</option>
            <option value="MECH">MECH</option>
            <option value="CIVIL">CIVIL</option>
            <option value="AI-DS">AI-DS</option>
            <option value="AI-ML">AI-ML</option>
          </select>
        </div>
        <div className="filter-item">
          <select
            className="select"
            value={filters.ai_status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, ai_status: e.target.value }))
            }
          >
            <option value="">All AI Results</option>
            <option value="verified">AI Verified</option>
            <option value="needs_review">Needs Manual Review</option>
            <option value="mismatch">AI Mismatch</option>
          </select>
        </div>

        <div className="filter-item">
          <select
            className="select"
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="correction_required">Correction Required</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="p-8 text-center text-text-secondary">
            Loading data...
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Application / Student</th>
                <th>Dept</th>
                <th>Target</th>
                <th>Exam & Score</th>
                <th>AI Check</th>
                <th>Status</th>
                <th>Review</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8">
                    No students found
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const studentId = student.id || student._id;
                  const tu4fId = student.tu4f_id || student.tu4fId;
                  const isChecked =
                    student.review_status === "checked" || student.isReviewed;
                  const pursuing =
                    student.higher_education === 1 ||
                    student.higher_education === true ||
                    student.pursuingHigherEd === "Yes";
                  const examAppeared =
                    student.entrance_exam_appeared === 1 ||
                    student.entrance_exam_appeared === true ||
                    student.appearedForExam === "Yes";
                  const examName =
                    student.entrance_exam_name || student.examName;
                  const examScore =
                    student.entrance_exam_score || student.examScore;
                  const applyingFor =
                    student.applying_for || student.applyingFor;
                  const aiStatus =
                    student.ai_verification_status || "unverified";
                  const aiNotes = student.ai_verification_notes || "";

                  return (
                    <tr
                      key={studentId}
                      className={
                        isChecked ? "row-checked" : `row-${student.status}`
                      }
                    >
                      <td>
                        <div className="font-medium text-accent-purple">
                          {student.application_id || "Pending ID"}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {tu4fId}
                        </div>
                        <div className="text-sm font-semibold">
                          {student.name}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {student.email}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-dept">
                          {student.department}
                        </span>
                      </td>
                      <td>
                        {pursuing ? (
                          <>
                            <div className="font-medium">
                              {student.country || "India"}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {applyingFor || "N/A"}{" "}
                              {student.institute_admitted
                                ? `(${student.institute_admitted})`
                                : ""}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-text-muted">
                            Not Pursuing
                          </span>
                        )}
                      </td>
                      <td>
                        {examAppeared ? (
                          <>
                            <div className="font-medium text-accent-teal">
                              {examName || "Exam Taken"}
                            </div>
                            <div className="text-xs text-text-secondary">
                              Score: {examScore || "Submitted"}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-text-muted">
                            No Exam
                          </span>
                        )}
                      </td>
                      <td>
                        {aiStatus === "verified" ? (
                          <span
                            className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400 font-medium inline-flex items-center gap-1"
                            title={aiNotes}
                          >
                            🟢 Verified
                          </span>
                        ) : aiStatus === "discrepancy_detected" ? (
                          <span
                            className="px-2 py-1 text-xs rounded-full bg-rose-500/20 text-rose-400 font-medium inline-flex items-center gap-1"
                            title={aiNotes}
                          >
                            ⚠️ Mismatch!
                          </span>
                        ) : aiStatus === "manual_check_needed" ? (
                          <span
                            className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400 font-medium inline-flex items-center gap-1"
                            title={aiNotes}
                          >
                            🔍 Review
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={student.status} />
                      </td>
                      <td>
                        <button
                          onClick={() => markAsChecked(studentId, isChecked)}
                          className={`btn btn-sm ${isChecked ? "btn-ghost text-status-blue font-bold" : "btn-ghost opacity-60"}`}
                          title={
                            isChecked ? "Mark as unchecked" : "Mark as checked"
                          }
                        >
                          <FiCheck
                            className={
                              isChecked ? "text-xl text-blue-400" : "text-xl"
                            }
                          />
                          <span className="text-xs ml-1">
                            {isChecked ? "Checked" : "Check"}
                          </span>
                        </button>
                      </td>
                      <td className="flex gap-2 items-center">
                        <Link
                          to={`/admin/student/${studentId}`}
                          className="btn btn-secondary py-1 px-3 text-xs"
                        >
                          View
                        </Link>
                        <button
                          onClick={() =>
                            handleSendReminder(studentId, student.name)
                          }
                          className="btn btn-ghost py-1 px-2 text-xs"
                          title="Send Document Reminder Email"
                        >
                          <FiMail className="text-base text-accent-purple" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
