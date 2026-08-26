import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight, FiChevronLeft, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { createStudent } from '../utils/api';
import FileUpload from '../components/FileUpload';

const DEPARTMENTS = ['IT', 'CS', 'EXTC', 'MECH', 'CIVIL', 'AI-DS', 'AI-ML'];
const EXAMS = ['GRE', 'GATE', 'GMAT', 'IELTS', 'TOEFL', 'CAT', 'Other'];

const StudentFormPage = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    // Step 1
    tu4fId: '',
    name: '',
    department: '',
    admissionYear: '',
    passoutYear: '',
    ugDuration: '',
    contactNo: '',
    email: '',
    
    // Step 2
    pursuingHigherEd: 'Yes',
    country: '',
    applyingFor: '',
    instituteAdmitted: '',
    pgCourse: '',
    pgDuration: '',
    
    // Step 3
    appearedForExam: 'Yes',
    examName: '',
    examScore: '',
  });

  const [files, setFiles] = useState({
    scoreCard: null,
    hallTicket: null,
    offerLetter: null,
    transcript: null,
    otherDocs: null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (name, file) => {
    setFiles(prev => ({ ...prev, [name]: file }));
  };

  const nextStep = () => {
    // Basic validation
    if (step === 1 && (!formData.tu4fId || !formData.name || !formData.email)) {
      return toast.error('Please fill required fields');
    }
    setStep(prev => Math.min(prev + 1, 4));
  };
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });
      Object.keys(files).forEach(key => {
        if (files[key]) submitData.append(key, files[key]);
      });

      await createStudent(submitData);
      setIsSuccess(true);
      toast.success('Form submitted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error submitting form');
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="form-page">
        <div className="form-container card success-container">
          <FiCheck className="success-icon mx-auto" />
          <h2 className="text-3xl mb-4 font-heading">Application Submitted!</h2>
          <p className="text-text-secondary mb-8">
            Thank you for updating your higher education details. The HEC cell will review your documents.
          </p>
          <button className="btn btn-primary" onClick={() => window.location.href = '/'}>
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page">
      <div className="form-container card">
        <h2 className="text-2xl font-heading mb-6 text-center">Student Information Form</h2>
        
        <div className="stepper">
          {[1, 2, 3, 4].map(num => (
            <div key={num} className={`step ${step === num ? 'active' : ''} ${step > num ? 'completed' : ''}`}>
              <div className="step-circle">{step > num ? <FiCheck /> : num}</div>
              <span className="step-label">
                {num === 1 ? 'Personal' : num === 2 ? 'Higher Ed' : num === 3 ? 'Exams' : 'Review'}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-8">
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="form-grid animate-fadeIn">
              <div className="form-group">
                <label className="form-label">TU4F ID *</label>
                <input type="text" className="input" name="tu4fId" value={formData.tu4fId} onChange={handleInputChange} required placeholder="e.g. TU4F2021001" />
              </div>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input type="text" className="input" name="name" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Department *</label>
                <select className="select" name="department" value={formData.department} onChange={handleInputChange} required>
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" className="input" name="email" value={formData.email} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input type="tel" className="input" name="contactNo" value={formData.contactNo} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Admission Year</label>
                <input type="number" className="input" name="admissionYear" value={formData.admissionYear} onChange={handleInputChange} min="2010" max="2030" />
              </div>
              <div className="form-group">
                <label className="form-label">Passout Year</label>
                <input type="number" className="input" name="passoutYear" value={formData.passoutYear} onChange={handleInputChange} min="2014" max="2034" />
              </div>
              <div className="form-group">
                <label className="form-label">UG Duration (Years)</label>
                <input type="number" className="input" name="ugDuration" value={formData.ugDuration} onChange={handleInputChange} min="3" max="5" />
              </div>
            </div>
          )}

          {/* Step 2: Higher Ed */}
          {step === 2 && (
            <div className="form-grid animate-fadeIn">
              <div className="form-group form-grid-full">
                <label className="form-label">Are you pursuing Higher Education?</label>
                <select className="select" name="pursuingHigherEd" value={formData.pursuingHigherEd} onChange={handleInputChange}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              
              {formData.pursuingHigherEd === 'Yes' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input type="text" className="input" name="country" value={formData.country} onChange={handleInputChange} placeholder="e.g. USA, UK, India" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Applying For</label>
                    <select className="select" name="applyingFor" value={formData.applyingFor} onChange={handleInputChange}>
                      <option value="">Select Course Type</option>
                      <option value="MS">MS</option>
                      <option value="MBA">MBA</option>
                      <option value="PhD">PhD</option>
                      <option value="MTech">MTech</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group form-grid-full">
                    <label className="form-label">Institute Admitted To (if applicable)</label>
                    <input type="text" className="input" name="instituteAdmitted" value={formData.instituteAdmitted} onChange={handleInputChange} placeholder="University Name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PG Course Name</label>
                    <input type="text" className="input" name="pgCourse" value={formData.pgCourse} onChange={handleInputChange} placeholder="e.g. Computer Science" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PG Duration (Years)</label>
                    <input type="number" className="input" name="pgDuration" value={formData.pgDuration} onChange={handleInputChange} min="1" max="5" step="0.5" />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Exams */}
          {step === 3 && (
            <div className="form-grid animate-fadeIn">
              <div className="form-group form-grid-full">
                <label className="form-label">Have you appeared for any entrance exam?</label>
                <select className="select" name="appearedForExam" value={formData.appearedForExam} onChange={handleInputChange}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              {formData.appearedForExam === 'Yes' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Exam Name</label>
                    <select className="select" name="examName" value={formData.examName} onChange={handleInputChange}>
                      <option value="">Select Exam</option>
                      {EXAMS.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Score / Percentile</label>
                    <input type="text" className="input" name="examScore" value={formData.examScore} onChange={handleInputChange} />
                  </div>
                  <div className="form-group form-grid-full">
                    <FileUpload 
                      label="Upload Score Card" 
                      name="scoreCard" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      value={files.scoreCard}
                      onChange={handleFileChange}
                    />
                  </div>
                </>
              ) : (
                <div className="form-group form-grid-full">
                  <FileUpload 
                    label="Upload Hall Ticket (If planning to appear)" 
                    name="hallTicket" 
                    accept=".pdf,.jpg,.jpeg,.png"
                    value={files.hallTicket}
                    onChange={handleFileChange}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 4: Documents & Review */}
          {step === 4 && (
            <div className="form-grid animate-fadeIn">
              <div className="form-group form-grid-full">
                <FileUpload 
                  label="Offer Letter / Admit Card (Optional)" 
                  name="offerLetter" 
                  accept=".pdf"
                  value={files.offerLetter}
                  onChange={handleFileChange}
                />
              </div>
              <div className="form-group form-grid-full">
                <FileUpload 
                  label="Official Transcript (Optional)" 
                  name="transcript" 
                  accept=".pdf"
                  value={files.transcript}
                  onChange={handleFileChange}
                />
              </div>
              
              <div className="form-group form-grid-full">
                <h3 className="text-lg font-heading mb-4 mt-6">Review Information</h3>
                <div className="review-section">
                  <div className="review-item"><span className="review-label">Name:</span><span className="review-value">{formData.name}</span></div>
                  <div className="review-item"><span className="review-label">TU4F ID:</span><span className="review-value">{formData.tu4fId}</span></div>
                  <div className="review-item"><span className="review-label">Department:</span><span className="review-value">{formData.department}</span></div>
                  <div className="review-item"><span className="review-label">Pursuing Higher Ed:</span><span className="review-value">{formData.pursuingHigherEd}</span></div>
                  {formData.pursuingHigherEd === 'Yes' && (
                    <div className="review-item"><span className="review-label">Country:</span><span className="review-value">{formData.country}</span></div>
                  )}
                  <div className="review-item"><span className="review-label">Exam:</span><span className="review-value">{formData.examName || 'N/A'}</span></div>
                </div>
              </div>
            </div>
          )}

          <div className="form-actions">
            {step > 1 ? (
              <button type="button" className="btn btn-secondary" onClick={prevStep}>
                <FiChevronLeft /> Back
              </button>
            ) : <div></div>}
            
            {step < 4 ? (
              <button type="button" className="btn btn-primary" onClick={nextStep}>
                Next <FiChevronRight />
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Application'} <FiCheck />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentFormPage;
