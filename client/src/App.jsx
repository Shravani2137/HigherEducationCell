import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import StudentFormPage from "./pages/StudentFormPage";
import AlumniDirectory from "./pages/AlumniDirectory";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDetail from "./pages/StudentDetail";
import AdminAlumni from "./pages/AdminAlumni";
import CorrectionPage from "./pages/CorrectionPage";

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/apply" element={<StudentFormPage />} />
            <Route path="/alumni" element={<AlumniDirectory />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/student/:id" element={<StudentDetail />} />
            <Route path="/admin/alumni" element={<AdminAlumni />} />
            <Route path="/correct/:token" element={<CorrectionPage />} />
          </Routes>
        </main>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--surface-color)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
