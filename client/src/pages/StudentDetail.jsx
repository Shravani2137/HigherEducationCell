import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiDownload, FiTrash2, FiSave } from "react-icons/fi";
import toast from "react-hot-toast";
import {
  getStudent,
  updateStudentStatus,
  deleteStudent,
  startReview,
  requestCorrection,
  approveStudent,
  rejectStudent,
} from "../utils/api";
import StatusBadge from "../components/StatusBadge";

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [addAlumni, setAddAlumni] = useState(false);

  const fetchStudent = useCallback(async () => {
    try {
      const res = await getStudent(id);
      const data = res.data.data || res.data;
      setStudent(data);
      setNotes(data.adminNotes || "");
      setStatus(data.status);
    } catch (error) {
      toast.error("Failed to load student details");
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  const handleUpdate = async () => {
    try {
      await updateStudentStatus(id, { status, notes });
      toast.success("Student details updated");
      fetchStudent();
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this record? This cannot be undone.",
      )
    ) {
      try {
        await deleteStudent(id);
        toast.success("Student deleted");
        navigate("/admin");
      } catch (error) {
        toast.error("Failed to delete");
      }
    }
  };

  const runReviewAction = async (action) => {
    try {
      let actionResponse;
      if (action === "correction" || action === "reject") {
        const reason = window.prompt(
          action === "correction"
            ? "Enter the exact correction reason:"
            : "Enter the rejection reason:",
        );
        if (!reason?.trim()) return;
        if (action === "correction")
          await requestCorrection(id, { reason: reason.trim() });
        else await rejectStudent(id, { reason: reason.trim() });
      } else if (action === "start") {
        actionResponse = await startReview(id);
      } else {
        if (
          !window.confirm(
            `Approve ${student.name}'s application?${addAlumni ? " This will also add the student to the Alumni Directory." : ""}`,
          )
        )
          return;
        actionResponse = await approveStudent(id, { addAlumni });
      }
      toast.success(
        action === "approve"
          ? actionResponse?.data?.message || "Application approved"
          : action === "correction"
            ? "Correction request sent"
            : action === "reject"
              ? "Application rejected"
              : "Review started",
      );
      fetchStudent();
    } catch (error) {
      toast.error(error.response?.data?.message || "Review action failed");
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-text-secondary">
        Loading student details...
      </div>
    );
  if (!student)
    return (
      <div className="p-8 text-center text-text-secondary">
        Student not found
      </div>
    );

  const tu4fId = student.tu4f_id || student.tu4fId;
  const admissionYear = student.admission_year || student.admissionYear;
  const passoutYear = student.passout_year || student.passoutYear;
  const contactNo = student.contact_no || student.contactNo;
  const pursuing =
    student.higher_education === 1 ||
    student.higher_education === true ||
    student.pursuingHigherEd === "Yes";
  const applyingFor = student.applying_for || student.applyingFor;
  const pgCourse = student.pg_course || student.pgCourse;
  const instituteAdmitted =
    student.institute_admitted || student.instituteAdmitted;
  const examAppeared =
    student.entrance_exam_appeared === 1 ||
    student.entrance_exam_appeared === true ||
    student.appearedForExam === "Yes";
  const examName = student.entrance_exam_name || student.examName;
  const examScore = student.entrance_exam_score || student.examScore;
  const aiStatus = student.ai_verification_status || "unverified";
  const aiScore = student.ai_score_extracted;
  const aiNotes = student.ai_verification_notes;
  const aiResult = student.ai_verification_result || {};
  const driveUrl = student.drive_folder_url;

  return (
    <div className="dashboard">
      <div className="detail-header">
        <div>
          <button
            onClick={() => navigate("/admin")}
            className="btn btn-ghost mb-4 pl-0"
          >
            <FiArrowLeft /> Back to Dashboard
          </button>
          <h1 className="text-3xl font-heading mb-2">{student.name}</h1>
          <div className="flex gap-3 items-center flex-wrap">
            <span className="text-accent-purple font-medium">
              {student.application_id || tu4fId}
            </span>
            <span className="text-text-secondary">•</span>
            <span className="badge badge-dept">{student.department}</span>
            <span className="text-text-secondary">•</span>
            <StatusBadge status={student.status} />
            {driveUrl && (
              <a
                href={
                  driveUrl.startsWith("http")
                    ? driveUrl
                    : `http://localhost:5000${driveUrl}`
                }
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary py-1 px-3 text-xs ml-2"
              >
                📁 Open Drive / Folder
              </a>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleDelete} className="btn btn-danger">
            <FiTrash2 /> Delete
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="flex flex-col gap-6">
          <div className="card">
            <h3 className="text-xl font-heading mb-4 border-b border-border-color pb-2">
              Academic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-secondary">Admission Year</p>
                <p className="font-medium">{admissionYear || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Passout Year</p>
                <p className="font-medium">{passoutYear || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Email</p>
                <p className="font-medium">{student.email}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Contact</p>
                <p className="font-medium">{contactNo || "N/A"}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-xl font-heading mb-4 border-b border-border-color pb-2">
              Higher Education Goals
            </h3>
            {pursuing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-text-secondary">Target Country</p>
                  <p className="font-medium">{student.country || "India"}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Applying For</p>
                  <p className="font-medium">{applyingFor || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Target Course</p>
                  <p className="font-medium">{pgCourse || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">
                    Institute Admitted
                  </p>
                  <p className="font-medium">
                    {instituteAdmitted || "Not yet admitted"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-text-secondary">
                Not pursuing higher education
              </p>
            )}
          </div>

          <div className="card">
            <h3 className="text-xl font-heading mb-4 border-b border-border-color pb-2">
              Entrance Exams & AI Verification
            </h3>
            {examAppeared ? (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary">Exam Name</p>
                    <p className="font-medium">{examName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Entered Score</p>
                    <p className="font-medium">{examScore || "N/A"}</p>
                  </div>
                </div>

                {/* AI Verification Box */}
                <div className="p-4 rounded-lg bg-surface-light border border-border-color mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm flex items-center gap-2">
                      🤖 AI Document Verification Status:
                    </span>
                    {aiStatus === "verified" ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                        ✅ Score Verified
                      </span>
                    ) : aiStatus === "discrepancy_detected" ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-rose-500/20 text-rose-400 font-semibold">
                        ⚠️ Discrepancy / Mismatch
                      </span>
                    ) : aiStatus === "manual_check_needed" ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400 font-semibold">
                        🔍 Manual Review Required
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted">
                        Unverified
                      </span>
                    )}
                  </div>
                  {aiScore && (
                    <p className="text-xs text-text-secondary mb-1">
                      <strong>AI Extracted Score:</strong>{" "}
                      <span className="text-accent-teal font-medium">
                        {aiScore}
                      </span>
                    </p>
                  )}
                  {aiNotes && (
                    <p className="text-xs text-text-secondary italic">
                      {aiNotes}
                    </p>
                  )}
                  {aiResult.documents?.map((document) => (
                    <div
                      key={`${document.documentType}-${document.fileName}`}
                      className="mt-4 border-t border-border-color pt-3"
                    >
                      <p className="text-sm font-semibold capitalize">
                        {document.documentType.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {document.summary}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {Object.entries(document.fields || {}).map(
                          ([field, value]) =>
                            value.status !== "not_applicable" && (
                              <div
                                key={field}
                                className="text-xs border border-border-color rounded p-2"
                              >
                                <strong className="capitalize">
                                  {field.replace(/([A-Z])/g, " $1")}
                                </strong>
                                <div>
                                  Entered: {value.entered ?? "Not provided"}
                                </div>
                                <div>
                                  Document: {value.document ?? "Not readable"}
                                </div>
                                <div
                                  className={
                                    value.status === "match"
                                      ? "text-emerald-500"
                                      : "text-amber-500"
                                  }
                                >
                                  {value.status
                                    .replace(/_/g, " ")
                                    .toUpperCase()}
                                </div>
                              </div>
                            ),
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-text-secondary">Has not appeared for exams</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card">
            <h3 className="text-xl font-heading mb-4 border-b border-border-color pb-2">
              Status & Review Management
            </h3>
            <div className="status-manager">
              <div className="form-group mb-4">
                <label className="form-label">Update Status</label>
                <select
                  className="select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="correction_required">
                    Correction Required
                  </option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Review Status</label>
                <p className="text-sm font-medium mb-2">
                  {student.review_status === "checked"
                    ? "🔵 Marked as Checked"
                    : "⬜ Unchecked"}
                </p>
              </div>

              <div className="form-group mb-0">
                <label className="form-label">Admin Notes</label>
                <textarea
                  className="textarea"
                  rows="4"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes for internal tracking..."
                ></textarea>
              </div>

              <button
                onClick={handleUpdate}
                className="btn btn-primary w-full justify-center mt-4"
              >
                <FiSave /> Save Changes
              </button>
              <label className="flex items-center gap-2 mt-4 text-sm">
                <input
                  type="checkbox"
                  checked={addAlumni}
                  onChange={(event) => setAddAlumni(event.target.checked)}
                />
                Add this student to the Alumni Directory on approval
              </label>
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => runReviewAction("start")}
                  className="btn btn-secondary"
                >
                  Start Review
                </button>
                <button
                  onClick={() => runReviewAction("correction")}
                  className="btn btn-secondary"
                >
                  Request Correction
                </button>
                <button
                  onClick={() => runReviewAction("approve")}
                  className="btn btn-primary"
                >
                  Approve
                </button>
                <button
                  onClick={() => runReviewAction("reject")}
                  className="btn btn-danger"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-xl font-heading mb-4 border-b border-border-color pb-2">
              Uploaded Documents
            </h3>
            {student.documents && student.documents.length > 0 ? (
              <ul className="doc-list">
                {student.documents.map((doc) => {
                  const docPath = doc.file_path.startsWith("http")
                    ? doc.file_path
                    : `http://localhost:5000/${doc.file_path}`;
                  return (
                    <li
                      key={doc.id}
                      className="doc-item flex items-center justify-between p-2 rounded border border-border-color mb-2"
                    >
                      <div>
                        <div className="font-medium text-sm capitalize">
                          {doc.doc_type.replace(/_/g, " ")}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {doc.original_name}
                        </div>
                      </div>
                      <a
                        href={docPath}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost py-1 px-2"
                        title="Download / View"
                      >
                        <FiDownload />
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-text-secondary text-sm">
                No documents uploaded
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetail;
