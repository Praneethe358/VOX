import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import SplashScreen from "./pages/SplashScreen";
import AdminLogin from "./pages/adminlogin";
import StudentLogin from "./pages/StudentLogin";
import Dashboard from "./pages/Dashboard";
import ExamInterface from "./pages/ExamInterface";
import AdminPortal from "./pages/AdminPortal";
import StudentPortal from "./pages/StudentPortal";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminPortal />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/student-portal" element={<StudentPortal />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/exam" element={<ExamInterface />} />
        <Route path="/splash" element={<SplashScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
  
