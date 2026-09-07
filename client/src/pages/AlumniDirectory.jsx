import React, { useState, useEffect, useCallback } from "react";
import {
  FiSearch,
  FiLinkedin,
  FiMail,
  FiBook,
  FiBriefcase,
  FiMessageSquare,
  FiX,
  FiSend,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { getAlumni, connectWithAlumni } from "../utils/api";

const AlumniDirectory = () => {
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlumnus, setSelectedAlumnus] = useState(null);
  const [sending, setSending] = useState(false);

  const [connectForm, setConnectForm] = useState({
    studentName: "",
    studentEmail: "",
    studentPhone: "",
    studentBranch: "IT",
    targetCountry: "",
    message: "",
  });

  const [filters, setFilters] = useState({
    country: "",
    search: "",
    branch: "",
    university: "",
    course: "",
    passout_year: "",
  });

  const fetchAlumni = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAlumni(filters);
      setAlumni(res.data.data || res.data);
    } catch (error) {
      console.error("Failed to fetch alumni", error);
    } finally {
      setLoading(false);
    }
  }, [
    filters.country,
    filters.branch,
    filters.university,
    filters.course,
    filters.passout_year,
  ]);

  useEffect(() => {
    fetchAlumni();
  }, [fetchAlumni]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchAlumni();
  };

  const handleConnectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAlumnus) return;
    try {
      setSending(true);
      await connectWithAlumni(
        selectedAlumnus.id || selectedAlumnus._id,
        connectForm,
      );
      toast.success(`Mentorship request sent to ${selectedAlumnus.name}!`);
      setSelectedAlumnus(null);
      setConnectForm({
        studentName: "",
        studentEmail: "",
        studentPhone: "",
        studentBranch: "IT",
        targetCountry: "",
        message: "",
      });
    } catch (error) {
      toast.error("Failed to send connect request");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="alumni-page">
      <div className="alumni-header">
        <h1 className="text-4xl font-heading mb-4">Alumni Directory</h1>
        <p className="text-text-secondary max-w-2xl mx-auto">
          Connect with TEC alumni studying or working globally. Reach out for
          guidance on university selection, application processes, and career
          advice.
        </p>
      </div>

      <div className="alumni-layout">
        <aside className="alumni-sidebar">
          <div className="card sticky top-20">
            <h3 className="font-heading text-lg mb-4">Filters</h3>

            <form onSubmit={handleSearch} className="mb-6">
              <div className="form-group">
                <label className="form-label">Search</label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    className="input pl-10"
                    placeholder="Name, University..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        search: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </form>

            <div className="form-group">
              <label className="form-label">University</label>
              <input
                type="text"
                className="input"
                placeholder="University of Mumbai"
                value={filters.university}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    university: e.target.value,
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Course</label>
              <input
                type="text"
                className="input"
                placeholder="Computer Engineering"
                value={filters.course}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, course: e.target.value }))
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Passing Year</label>
              <input
                type="number"
                className="input"
                value={filters.passout_year}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    passout_year: e.target.value,
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Country</label>
              <select
                className="select"
                value={filters.country}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, country: e.target.value }))
                }
              >
                <option value="">All Countries</option>
                <option value="USA">USA 🇺🇸</option>
                <option value="UK">UK 🇬🇧</option>
                <option value="Canada">Canada 🇨🇦</option>
                <option value="Australia">Australia 🇦🇺</option>
                <option value="Germany">Germany 🇩🇪</option>
                <option value="Ireland">Ireland 🇮🇪</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">TEC Branch</label>
              <select
                className="select"
                value={filters.branch}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, branch: e.target.value }))
                }
              >
                <option value="">All Branches</option>
                <option value="IT">IT</option>
                <option value="CS">CS</option>
                <option value="EXTC">EXTC</option>
                <option value="MECH">MECH</option>
              </select>
            </div>
          </div>
        </aside>

        <main className="alumni-grid-container">
          {loading ? (
            <div className="text-center py-12 text-text-secondary">
              Loading alumni directory...
            </div>
          ) : alumni.length === 0 ? (
            <div className="text-center py-12 text-text-secondary card">
              No alumni found matching your criteria.
            </div>
          ) : (
            <div className="alumni-grid">
              {alumni.map((person) => (
                <div
                  key={person.id || person._id}
                  className="card alumni-card flex flex-col justify-between"
                >
                  <div>
                    <div className="alumni-card-header">
                      <div>
                        <h3 className="alumni-name">{person.name}</h3>
                        <div className="text-sm text-text-secondary">
                          {person.branch} • Class of{" "}
                          {person.passout_year || person.passoutYear}
                        </div>
                      </div>
                      <span className="alumni-batch">
                        {person.pg_country || person.country}
                      </span>
                    </div>

                    <div className="alumni-university">
                      <FiBook className="text-accent-purple" />
                      <span>{person.pg_university || person.university}</span>
                    </div>
                    <div className="alumni-course">
                      {person.pg_course || person.course}
                    </div>

                    {(person.current_company || person.currentCompany) && (
                      <div className="alumni-work">
                        <div className="flex items-center gap-2 mb-1">
                          <FiBriefcase className="text-accent-teal" />
                          <span className="font-medium">
                            {person.designation || person.currentDesignation}
                          </span>
                        </div>
                        <div className="text-sm text-text-secondary pl-6">
                          {person.current_company || person.currentCompany}
                        </div>
                      </div>
                    )}

                    {(person.willing_to_mentor || person.willingToMentor) && (
                      <div className="mt-2 mb-4">
                        <span className="mentor-badge">Willing to Mentor</span>
                      </div>
                    )}
                  </div>

                  <div className="alumni-links border-t border-border-color pt-3 mt-4 flex items-center justify-between">
                    <div className="flex gap-2">
                      {person.linkedin_url && (
                        <a
                          href={person.linkedin_url}
                          target="_blank"
                          rel="noreferrer"
                          className="alumni-link"
                          title="LinkedIn"
                        >
                          <FiLinkedin />
                        </a>
                      )}
                      <span
                        className="alumni-link"
                        title="Contact through the secure request form"
                      >
                        <FiMail />
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedAlumnus(person)}
                      className="btn btn-primary py-1 px-3 text-xs flex items-center gap-1"
                    >
                      <FiMessageSquare /> Ask Guidance
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Connect Modal */}
      {selectedAlumnus && (
        <div className="modal-backdrop flex items-center justify-center p-4 fixed inset-0 bg-black/70 backdrop-blur-sm z-50">
          <div className="card w-full max-w-lg relative animate-fadeIn">
            <button
              onClick={() => setSelectedAlumnus(null)}
              className="absolute top-4 right-4 text-text-secondary hover:text-text-primary text-xl"
            >
              <FiX />
            </button>

            <h3 className="text-xl font-heading mb-1">
              Connect with {selectedAlumnus.name}
            </h3>
            <p className="text-sm text-text-secondary mb-6">
              {selectedAlumnus.pg_university || selectedAlumnus.university} •{" "}
              {selectedAlumnus.pg_country || selectedAlumnus.country}
            </p>

            <form onSubmit={handleConnectSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Your Name *</label>
                  <input
                    type="text"
                    className="input"
                    required
                    value={connectForm.studentName}
                    onChange={(e) =>
                      setConnectForm((prev) => ({
                        ...prev,
                        studentName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Your Email *</label>
                  <input
                    type="email"
                    className="input"
                    required
                    value={connectForm.studentEmail}
                    onChange={(e) =>
                      setConnectForm((prev) => ({
                        ...prev,
                        studentEmail: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Branch</label>
                  <select
                    className="select"
                    value={connectForm.studentBranch}
                    onChange={(e) =>
                      setConnectForm((prev) => ({
                        ...prev,
                        studentBranch: e.target.value,
                      }))
                    }
                  >
                    <option value="IT">IT</option>
                    <option value="CS">CS</option>
                    <option value="EXTC">EXTC</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Target Country/University
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. USA / CMU"
                    value={connectForm.targetCountry}
                    onChange={(e) =>
                      setConnectForm((prev) => ({
                        ...prev,
                        targetCountry: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Message / Question for Mentorship *
                </label>
                <textarea
                  className="input min-h-[100px]"
                  required
                  placeholder="Ask about application tips, GRE scores, living costs, SOP preparation..."
                  value={connectForm.message}
                  onChange={(e) =>
                    setConnectForm((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedAlumnus(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex items-center gap-2"
                  disabled={sending}
                >
                  {sending ? "Sending..." : "Send Request"} <FiSend />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlumniDirectory;
