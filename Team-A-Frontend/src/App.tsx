import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import SplashScreen from "./pages/SplashScreen";
import LoginFaceID from "./pages/adminlogin";
import Dashboard from "./pages/Dashboard";
import ExamInterface from "./pages/ExamInterface";
import AdminPortal from "./pages/AdminPortal";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/login" element={<LoginFaceID />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/exam" element={<ExamInterface />} />
        <Route path="/admin" element={<AdminPortal />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
  
