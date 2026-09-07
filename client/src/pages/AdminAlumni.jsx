import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getAlumni, createAlumni, updateAlumni, deleteAlumni } from '../utils/api';

const AdminAlumni = () => {
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    branch: 'IT',
    passoutYear: '',
    university: '',
    course: '',
    country: '',
    currentCompany: '',
    currentDesignation: '',
    linkedin: '',
    email: '',
    willingToMentor: false
  });

  const fetchAlumni = useCallback(async () => {
    try {
      const res = await getAlumni({});
      setAlumni(res.data.data || res.data);
    } catch (error) {
      toast.error('Failed to load alumni');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlumni();
  }, [fetchAlumni]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openModal = (person = null) => {
    if (person) {
      setFormData(person);
      setEditingId(person._id);
    } else {
      setFormData({
        name: '', branch: 'IT', passoutYear: '', university: '', course: '', country: '',
        currentCompany: '', currentDesignation: '', linkedin: '', email: '', willingToMentor: false
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateAlumni(editingId, formData);
        toast.success('Alumni updated');
      } else {
        await createAlumni(formData);
        toast.success('Alumni added');
      }
      setIsModalOpen(false);
      fetchAlumni();
    } catch (error) {
      toast.error('Failed to save alumni');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this alumni record?')) {
      try {
        await deleteAlumni(id);
        toast.success('Deleted successfully');
        fetchAlumni();
      } catch (error) {
        toast.error('Failed to delete');
      }
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <Link to="/admin" className="btn btn-ghost mb-2 pl-0 text-sm">
            <FiArrowLeft /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-heading">Manage Alumni Directory</h1>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <FiPlus /> Add Alumni
        </button>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name & Branch</th>
                <th>University Details</th>
                <th>Location</th>
                <th>Mentor</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alumni.map(person => (
                <tr key={person._id}>
                  <td>
                    <div className="font-medium">{person.name}</div>
                    <div className="text-xs text-text-secondary">{person.branch} ({person.passoutYear})</div>
                  </td>
                  <td>
                    <div>{person.university}</div>
                    <div className="text-xs text-text-secondary">{person.course}</div>
                  </td>
                  <td>{person.country}</td>
                  <td>
                    {person.willingToMentor ? (
                      <span className="text-status-green">Yes</span>
                    ) : <span className="text-text-muted">No</span>}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => openModal(person)}>
                        <FiEdit2 />
                      </button>
                      <button className="btn btn-ghost btn-sm text-status-red" onClick={() => handleDelete(person._id)}>
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="text-xl font-heading">{editingId ? 'Edit Alumni' : 'Add Alumni'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group col-span-2">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="input" name="name" value={formData.name} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Branch</label>
                    <select className="select" name="branch" value={formData.branch} onChange={handleInputChange}>
                      <option value="IT">IT</option>
                      <option value="CS">CS</option>
                      <option value="EXTC">EXTC</option>
                      <option value="MECH">MECH</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Passout Year</label>
                    <input type="number" className="input" name="passoutYear" value={formData.passoutYear} onChange={handleInputChange} required />
                  </div>
                  
                  <div className="col-span-2 border-t border-border-color my-2 pt-2">
                    <h4 className="text-sm font-semibold mb-3 text-text-secondary">Higher Education Details</h4>
                  </div>
                  
                  <div className="form-group col-span-2">
                    <label className="form-label">University</label>
                    <input type="text" className="input" name="university" value={formData.university} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Course</label>
                    <input type="text" className="input" name="course" value={formData.course} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input type="text" className="input" name="country" value={formData.country} onChange={handleInputChange} required />
                  </div>

                  <div className="col-span-2 border-t border-border-color my-2 pt-2">
                    <h4 className="text-sm font-semibold mb-3 text-text-secondary">Current Status & Contact</h4>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Company (Optional)</label>
                    <input type="text" className="input" name="currentCompany" value={formData.currentCompany} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Designation (Optional)</label>
                    <input type="text" className="input" name="currentDesignation" value={formData.currentDesignation} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">LinkedIn URL</label>
                    <input type="url" className="input" name="linkedin" value={formData.linkedin} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" className="input" name="email" value={formData.email} onChange={handleInputChange} />
                  </div>
                  
                  <div className="form-group col-span-2 flex items-center gap-2 mt-2">
                    <input 
                      type="checkbox" 
                      id="willingToMentor" 
                      name="willingToMentor" 
                      checked={formData.willingToMentor} 
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded bg-bg-surface border-border-color text-accent-blue focus:ring-accent-blue focus:ring-offset-bg-surface"
                    />
                    <label htmlFor="willingToMentor" className="text-sm">Willing to mentor current students</label>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-border-color flex justify-end gap-3">
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Alumni</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAlumni;
