import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import { ExamProvider } from "./context/ExamContext";
import { VoiceProvider } from "./context/VoiceContext";
import { ToastProvider } from "./components/Toast";
import { ProtectedRoute, StudentProtectedRoute } from "./components/ProtectedRoute";
import { loadFaceApiModels } from "./utils/faceApiLoader";

// Pages
import LandingPage from "./pages/LandingPage";
import SplashScreen from "./pages/SplashScreen";
import AdminLogin from "./pages/adminlogin";
import AdminPortal from "./pages/AdminPortal";

// Student Portal Pages
import FaceRecognitionLogin from "./pages/student/FaceRecognitionLogin";
import ExamSelector from "./pages/student/ExamSelector";
import PreExamChecklist from "./pages/student/PreExamChecklist";
import StudentExamInterface from "./pages/student/ExamInterface";
import SubmissionConfirmation from "./pages/student/SubmissionConfirmation";
import ResultsPage from "./pages/student/ResultsPage";
import SettingsPage from "./pages/student/SettingsPage";
import PasswordFallbackLogin from "./pages/student/PasswordFallbackLogin";
import ExamBriefing from "./pages/student/ExamBriefing";

export default function App() {
  // Preload face-api.js models on app start
  useEffect(() => {
    loadFaceApiModels().catch((err) => {
      console.warn('[App] Face API models could not be preloaded:', err);
    });
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ExamProvider>
            <VoiceProvider>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/splash" element={<SplashScreen />} />

                {/* Legacy Redirects */}
                <Route path="/student-login" element={<Navigate to="/student/login" replace />} />
                <Route path="/student-portal" element={<Navigate to="/student/exams" replace />} />
                <Route path="/dashboard" element={<Navigate to="/student/exams" replace />} />
                <Route path="/exam" element={<Navigate to="/student/exams" replace />} />

                {/* Admin Routes — Protected */}
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <AdminPortal />
                  </ProtectedRoute>
                } />

                {/* Student Auth Routes — Public */}
                <Route path="/student" element={<Navigate to="/student/login" replace />} />
                <Route path="/student/login" element={<FaceRecognitionLogin />} />
                <Route path="/student/login-fallback" element={<PasswordFallbackLogin />} />

                {/* Student Routes — Protected */}
                <Route path="/student/dashboard" element={<Navigate to="/student/exams" replace />} />
                <Route path="/student/exams" element={
                  <StudentProtectedRoute><ExamSelector /></StudentProtectedRoute>
                } />
                <Route path="/student/exam/:examId/checklist" element={
                  <StudentProtectedRoute><PreExamChecklist /></StudentProtectedRoute>
                } />
                <Route path="/student/exam/:examId/interface" element={
                  <StudentProtectedRoute><StudentExamInterface /></StudentProtectedRoute>
                } />
                <Route path="/student/submission-confirmation" element={
                  <StudentProtectedRoute><SubmissionConfirmation /></StudentProtectedRoute>
                } />
                <Route path="/student/results" element={
                  <StudentProtectedRoute><ResultsPage /></StudentProtectedRoute>
                } />
                <Route path="/student/settings" element={
                  <StudentProtectedRoute><SettingsPage /></StudentProtectedRoute>
                } />
                <Route path="/student/exam-briefing" element={
                  <StudentProtectedRoute><ExamBriefing /></StudentProtectedRoute>
                } />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </VoiceProvider>
          </ExamProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
  
