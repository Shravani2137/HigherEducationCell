import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getCorrectionApplication, submitCorrection } from "../utils/api";

const CorrectionPage = () => {
  const { token } = useParams();
  const [application, setApplication] = useState(null);
  const [form, setForm] = useState({});
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCorrectionApplication(token)
      .then(({ data }) => {
        setApplication(data.data);
        setForm({ name: data.data.name, email: data.data.email });
      })
      .catch(() => toast.error("This correction link is invalid or expired."))
      .finally(() => setLoading(false));
  }, [token]);

  const update = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  const addFile = (event) =>
    setFiles((current) => ({
      ...current,
      [event.target.name]: event.target.files[0],
    }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) =>
        payload.append(key, value || ""),
      );
      Object.entries(files).forEach(
        ([key, value]) => value && payload.append(key, value),
      );
      await submitCorrection(token, payload);
      setApplication(null);
      toast.success(
        "Correction submitted. Your application is back under review.",
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to submit correction.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="form-page">
        <div className="card form-container">Loading correction request...</div>
      </div>
    );
  if (!application)
    return (
      <div className="form-page">
        <div className="card form-container">
          <h2 className="text-2xl font-heading">Correction link unavailable</h2>
          <p className="text-text-secondary mt-3">
            The link may have expired or already been used.
          </p>
        </div>
      </div>
    );

  return (
    <div className="form-page">
      <div className="card form-container">
        <h1 className="text-2xl font-heading">Correct Application</h1>
        <p className="text-text-secondary mt-2">
          Application ID: {application.application_id}
        </p>
        <div className="card mt-6 border border-status-red">
          <strong>Correction requested</strong>
          <p className="mt-2">{application.correction_reason}</p>
        </div>
        <form onSubmit={submit} className="form-grid mt-6">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              className="input"
              name="name"
              value={form.name || ""}
              onChange={update}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="input"
              type="email"
              name="email"
              value={form.email || ""}
              onChange={update}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Number</label>
            <input className="input" name="contactNo" onChange={update} />
          </div>
          <div className="form-group">
            <label className="form-label">Country</label>
            <input className="input" name="country" onChange={update} />
          </div>
          <div className="form-group form-grid-full">
            <label className="form-label">Course Type</label>
            <input className="input" name="applyingFor" onChange={update} />
          </div>
          <div className="form-group form-grid-full">
            <label className="form-label">University / Institute</label>
            <input
              className="input"
              name="instituteAdmitted"
              onChange={update}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Entrance Exam</label>
            <input className="input" name="examName" onChange={update} />
          </div>
          <div className="form-group">
            <label className="form-label">Score / Percentile</label>
            <input className="input" name="examScore" onChange={update} />
          </div>
          <div className="form-group form-grid-full">
            <label className="form-label">Replacement document</label>
            <input
              className="input"
              type="file"
              name="otherDocs"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={addFile}
            />
          </div>
          <button className="btn btn-primary form-grid-full" disabled={saving}>
            {saving ? "Submitting..." : "Submit Correction"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CorrectionPage;
