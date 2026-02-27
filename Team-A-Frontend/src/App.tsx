import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ExamProvider } from "./context/ExamContext";
import { VoiceProvider } from "./context/VoiceContext";

// Legacy Pages
import LandingPage from "./pages/LandingPage";
import SplashScreen from "./pages/SplashScreen";
import AdminLogin from "./pages/adminlogin";
import Dashboard from "./pages/Dashboard";
import AdminPortal from "./pages/AdminPortal";

// New Student Portal Pages
import FaceRecognitionLogin from "./pages/student/FaceRecognitionLogin";
import StudentDashboard from "./pages/student/StudentDashboard";
import ExamSelector from "./pages/student/ExamSelector";
import PreExamChecklist from "./pages/student/PreExamChecklist";
import StudentExamInterface from "./pages/student/ExamInterface";
import SubmissionConfirmation from "./pages/student/SubmissionConfirmation";
import ResultsPage from "./pages/student/ResultsPage";
import SettingsPage from "./pages/student/SettingsPage";
import PasswordFallbackLogin from "./pages/student/PasswordFallbackLogin";
import ExamBriefing from "./pages/student/ExamBriefing";

export default function App() {
  return (
    <BrowserRouter>
      <ExamProvider>
        <VoiceProvider>
        <Routes>
          {/* Legacy Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminPortal />} />
          <Route path="/student-login" element={<Navigate to="/student/login-fallback" replace />} />
          <Route path="/student-portal" element={<Navigate to="/student/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/exam" element={<Navigate to="/student/exams" replace />} />
          <Route path="/splash" element={<SplashScreen />} />

          {/* New Student Portal Routes */}
          <Route path="/student" element={<Navigate to="/student/login" replace />} />
          <Route path="/student/login" element={<FaceRecognitionLogin />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/exams" element={<ExamSelector />} />
          <Route path="/student/exam/:examId/checklist" element={<PreExamChecklist />} />
          <Route path="/student/exam/:examId/interface" element={<StudentExamInterface />} />
          <Route path="/student/submission-confirmation" element={<SubmissionConfirmation />} />
          <Route path="/student/results" element={<ResultsPage />} />
          <Route path="/student/settings" element={<SettingsPage />} />
          <Route path="/student/login-fallback" element={<PasswordFallbackLogin />} />
          <Route path="/student/exam-briefing" element={<ExamBriefing />} />

          {/* Default Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </VoiceProvider>
      </ExamProvider>
    </BrowserRouter>
  );
}
  
