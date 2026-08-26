import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiDownload, FiTrash2, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getStudent, updateStudentStatus, deleteStudent } from '../utils/api';
import StatusBadge from '../components/StatusBadge';

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchStudent();
  }, [id]);

  const fetchStudent = async () => {
    try {
      const res = await getStudent(id);
      const data = res.data.data || res.data;
      setStudent(data);
      setNotes(data.adminNotes || '');
      setStatus(data.status);
    } catch (error) {
      toast.error('Failed to load student details');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await updateStudentStatus(id, { status, adminNotes: notes });
      toast.success('Student details updated');
      fetchStudent();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this record? This cannot be undone.')) {
      try {
        await deleteStudent(id);
        toast.success('Student deleted');
        navigate('/admin');
      } catch (error) {
        toast.error('Failed to delete');
      }
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!student) return <div className="p-8 text-center">Student not found</div>;

  return (
    <div className="dashboard">
      <div className="detail-header">
        <div>
          <button onClick={() => navigate('/admin')} className="btn btn-ghost mb-4 pl-0">
            <FiArrowLeft /> Back to Dashboard
          </button>
          <h1 className="text-3xl font-heading mb-2">{student.name}</h1>
          <div className="flex gap-3 items-center">
            <span className="text-text-secondary">{student.tu4fId}</span>
            <span className="text-text-secondary">•</span>
            <span className="text-text-secondary">{student.department}</span>
            <span className="text-text-secondary">•</span>
            <StatusBadge status={student.status} />
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
            <h3 className="text-xl font-heading mb-4 border-b border-border-color pb-2">Academic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-secondary">Admission Year</p>
                <p className="font-medium">{student.admissionYear}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Passout Year</p>
                <p className="font-medium">{student.passoutYear}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Email</p>
                <p className="font-medium">{student.email}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Contact</p>
                <p className="font-medium">{student.contactNo || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-xl font-heading mb-4 border-b border-border-color pb-2">Higher Education Goals</h3>
            {student.pursuingHigherEd === 'Yes' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-text-secondary">Target Country</p>
                  <p className="font-medium">{student.country}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Applying For</p>
                  <p className="font-medium">{student.applyingFor}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Target Course</p>
                  <p className="font-medium">{student.pgCourse}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Institute Admitted</p>
                  <p className="font-medium">{student.instituteAdmitted || 'Not yet'}</p>
                </div>
              </div>
            ) : (
              <p className="text-text-secondary">Not pursuing higher education</p>
            )}
          </div>

          <div className="card">
            <h3 className="text-xl font-heading mb-4 border-b border-border-color pb-2">Entrance Exams</h3>
            {student.appearedForExam === 'Yes' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-text-secondary">Exam Name</p>
                  <p className="font-medium">{student.examName}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Score</p>
                  <p className="font-medium">{student.examScore}</p>
                </div>
              </div>
            ) : (
              <p className="text-text-secondary">Has not appeared for exams</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card">
            <h3 className="text-xl font-heading mb-4 border-b border-border-color pb-2">Status Management</h3>
            <div className="status-manager">
              <div className="form-group mb-0">
                <label className="form-label">Update Status</label>
                <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="completed">Completed</option>
                  <option value="follow_up">Follow Up</option>
                </select>
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
              
              <button onClick={handleUpdate} className="btn btn-primary w-full justify-center mt-2">
                <FiSave /> Save Changes
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-xl font-heading mb-4 border-b border-border-color pb-2">Documents</h3>
            {student.documents && Object.keys(student.documents).length > 0 ? (
              <ul className="doc-list">
                {Object.entries(student.documents).map(([key, url]) => (
                  <li key={key} className="doc-item">
                    <div className="doc-name capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <a href={`http://localhost:5000/${url}`} target="_blank" rel="noreferrer" className="btn btn-ghost py-1 px-2">
                      <FiDownload />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-text-secondary text-sm">No documents uploaded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetail;
