import React, { useState } from "react";
import { FiExternalLink } from "react-icons/fi";
import { downloadExcel } from "../utils/api";
import toast from "react-hot-toast";

const ExportButton = () => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await downloadExcel();

      if (!response.data?.url) {
        throw new Error("The server did not return an Excel link.");
      }

      window.open(response.data.url, "_blank", "noopener,noreferrer");
      toast.success("Excel opened successfully");
    } catch (error) {
      toast.error(
        error.message ||
          error.response?.data?.message ||
          "Failed to export data",
      );
      console.error("Export error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="btn btn-secondary"
      onClick={handleExport}
      disabled={loading}
      title="Open student data in Excel"
      aria-label={
        loading
          ? "Preparing Excel export"
          : "Open Excel with uploaded file links"
      }
    >
      <FiExternalLink /> {loading ? "Opening..." : "Open Excel"}
    </button>
  );
};

export default ExportButton;
