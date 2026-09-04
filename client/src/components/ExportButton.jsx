import React, { useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { downloadExcel } from '../utils/api';
import toast from 'react-hot-toast';

const ExportButton = () => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await downloadExcel();

      if (!(response.data instanceof Blob) || response.data.type.includes('application/json')) {
        const message = response.data instanceof Blob
          ? await response.data.text()
          : 'The server did not return a valid Excel file.';
        let errorMessage = 'The server did not return a valid Excel file.';
        try {
          errorMessage = JSON.parse(message).message || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'HEC_Master_Student_Data.xlsx';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      
      toast.success('Excel downloaded successfully');
    } catch (error) {
      toast.error(error.message || error.response?.data?.message || 'Failed to export data');
      console.error('Export error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      className="btn btn-secondary" 
      onClick={handleExport}
      disabled={loading}
    >
      <FiDownload /> {loading ? 'Exporting...' : 'Export Excel'}
    </button>
  );
};

export default ExportButton;
