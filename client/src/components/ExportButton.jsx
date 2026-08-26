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
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `HEC_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Export successful');
    } catch (error) {
      toast.error('Failed to export data');
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
