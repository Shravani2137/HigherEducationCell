import React, { useRef, useState } from 'react';
import { FiUploadCloud, FiFile, FiX } from 'react-icons/fi';

const FileUpload = ({ label, name, accept, required, onChange, value }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onChange(name, e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onChange(name, e.target.files[0]);
    }
  };

  const removeFile = (e) => {
    e.stopPropagation();
    onChange(name, null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="form-group">
      <label className="form-label">{label} {required && '*'}</label>
      <div 
        className={`file-upload ${isDragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={inputRef}
          accept={accept}
          onChange={handleChange}
        />
        
        {value ? (
          <div className="file-info flex flex-col items-center">
            <FiFile className="file-upload-icon text-accent-blue" />
            <p className="mt-2 text-sm font-medium">{value.name}</p>
            <p className="text-xs text-text-secondary mt-1">
              {(value.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <button 
              type="button" 
              className="mt-3 btn btn-ghost text-sm"
              onClick={removeFile}
            >
              <FiX /> Remove
            </button>
          </div>
        ) : (
          <div className="upload-prompt flex flex-col items-center">
            <FiUploadCloud className="file-upload-icon" />
            <p className="text-sm">Drag & drop your file here, or click to browse</p>
            <p className="text-xs text-text-secondary mt-2">
              Supported formats: {accept}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
