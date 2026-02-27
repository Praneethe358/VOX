# VoiceSecure - Comprehensive System Analysis & Redesign

**System**: AI-Powered Voice-Based Examination System for Physically Challenged Students  
**Version**: 2.0 - Enhanced Architecture  
**Date**: February 25, 2026

---

## 📋 Table of Contents

1. [Current vs Required Features Comparison](#feature-comparison)
2. [Missing Features Analysis](#missing-features)
3. [Updated System Architecture](#system-architecture)
4. [Database Schema Redesign](#database-schema)
5. [Improved Folder Structure](#folder-structure)
6. [API Route Structure](#api-routes)
7. [Role-Based Access Control (RBAC)](#rbac)
8. [UI/UX Improvements](#ui-ux-improvements)
9. [Offline AI Model Integration](#offline-ai-models)
10. [Implementation Roadmap](#implementation-roadmap)
11. [Scalability Recommendations](#scalability)

---

## 1. Feature Comparison Table {#feature-comparison}

| **Feature Category** | **Feature** | **Current Status** | **Required** | **Priority** | **Effort** |
|---|---|---|---|---|---|
| **Exam Management** | Upload PDF & Auto-Extract | ✅ Exists | ✅ Required | P0 | Low |
| | Preview & Edit Questions | ⚠️ Partial | ✅ Required | P0 | Medium |
| | Assign Sections (Part A/B/C) | ❌ Missing | ✅ Required | P1 | Medium |
| | Set Time Limits | ✅ Exists | ✅ Required | P0 | Low |
| | Enable/Disable Voice Navigation | ❌ Missing | ✅ Required | P1 | High |
| | Question Difficulty Tagging | ❌ Missing | ✅ Required | P2 | Low |
| | Negative Marking Setup | ❌ Missing | ⚠️ Optional | P3 | Low |
| | **Student Management** | | | | |
| | Register Student | ✅ Exists | ✅ Required | P0 | Low |
| | Capture Face Data | ✅ Exists | ✅ Required | P0 | Medium |
| | Batch Face Dataset Upload | ❌ Missing | ✅ Required | P1 | High |
| | Assign Exam Eligibility | ⚠️ Partial | ✅ Required | P0 | Medium |
| | Language Preference Assignment | ❌ Missing | ✅ Required | P1 | Medium |
| | Disability Type Tagging | ❌ Missing | ✅ Required | P0 | Low |
| | Accessibility Profile Management | ❌ Missing | ✅ Required | P1 | Medium |
| | **AI Configuration** | | | | |
| | Select STT Engine | ❌ Missing | ✅ Required | P1 | High |
| | Select LLM Model | ❌ Missing | ✅ Required | P1 | High |
| | Grammar Correction Toggle | ❌ Missing | ✅ Required | P2 | Medium |
| | Auto-Save Interval Config | ❌ Missing | ✅ Required | P1 | Low |
| | Multilingual Mode Toggle | ❌ Missing | ✅ Required | P1 | Medium |
| | AI Model Version Management | ❌ Missing | ⚠️ Optional | P2 | Medium |
| | **Exam Monitoring** | | | | |
| | Real-time Activity Logs | ⚠️ Basic | ✅ Required | P0 | High |
| | Student Login Tracking | ✅ Exists | ✅ Required | P0 | Low |
| | Question Navigation Logs | ⚠️ Basic | ✅ Required | P0 | Medium |
| | Answer Word Count Tracking | ❌ Missing | ✅ Required | P1 | Low |
| | Suspicious Activity Flags | ❌ Missing | ✅ Required | P1 | High |
| | Real-time Microphone/Camera Status | ❌ Missing | ✅ Required | P1 | Medium |
| | Session Duration Tracking | ⚠️ Partial | ✅ Required | P0 | Low |
| | **Audit & Reports** | | | | |
| | Download Answer Sheet (PDF) | ❌ Missing | ✅ Required | P1 | Medium |
| | Download Activity Log | ❌ Missing | ✅ Required | P1 | Medium |
| | Export Performance Summary | ❌ Missing | ✅ Required | P1 | Medium |
| | Face Verification Logs | ⚠️ Partial | ✅ Required | P1 | Low |
| | Bulk Export (Multiple Students) | ❌ Missing | ✅ Required | P2 | High |
| | Report Visualization (Charts/Graphs) | ❌ Missing | ⚠️ Optional | P2 | High |
| | **Security Controls** | | | | |
| | Kiosk Mode Enforcement | ❌ Missing | ✅ Required | P0 | High |
| | Internet Toggle Control | ❌ Missing | ✅ Required | P0 | High |
| | Microphone Permission Verification | ❌ Missing | ✅ Required | P1 | Medium |
| | Camera Permission Verification | ❌ Missing | ✅ Required | P1 | Medium |
| | Admin Multi-Factor Authentication | ❌ Missing | ✅ Required | P0 | High |
| | Session Timeout Management | ⚠️ Basic | ✅ Required | P1 | Low |
| | IP Whitelist/Blacklist | ❌ Missing | ⚠️ Optional | P2 | Medium |

**Legend**: ✅ Exists | ⚠️ Partial/Basic | ❌ Missing

---

## 2. Missing Features Analysis {#missing-features}

### **CRITICAL (P0) - Block Development**
1. **Voice Navigation Mode Toggle** - No way to enable/disable on exam setup
2. **Disability Type Tagging** - Essential for accessibility features
3. **AI Configuration Panel** - No way to select STT/LLM engines or models
4. **Kiosk Mode Enforcement** - Essential security feature
5. **Internet Control Toggle** - Cannot disable internet during exam
6. **Admin MFA** - No multi-factor authentication for admin
7. **Suspicious Activity Flags** - No anomaly detection system

### **HIGH (P1) - Major Gaps**
1. **Question Section Assignment** (Part A/B/C tagging)
2. **Batch Face Dataset Upload** - Scalability issue for enrollment
3. **Language Preference Assignment** - Multi-language support incomplete
4. **Real-time Monitoring Dashboard** - Enhanced real-time tracking
5. **Answer Sheet & Report Export** (PDF generation)
6. **Microphone/Camera Permission Verification**
7. **Grammar Correction Toggle**
8. **Auto-Save Interval Configuration**

### **MEDIUM (P2) - Enhancements**
1. Question difficulty level tagging
2. Negative marking configuration
3. AI model version management
4. Report visualization (charts/analytics)
5. Bulk student export functionality
6. IP whitelist/blacklist system

---

## 3. Updated System Architecture {#system-architecture}

```
┌─────────────────────────────────────────────────────────────────┐
│                        VoiceSecure 2.0                          │
└─────────────────────────────────────────────────────────────────┘

FRONTEND LAYER (React + TypeScript + Vite)
├── Admin Portal
│   ├── Dashboard (Overview + Real-time Monitoring)
│   ├── Exam Management (Upload, Configure, Publish)
│   ├── Student Management (Enroll, Track, Manage)
│   ├── AI Configuration (STT, LLM, Settings)
│   ├── Monitoring & Analytics (Real-time + Historical)
│   ├── Reports & Audit (Export, Download, Logs)
│   └── Security Controls (Kiosk, Internet, MFA)
├── Student Portal
│   ├── Dashboard (Available Exams)
│   ├── Face Recognition Login
│   ├── Voice-Based Exam Interface
│   └── Auto-save & Backup
└── Utility Pages
    ├── Login & Authentication
    ├── Settings
    └── Help & Documentation

BACKEND LAYER (Node.js + Express + TypeScript)
├── API Gateway & Middleware
│   ├── Authentication (JWT + MFA)
│   ├── Authorization (RBAC)
│   ├── Rate Limiting
│   └── Error Handling
├── Routes
│   ├── /api/admin/* (Admin operations)
│   ├── /api/student/* (Student operations)
│   ├── /api/exam/* (Exam management)
│   ├── /api/ai/* (AI processing)
│   ├── /api/monitoring/* (Real-time tracking)
│   ├── /api/reports/* (Data export)
│   ├── /api/config/* (System configuration)
│   └── /api/security/* (Security controls)
├── Services
│   ├── Authentication Service
│   ├── Authorization Service (RBAC)
│   ├── Exam Service
│   ├── Student Service
│   ├── AI Service
│   │   ├── Speech-to-Text (Vosk/Whisper)
│   │   ├── Text-to-Speech (eSpeak)
│   │   └── LLM Processing (Llama 3.2 via Ollama)
│   ├── Face Recognition Service
│   ├── Audit & Logging Service
│   ├── Report Generation Service
│   ├── PDF Processing Service
│   └── Email/Notification Service
└── Database Layer
    ├── MongoDB (Production)
    ├── Mock DB (Development)
    └── Cache (Redis - Optional)

AI/ML SERVICES (Offline)
├── Vosk (Speech-to-Text)
├── Whisper (Alternative STT)
├── eSpeak (Text-to-Speech)
├── Ollama (LLM Provider)
└── face-api.js (Face Recognition)
```

---

## 4. Database Schema Redesign {#database-schema}

### **Admin Schema (Enhanced)**
```typescript
interface Admin {
  _id: ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  role: "super_admin" | "exam_admin" | "support_admin";
  department?: string;
  
  // MFA Configuration
  mfaEnabled: boolean;
  mfaSecret?: string; // TOTP secret
  
  // Permissions
  permissions: string[]; // ["exam.create", "student.manage", "reports.view"]
  
  // Audit Trail
  createdAt: Date;
  lastLogin: Date;
  loginAttempts: number;
  isActive: boolean;
  
  // MFA Recovery
  backupCodes: string[];
}
```

### **Student Schema (Enhanced)**
```typescript
interface Student {
  _id: ObjectId;
  
  // Basic Info
  studentId: string; // Unique identifier
  name: string;
  email: string;
  phoneNumber: string;
  enrollmentDate: Date;
  
  // Face Recognition
  faceDescriptor: number[]; // face-api.js descriptor
  faceDataset: {
    imageUrl: string;
    capturedAt: Date;
    quality: number; // 0-100
  }[];
  
  // Disability & Accessibility
  disabilityType: "temporary_fracture" | "permanent_motor" | "visual" | "hearing" | "other";
  accessibilityProfile: {
    requiresVoiceNavigation: boolean;
    preferredLanguage: string; // "en", "hi", "mr", etc.
    speechRate: number; // 0.5-2.0
    fontSize: number; // 12-36
    highContrast: boolean;
    textToSpeech: boolean;
  };
  
  // Exam Eligibility
  examEligibility: {
    examCode: string;
    assignedDate: Date;
    status: "eligible" | "ineligible" | "suspended";
    reason?: string;
  }[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### **Exam Schema (Enhanced)**
```typescript
interface Exam {
  _id: ObjectId;
  
  // Basic Info
  code: string; // Unique exam code
  title: string;
  description: string;
  subject: string;
  
  // Timing
  durationMinutes: number;
  scheduledDate: Date;
  startTime: string; // HH:MM format
  endTime: string;
  
  // Configuration
  status: "draft" | "active" | "scheduled" | "completed" | "archived";
  
  // Voice Navigation
  voiceNavigationEnabled: boolean;
  voiceLanguage: string; // "en", "hi", "mr"
  questionReadingEnabled: boolean;
  
  // Questions with Sections
  sections: {
    sectionId: string;
    sectionName: string; // "Part A", "Part B", etc.
    questions: Question[];
    timeLimit?: number; // Optional per-section limit
  }[];
  
  // Scoring
  totalMarks: number;
  negativeMarkingEnabled: boolean;
  negativeMarkPerQuestion?: number;
  
  // AI Configuration
  aiConfig: {
    sttEngine: "vosk" | "whisper";
    sttLanguage: string;
    sttConfidenceThreshold: number; // 0-1
    
    llmModel: "llama3.2" | "llama2" | "mistral";
    grammarCorrectionEnabled: boolean;
    answerFormatting: boolean;
    
    autoSaveInterval: number; // seconds
  };
  
  // Accessibility
  multilingualEnabled: boolean;
  supportedLanguages: string[];
  
  // Monitoring
  suspiciousActivityThresholds: {
    unusualPauseCount: number;
    unusualNavigationPattern: number;
    environmentChangeDetection: boolean;
  };
  
  // Metadata
  createdBy: ObjectId; // Admin reference
  createdAt: Date;
  updatedAt: Date;
}

interface Question {
  questionId: string;
  text: string;
  marks: number;
  difficulty: "easy" | "medium" | "hard";
  expectedAnswerLength: "short" | "medium" | "long"; // For guidance
  hints?: string[];
  correctAnswer?: string; // For reference
  explanations?: string[];
  type: "descriptive" | "numerical" | "boolean"; // Exam type
}
```

### **Student Response Schema (Enhanced)**
```typescript
interface StudentResponse {
  _id: ObjectId;
  
  // Identifiers
  studentId: string;
  examCode: string;
  sessionId: string;
  
  // Response Data
  responses: {
    questionId: string;
    sectionId: string;
    
    // Audio & Text
    audioFile?: {
      url: string;
      duration: number; // seconds
      format: string;
    };
    rawTranscript: string;
    formattedAnswer: string;
    confidence: number; // STT confidence (0-1)
    
    // Timestamps
    attemptedAt: Date;
    submittedAt: Date;
    timeSpent: number; // seconds
    
    // Evaluation
    score?: number;
    evaluatedAt?: Date;
    evaluationNotes?: string;
    
    // Flags
    suspiciousFlags: string[]; // ["unusual_pause", "background_noise", etc.]
  }[];
  
  // Session Metadata
  sessionStartTime: Date;
  sessionEndTime: Date;
  totalDuration: number; // seconds
  
  // Environment & Device
  deviceInfo: {
    userAgent: string;
    screenResolution: string;
    isFullscreen: boolean;
    browserTabs: number;
  };
  
  // Overall Status
  status: "in_progress" | "submitted" | "evaluated" | "archived";
  totalScore?: number;
  totalMarks?: number;
  percentage?: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### **Audit Log Schema (Enhanced)**
```typescript
interface AuditLog {
  _id: ObjectId;
  
  // Event Identification
  eventType: string; // "student_login", "exam_start", "answer_submit", etc.
  category: "authentication" | "exam" | "admin" | "system" | "security";
  severity: "info" | "warning" | "error" | "critical";
  
  // Actor
  actor: {
    type: "student" | "admin" | "system";
    id: string;
  };
  
  // Target
  resource: "exam" | "student" | "response" | "admin" | "system";
  resourceId: string;
  
  // Details
  action: string;
  description: string;
  metadata: {
    ipAddress: string;
    userAgent: string;
    sessionId?: string;
    examCode?: string;
    studentId?: string;
    [key: string]: any;
  };
  
  // Flags
  suspiciousActivity: boolean;
  flagReason?: string;
  
  // Timestamps
  timestamp: Date;
  
  // Resolution (for issues)
  resolved: boolean;
  resolvedBy?: ObjectId;
  resolutionNotes?: string;
  resolvedAt?: Date;
}
```

### **System Configuration Schema (New)**
```typescript
interface SystemConfig {
  _id: ObjectId;
  
  // AI Configuration
  aiSettings: {
    sttEngine: {
      primary: "vosk" | "whisper";
      fallback: "vosk" | "whisper";
      offlineOnly: boolean;
    };
    
    ttsEngine: {
      provider: "espeak"; // Future: add more
      voiceGender: "male" | "female" | "neutral";
      speechRate: number;
      language: string;
    };
    
    llmSettings: {
      provider: "ollama";
      model: "llama3.2" | "llama2" | "mistral";
      baseUrl: string; // http://localhost:11434
      timeout: number; // seconds
      offlineMode: boolean;
    };
    
    autoSaveInterval: number; // Default: 30 seconds
    grammarCorrectionEnabled: boolean;
    multilingualEnabled: boolean;
  };
  
  // Security
  security: {
    kioskModeRequired: boolean;
    internetBlockRequired: boolean;
    cameraRequired: boolean;
    microphoneRequired: boolean;
    adminMfaRequired: boolean;
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
  };
  
  // Monitoring
  monitoring: {
    realTimeLoggingEnabled: boolean;
    suspiciousActivityDetection: boolean;
    environmentMonitoring: boolean;
    biometricMonitoring: boolean;
  };
  
  // System
  system: {
    maintenanceMode: boolean;
    offlineMode: boolean;
    syncInterval: number; // For offline mode
    maxConcurrentExams: number;
  };
  
  updatedAt: Date;
  updatedBy: ObjectId;
}
```

---

## 5. Improved Folder Structure {#folder-structure}

### **Backend Folder Structure**
```
Team-A-Backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── environment.ts
│   │   ├── ai-engines.ts
│   │   └── security.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── rbac.middleware.ts
│   │   ├── error-handler.middleware.ts
│   │   ├── rate-limiter.middleware.ts
│   │   └── audit-logger.middleware.ts
│   │
│   ├── controllers/
│   │   ├── admin.controller.ts
│   │   ├── student.controller.ts
│   │   ├── exam.controller.ts
│   │   ├── ai.controller.ts
│   │   ├── monitoring.controller.ts
│   │   ├── reports.controller.ts
│   │   ├── config.controller.ts
│   │   └── security.controller.ts
│   │
│   ├── services/
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   ├── mfa.service.ts
│   │   │   ├── jwt.service.ts
│   │   │   └── rbac.service.ts
│   │   │
│   │   ├── exam/
│   │   │   ├── exam.service.ts
│   │   │   ├── question.service.ts
│   │   │   ├── exam-scheduling.service.ts
│   │   │   └── exam-validation.service.ts
│   │   │
│   │   ├── student/
│   │   │   ├── student.service.ts
│   │   │   ├── enrollment.service.ts
│   │   │   ├── biometric.service.ts (Face recognition)
│   │   │   └── disability-profile.service.ts
│   │   │
│   │   ├── ai/
│   │   │   ├── stt.service.ts (Speech-to-Text)
│   │   │   ├── tts.service.ts (Text-to-Speech)
│   │   │   ├── llm.service.ts (LLM processing)
│   │   │   ├── grammar.service.ts
│   │   │   ├── vosk.engine.ts
│   │   │   ├── whisper.engine.ts
│   │   │   └── ollama.engine.ts
│   │   │
│   │   ├── monitoring/
│   │   │   ├── activity-logger.service.ts
│   │   │   ├── anomaly-detection.service.ts
│   │   │   ├── real-time-tracking.service.ts
│   │   │   └── environment-monitor.service.ts
│   │   │
│   │   ├── reports/
│   │   │   ├── report-generator.service.ts
│   │   │   ├── pdf-export.service.ts
│   │   │   ├── analytics.service.ts
│   │   │   └── performance-summary.service.ts
│   │   │
│   │   └── security/
│   │       ├── kiosk-enforcer.service.ts
│   │       ├── internet-blocker.service.ts
│   │       ├── permission-verifier.service.ts
│   │       └── security-audit.service.ts
│   │
│   ├── routes/
│   │   ├── admin.routes.ts
│   │   ├── student.routes.ts
│   │   ├── exam.routes.ts
│   │   ├── ai.routes.ts
│   │   ├── monitoring.routes.ts
│   │   ├── reports.routes.ts
│   │   ├── config.routes.ts
│   │   ├── security.routes.ts
│   │   └── health.routes.ts
│   │
│   ├── database/
│   │   ├── connection.ts
│   │   ├── mongo-client.ts
│   │   ├── mock-mongo.ts
│   │   ├── models/
│   │   │   ├── Admin.ts
│   │   │   ├── Student.ts
│   │   │   ├── Exam.ts
│   │   │   ├── StudentResponse.ts
│   │   │   ├── AuditLog.ts
│   │   │   ├── SystemConfig.ts
│   │   │   └── Session.ts
│   │   ├── migrations/
│   │   │   ├── 001_initial_schema.ts
│   │   │   ├── 002_add_mfa.ts
│   │   │   ├── 003_add_voice_navigation.ts
│   │   │   ├── 004_add_disability_profiles.ts
│   │   │   └── README.md
│   │   └── seed.ts
│   │
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── encryption.ts
│   │   ├── validators.ts
│   │   ├── file-handlers.ts
│   │   ├── error-handler.ts
│   │   ├── constants.ts
│   │   └── helpers.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── api.types.ts
│   │   ├── database.types.ts
│   │   ├── auth.types.ts
│   │   ├── ai.types.ts
│   │   └── monitoring.types.ts
│   │
│   ├── server/
│   │   ├── express-app.ts
│   │   ├── server.ts
│   │   ├── standalone.ts
│   │   └── standalone-mock.ts
│   │
│   └── main.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

### **Frontend Folder Structure**
```
Team-A-Frontend/
├── src/
│   ├── pages/
│   │   ├── common/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   │
│   │   ├── admin/
│   │   │   ├── AdminPortal.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ExamManagement.tsx
│   │   │   ├── StudentManagement.tsx
│   │   │   ├── AIConfiguration.tsx
│   │   │   ├── MonitoringDashboard.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   ├── SecurityControlsPage.tsx
│   │   │   ├── AdminSettings.tsx
│   │   │   └── UserManagement.tsx
│   │   │
│   │   ├── student/
│   │   │   ├── StudentPortal.tsx
│   │   │   ├── ExamListPage.tsx
│   │   │   ├── ExamInterface.tsx
│   │   │   ├── FaceRecognitionLogin.tsx
│   │   │   ├── PreExamChecklist.tsx
│   │   │   └── ResultsPage.tsx
│   │   │
│   │   └── settings/
│   │       ├── SettingsPage.tsx
│   │       ├── ProfileSettings.tsx
│   │       ├── AccessibilitySettings.tsx
│   │       └── HelpPage.tsx
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   ├── ExamUploadForm.tsx
│   │   │   ├── QuestionEditor.tsx
│   │   │   ├── StudentEnrollmentForm.tsx
│   │   │   ├── BatchUploadModal.tsx
│   │   │   ├── AIConfigPanel.tsx
│   │   │   ├── RealTimeMonitor.tsx
│   │   │   ├── SuspiciousActivityAlert.tsx
│   │   │   ├── ExportReportButton.tsx
│   │   │   └── KioskModeToggle.tsx
│   │   │
│   │   ├── student/
│   │   │   ├── VoiceNavigationBar.tsx
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── AnswerRecorder.tsx
│   │   │   ├── MicrophoneIndicator.tsx
│   │   │   ├── CameraIndicator.tsx
│   │   │   ├── ExamTimer.tsx
│   │   │   ├── SectionNavigator.tsx
│   │   │   └── AutoSaveIndicator.tsx
│   │   │
│   │   ├── common/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── InputField.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Dialog.tsx
│   │   │   └── DataTable.tsx
│   │   │
│   │   └── charts/
│   │       ├── PerformanceChart.tsx
│   │       ├── ActivityChart.tsx
│   │       ├── StudentStatsChart.tsx
│   │       └── TimeSeriesChart.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useRBAC.ts
│   │   ├── useSpeech.ts
│   │   ├── useMicrophone.ts
│   │   ├── useCamera.ts
│   │   ├── useKiosk.ts
│   │   ├── useExam.ts
│   │   ├── useFaceRecognition.ts
│   │   └── useRealTimeUpdates.ts
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── admin.api.ts
│   │   │   ├── student.api.ts
│   │   │   ├── exam.api.ts
│   │   │   ├── ai.api.ts
│   │   │   ├── monitoring.api.ts
│   │   │   ├── reports.api.ts
│   │   │   └── apiClient.ts
│   │   │
│   │   ├── auth/
│   │   │   ├── authService.ts
│   │   │   ├── mfaService.ts
│   │   │   └── tokenService.ts
│   │   │
│   │   ├── storage/
│   │   │   ├── localStorage.ts
│   │   │   └── sessionStorage.ts
│   │   │
│   │   └── notification/
│   │       └── notificationService.ts
│   │
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── ExamContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── NotificationContext.tsx
│   │
│   ├── utils/
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   ├── constants.ts
│   │   ├── storage.ts
│   │   ├── audio.utils.ts
│   │   └── helpers.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── api.types.ts
│   │   ├── admin.types.ts
│   │   ├── student.types.ts
│   │   └── monitoring.types.ts
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   ├── variables.css
│   │   ├── accessibility.css
│   │   └── animations.css
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── public/
│   ├── models/ (AI models for offline use)
│   │   ├── vosk-model/
│   │   ├── face-models/
│   │   └── README.md
│   └── icons/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env
├── .env.example
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── package.json
```

---

## 6. API Route Structure {#api-routes}

### **Authentication Routes**
```
POST   /api/auth/login              - Admin/Student login
POST   /api/auth/logout             - Logout
POST   /api/auth/refresh-token      - Refresh JWT
POST   /api/auth/verify-mfa         - Complete MFA challenge
POST   /api/auth/setup-mfa          - Setup TOTP
GET    /api/auth/me                 - Get current user
```

### **Admin Routes**
```
// Dashboard & Overview
GET    /api/admin/dashboard         - Get dashboard metrics
GET    /api/admin/stats             - System statistics

// Admin Management (Super Admin only)
POST   /api/admin/create-admin      - Create new admin user
GET    /api/admin/list              - List all admins
PUT    /api/admin/:id               - Update admin
DELETE /api/admin/:id               - Delete admin
GET    /api/admin/:id/permissions   - Get admin permissions
POST   /api/admin/:id/reset-mfa     - Reset admin MFA

// User Management
GET    /api/admin/manage/users      - List all users (paginated)
PUT    /api/admin/manage/users/:id  - Update user
DELETE /api/admin/manage/users/:id  - Delete user
POST   /api/admin/manage/users/bulk-action - Bulk operations
```

### **Exam Management Routes**
```
// CRUD Operations
POST   /api/exam/create             - Create new exam (draft)
GET    /api/exam/list               - List all exams (with filters)
GET    /api/exam/:code              - Get exam details
PUT    /api/exam/:code              - Update exam
DELETE /api/exam/:code              - Delete exam (draft only)

// PDF Processing
POST   /api/exam/upload-pdf         - Upload & parse PDF
GET    /api/exam/:code/questions    - Get exam questions
PUT    /api/exam/:code/questions    - Edit questions
POST   /api/exam/:code/questions/bulk - Bulk update questions

// Sections
POST   /api/exam/:code/sections     - Create section
PUT    /api/exam/:code/sections/:sectionId - Update section
DELETE /api/exam/:code/sections/:sectionId - Delete section

// Publishing & Scheduling
POST   /api/exam/:code/publish      - Publish exam (active)
POST   /api/exam/:code/schedule     - Schedule for future
POST   /api/exam/:code/archive      - Archive exam
GET    /api/exam/scheduled          - Get upcoming exams

// Configuration
POST   /api/exam/:code/config       - Set AI & voice config
PUT    /api/exam/:code/config       - Update config
GET    /api/exam/:code/config       - Get config
```

### **Student Management Routes**
```
// Registration & Enrollment
POST   /api/student/register        - Register single student
POST   /api/student/batch-register  - Bulk import students
GET    /api/student/list            - List students (paginated)
GET    /api/student/:studentId      - Get student details
PUT    /api/student/:studentId      - Update student profile

// Face Recognition & Biometrics
POST   /api/student/:studentId/face/capture    - Capture face image
POST   /api/student/:studentId/face/dataset    - Upload face dataset
GET    /api/student/:studentId/face/status     - Get face verification status
POST   /api/student/:studentId/face/verify     - Verify face during login

// Accessibility Profile
PUT    /api/student/:studentId/accessibility  - Update profile
GET    /api/student/:studentId/accessibility  - Get profile

// Exam Eligibility
POST   /api/student/:studentId/assign-exam    - Assign exam
DELETE /api/student/:studentId/assign-exam    - Remove exam assignment
GET    /api/student/:studentId/exams          - Get eligible exams
POST   /api/student/:studentId/suspend        - Suspend student
```

### **AI Processing Routes**
```
// Speech-to-Text
POST   /api/ai/stt/transcribe       - Transcribe audio to text
POST   /api/ai/stt/command          - Process voice commands
GET    /api/ai/stt/engines          - List available STT engines

// Text-to-Speech
POST   /api/ai/tts/speak            - Convert text to speech
GET    /api/ai/tts/supported-languages - Get TTS languages

// LLM Processing
POST   /api/ai/llm/format-answer    - Format answer using LLM
POST   /api/ai/llm/grammar-check    - Grammar check answer
GET    /api/ai/llm/models           - List available models

// Configuration
GET    /api/ai/config               - Get AI configuration
PUT    /api/ai/config               - Update AI configuration
GET    /api/ai/status               - Get AI services status
```

### **Exam Session Routes**
```
// Student Exam Flow
POST   /api/exam-session/start      - Start exam session
GET    /api/exam-session/:sessionId - Get session details
POST   /api/exam-session/:sessionId/answer - Submit answer to question
POST   /api/exam-session/:sessionId/navigate - Navigate to question
POST   /api/exam-session/:sessionId/auto-save - Trigger auto-save
POST   /api/exam-session/:sessionId/submit - Submit exam
POST   /api/exam-session/:sessionId/end - End exam session

// Session Management
GET    /api/exam-session/active     - Get active sessions
POST   /api/exam-session/:sessionId/pause - Pause session
POST   /api/exam-session/:sessionId/resume - Resume session
```

### **Monitoring & Real-time Routes**
```
// Real-time Monitoring
WS     /api/monitoring/ws           - WebSocket for real-time updates
GET    /api/monitoring/live         - List live exam sessions
GET    /api/monitoring/:sessionId   - Get session real-time data

// Activity Logs
GET    /api/monitoring/logs         - Get activity logs (paginated)
GET    /api/monitoring/logs/student/:studentId - Student activity
GET    /api/monitoring/logs/exam/:examCode - Exam activity

// Anomaly Detection
GET    /api/monitoring/anomalies    - Get detected anomalies
GET    /api/monitoring/anomalies/:sessionId - Session anomalies
POST   /api/monitoring/anomalies/:id/flag - Flag as suspicious
```

### **Reports & Exports Routes**
```
// Report Generation
GET    /api/reports/performance     - Performance report
GET    /api/reports/activity        - Activity log report
GET    /api/reports/summary         - Performance summary

// Exports
POST   /api/reports/export/pdf      - Export answers as PDF
POST   /api/reports/export/csv      - Export data as CSV
POST   /api/reports/export/logs     - Export activity logs

// Analytics
GET    /api/reports/analytics/dashboard - Analytics dashboard
GET    /api/reports/analytics/student/:studentId - Student analytics
GET    /api/reports/analytics/exam/:examCode - Exam analytics
```

### **Security & Controls Routes**
```
// Kiosk Mode
POST   /api/security/kiosk/enable   - Enable kiosk on device
POST   /api/security/kiosk/disable  - Disable kiosk
GET    /api/security/kiosk/status   - Get kiosk status

// Internet Control
POST   /api/security/internet/block - Block internet access
POST   /api/security/internet/unblock - Unblock internet
GET    /api/security/internet/status - Get internet status

// Permission Checks
GET    /api/security/permissions/microphone - Check microphone access
GET    /api/security/permissions/camera - Check camera access
POST   /api/security/permissions/request - Request permissions

// Session Management
POST   /api/security/session/timeout - Set session timeout
GET    /api/security/session/active - Get active sessions
DELETE /api/security/session/:sessionId - Terminate session
```

### **System Configuration Routes**
```
// Configuration
GET    /api/config                  - Get system config
PUT    /api/config                  - Update system config
GET    /api/config/ai               - Get AI settings
PUT    /api/config/ai               - Update AI settings
GET    /api/config/security         - Get security settings
PUT    /api/config/security         - Update security settings
GET    /api/config/monitoring       - Get monitoring settings
PUT    /api/config/monitoring       - Update monitoring settings

// System Health
GET    /api/health                  - Health check
GET    /api/health/services         - Services status
GET    /api/health/database         - Database status
GET    /api/health/ai-engines       - AI engines status
```

---

## 7. Role-Based Access Control (RBAC) {#rbac}

### **Roles & Permissions**

```typescript
// Roles
enum AdminRole {
  SUPER_ADMIN = "super_admin",       // Full system access
  EXAM_ADMIN = "exam_admin",         // Exam management
  MONITOR_ADMIN = "monitor_admin",   // Monitoring only
  SUPPORT_ADMIN = "support_admin"    // Support & help
}

// Permission Mapping
const rolePermissions = {
  super_admin: [
    // User Management
    "user:create",
    "user:read",
    "user:update",
    "user:delete",
    
    // Exam Management (full)
    "exam:create",
    "exam:read",
    "exam:update",
    "exam:delete",
    "exam:publish",
    "exam:archive",
    
    // Student Management (full)
    "student:create",
    "student:read",
    "student:update",
    "student:delete",
    "student:enroll",
    "student:suspend",
    
    // AI Configuration
    "ai:read",
    "ai:update",
    "ai:configure",
    
    // Monitoring
    "monitoring:read",
    "monitoring:realtime",
    "monitoring:flags",
    
    // Reports
    "reports:read",
    "reports:export",
    "reports:analytics",
    
    // Security
    "security:kiosk",
    "security:internet",
    "security:permissions",
    "security:mfa",
    
    // System Config
    "config:read",
    "config:update",
    "audit:read"
  ],
  
  exam_admin: [
    "exam:create",
    "exam:read",
    "exam:update",
    "exam:publish",
    "exam:archive",
    "student:read",
    "student:enroll",
    "monitoring:read",
    "monitoring:realtime",
    "reports:read",
    "reports:export"
  ],
  
  monitor_admin: [
    "monitoring:read",
    "monitoring:realtime",
    "monitoring:flags",
    "exam:read",
    "student:read",
    "reports:read"
  ],
  
  support_admin: [
    "student:read",
    "exam:read",
    "reports:read",
    "monitoring:read"
  ]
};
```

### **RBAC Middleware**
```typescript
// Example usage in routes
async function deleteAdmin(req, res, next) {
  // Authorization: Check if user has "user:delete" permission
  await rbacMiddleware(req, res, next, ["user:delete"]);
  // Proceed with deletion...
}

// In routes:
router.delete("/admin/:id", async (req, res) => {
  await requirePermission("user:delete")(req, res, () => {
    // Route logic
  });
});
```

---

## 8. UI/UX Improvements {#ui-ux-improvements}

### **Admin Panel Enhancements**

#### **Exam Management**
- **Visual Question Editor**: WYSIWYG editor for questions with preview
- **Section-based Organization**: Drag-and-drop sections and questions
- **Question Difficulty Indicator**: Color-coded badges (Easy/Medium/Hard)
- **PDF Parser Preview**: Show extracted questions before saving
- **Voice Configuration Panel**: Toggle voice navigation, select language
- **Question Validation**: Real-time error highlighting
- **Bulk Operations**: Select multiple questions for quick edits

#### **Student Management**
- **Enrollment Wizard**: Step-by-step student registration with face capture
- **Batch Upload Interface**: Drag-drop CSV/face dataset upload
- **Student Card View**: Visual display of student status & accessibility profile
- **Face Recognition Tester**: Preview face descriptor data
- **Disability Profile Builder**: UI to configure accessibility settings
- **Quick Assign Exam**: Bulk exam assignment with filters

#### **AI Configuration**
- **Configuration Dashboard**: 
  - STT Engine selection with live preview
  - LLM Model selector with description
  - Grammar correction toggle with examples
  - Auto-save interval slider (5-300 seconds)
  - Multilingual mode toggle
  - Test buttons to verify services
  
- **Live Testing Interface**:
  - Record audio → see STT output
  - Enter text → hear TTS output
  - Sample answer → see LLM formatting
  - All with real-time feedback

#### **Real-time Monitoring**
- **Live Session Dashboard**:
  - Active exam sessions map
  - Per-student audio waveform
  - Question progress bar
  - Microphone/camera status indicators
  - Live word count tracking
  - Real-time suspicious activity flags
  
- **Anomaly Alert System**:
  - Visual alerts for unusual patterns
  - One-click drill-down to see details
  - Action buttons (pause/investigate/report)
  
- **Session Timeline**: 
  - Visual timeline of student actions
  - Hover for timestamps and details

#### **Reports & Exports**
- **Report Builder**: 
  - Custom report templates
  - Date range selectors
  - Filter by exam, student, scores
  - Preview before export
  
- **Export Options**:
  - PDF with formatted answers & analysis
  - CSV for spreadsheet analysis
  - Interactive charts (Chart.js/D3.js)
  - Email delivery option

#### **Security Controls**
- **Security Checklist Dashboard**:
  - Kiosk mode toggle with status
  - Internet control with confirmation
  - Permission verification checklist
  - MFA setup guide for admins
  - Session timeout configurations
  - IP whitelist manager

### **Student Portal Enhancements**

#### **Face Recognition Login**
- **Clear Visual Feedback**:
  - Green checkmark when face recognized
  - Red "x" if not recognized
  - Retry guidance
  - Help text for poor lighting/angles
  
- **Fallback Options**: Face + password combo
- **Accessibility**: High contrast mode, larger UI elements

#### **Voice Navigation Interface**
- **Voice Command Indicator**: Show active listening status
- **Visual Voice Feedback**: Waveform animation during recording
- **Transcription Display**: Show what was heard in real-time
- **Command Suggestions**: Tooltip hints for available commands
- **Navigation History**: Breadcrumb showing current question

#### **Answer Recording**
- **Microphone Status**: Visual indicator + dB level meter
- **Recording Controls**: Large, accessible buttons
- **Audio Preview**: Play back before submission
- **Auto-save Indicator**: "Saved at HH:MM" timestamp
- **Time Spent Per Question**: Counter showing question duration

#### **Exam Interface**
- **Enhanced Timer**: Large, easy-to-read countdown
- **Section Progress Tabs**: Visual tabs for Part A/B/C
- **Question Navigator**: 
  - Question number circles
  - Color indicators (attempted/unattempted/flagged)
  - Shortcut numbers for quick jumps
  
- **Gesture Controls** (Optional):
  - Voice: "Next", "Previous", "Review"
  - Button swipes for question navigation

### **Accessibility Features**

1. **WCAG 2.1 AA Compliance**:
   - Proper color contrast ratios
   - Large font options (up to 36px)
   - High contrast mode
   - Screen reader support

2. **Keyboard Navigation**:
   - Tab through all controls
   - Enter/Space to activate
   - Arrow keys for navigation
   - Essential shortcuts (Escape to exit)

3. **Text-to-Speech Integration**:
   - SummernoteEditor with TTS for admin panel
   - Questions read aloud automatically
   - Speed control (0.5x - 2x)

4. **Voice Navigation**:
   - Hands-free exam navigation
   - Clear voice feedback
   - Command confirmation before action

---

## 9. Offline AI Model Integration {#offline-ai-models}

### **Architecture**

```
┌────────────────────────────────────────────────────────┐
│               VoiceSecure Offline Architecture         │
└────────────────────────────────────────────────────────┘

FRONTEND (Browser)
├── audio capture → WAV/MP3
│   └── Send to Backend
│
└── TTS output player
    └── Received from Backend

BACKEND (Node.js)
├── STT Engine Layer
│   ├── Vosk (Primary - 100MB models)
│   │   └── Models in: public/models/vosk-models/
│   │   └── Supports: en-us, hi-in, mr-in (add more)
│   │
│   └── Whisper (Fallback - 140MB for base, 1.5GB for large)
│       └── Models downloaded & cached on first run
│       └── Supports: All languages
│
├── TTS Engine Layer
│   └── eSpeak (System-wide, <10MB)
│       └── Supports: Multiple languages via MBROLA
│       └── Voice selection: Male/Female/Neutral
│
└── LLM Engine Layer
    └── Ollama Service
        ├── Llama 3.2 (7B or 13B - ~5-13GB)
        ├── Mistral (7B - ~4GB)
        ├── Llama 2 (7B - ~4GB)
        └── Local HTTP API on :11434

STORAGE
├── AI Models (Downloaded once, cached)
│   ├── /models/vosk/* (100MB each)
│   ├── /models/whisper/* (140MB - 1.5GB)
│   ├── ~/.ollama/models/* (Via Ollama config)
│   └── Cache for Whisper & Ollama
│
└── Application Data (MongoDB/Local)
    └── Exam responses, logs, configs
```

### **Installation & Setup**

#### **Backend Setup**
```bash
# 1. Install system dependencies
# Windows (PowerShell Admin):
winget install ollama
# OR manual: https://ollama.ai

# Linux:
curl https://ollama.ai/install.sh | sh

# 2. Download models (one-time)
ollama pull llama3.2:7b      # ~5GB
ollama pull mistral:7b       # ~4GB

# 3. Start Ollama in background
ollama serve                  # Runs on localhost:11434

# 4. Install Vosk models
npm run install-vosk-models  # Custom script

# 5. Install eSpeak (if not present)
# Windows: https://github.com/espeak-ng/espeak-ng/releases
# Linux: sudo apt-get install espeak-ng
# macOS: brew install espeak-ng
```

#### **Environment Configuration**
```env
# .env
OFFLINE_MODE=true
STT_ENGINE=vosk              # vosk | whisper
STT_LANGUAGE=en-US          # Vosk: en-US, hi-IN, etc
TTT_ENGINE=espeak           # espeak
TTS_VOICE_GENDER=male       # male | female | neutral
LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2       # Model name to use
AI_CACHE_DIR=./ai-cache     # Cache directory
```

### **Service Implementation**

#### **STT Service (vosk + whisper)**
```typescript
// src/services/ai/stt.service.ts

class STTService {
  private engine: "vosk" | "whisper";
  private voskRecognizer?: VoskRecognizer;
  private whisperModel?: WhisperModel;
  
  async transcribeAudio(audioBuffer: Buffer): Promise<{
    text: string;
    confidence: number; // 0-1
    isFinal: boolean;
  }> {
    try {
      if (this.engine === "vosk") {
        return this.transcribeVosk(audioBuffer);
      } else {
        return this.transcribeWhisper(audioBuffer);
      }
    } catch (error) {
      // Fallback strategy
      if (this.engine === "vosk") {
        return this.transcribeWhisper(audioBuffer);
      } else {
        return this.transcribeVosk(audioBuffer);
      }
    }
  }
  
  private transcribeVosk(audioBuffer: Buffer) {
    // Vosk implementation
    // Fast, lightweight, lower accuracy
    // Model: 100MB
  }
  
  private transcribeWhisper(audioBuffer: Buffer) {
    // Whisper implementation
    // Higher accuracy, larger models
    // Slower than Vosk (~2-3 sec per 30 sec audio)
  }
}
```

#### **TTS Service (eSpeak)**
```typescript
// src/services/ai/tts.service.ts

class TTSService {
  async synthesizeSpeech(text: string, options: {
    language: string;
    voiceGender: "male" | "female" | "neutral";
    speechRate: number; // 0.5-2.0
  }): Promise<Buffer> {
    // Use eSpeak to convert text to speech
    // Returns WAV buffer
    // Supports multilingual output
  }
  
  async getSupportedLanguages(): Promise<string[]> {
    // Return list of available languages
  }
}
```

#### **LLM Service (Ollama)**
```typescript
// src/services/ai/llm.service.ts

class LLMService {
  private ollamaUrl: string; // localhost:11434
  
  async formatAnswer(rawAnswer: string, options: {
    model: "llama3.2" | "mistral";
    grammarCorrection: boolean;
    contextFromQuestion?: string;
  }): Promise<{
    formattedAnswer: string;
    corrections: string[];
    confidence: number;
  }> {
    // Send to Ollama API
    // Format answer properly
    // Apply grammar correction if enabled
  }
  
  async checkAnswerAccuracy(
    studentAnswer: string,
    expectedAnswer: string,
  ): Promise<{
    accuracy: number;
    feedback: string;
  }> {
    // Optional: Compare answers using LLM
  }
}
```

### **Offline Mode Workflow**

```
EXAM START:
1. Frontend requests exam from backend
2. Backend serves exam with questions (all cached locally)
3. Frontend starts audio capture (stored locally)

DURING EXAM:
4. Voice command → STT (offline via Vosk)
5. Answer recording → STT transcription (offline)
6. Answer → LLM formatting (offline via Ollama)
7. Question text → TTS (offline via eSpeak)
8. All responses stored locally (IndexedDB/SQLite)
9. All logs stored locally

EXAM END:
10. Student clicks "Submit"
11. Sync service detects internet status:
    ✓ Internet available → Upload to server
    ✗ No internet → Store locally, retry later (Service Worker)
12. Backup auto-created locally

SYNC RETRY (when internet available):
13. Service Worker detects connection
14. Auto-uploads cached responses
15. Fetches any new exam updates
```

### **Model Size Reference**

| Model | Size | Speed | Accuracy | Use Case |
|-------|------|-------|----------|----------|
| Vosk (en-US) | 100MB | ⚡ Fast | ⭐⭐⭐ | Low-resource environments |
| Whisper (base) | 140MB | ⚡⚡ Medium | ⭐⭐⭐⭐⭐ | Best accuracy (English) |
| Whisper (small) | 466MB | ⚡⭐ Medium | ⭐⭐⭐⭐ | Multi-language support |
| eSpeak-ng | <10MB | ⚡⚡ Fast | ⭐⭐⭐ | Universal TTS |
| Llama 3.2 (7B) | ~5GB | ⚡⭐ Slow | ⭐⭐⭐⭐⭐ | Grammar, formatting |
| Mistral (7B) | ~4GB | ⚡⭐ Slow | ⭐⭐⭐⭐ | Fast inference |

### **Bandwidth Optimization**

```typescript
// Exam Interface - Offline Mode Strategy

// 1. Pre-cache on exam start
const preCacheExam = async (examCode) => {
  // Download question PDFs
  // Download model weights if needed
  // Pre-generate TTS for all questions
  // Store in IndexedDB with compression
};

// 2. Stream audio in chunks
// Rather than: record → send 10MB file
// Do: send 50KB chunks every 500ms
const streamAudioChunks = (audioInput) => {
  const chunks = [];
  audioInput.ondata = (chunk) => {
    chunks.push(chunk);
    if (chunks.length > 5) {
      sendChunkToServer(chunks.shift());
    }
  };
};

// 3. Compress responses before upload
const compressResponse = (response) => {
  // gzip text, compress audio
  // Reduce from 5MB to ~200KB
};
```

---

## 10. Implementation Roadmap {#implementation-roadmap}

### **Phase 1: Foundation (Weeks 1-2)**
**Focus**: Database schema & RBAC infrastructure

- [ ] Update MongoDB schemas (✅ All 6 collections)
- [ ] Create database migrations
- [ ] Implement RBAC middleware
- [ ] JWT + MFA token generation
- [ ] Admin role permission system
- [ ] Database indexes & optimization
- [ ] Unit tests for auth & RBAC

**Deliverables**:
- Enhanced database
- Working RBAC middleware
- MFA token service

---

### **Phase 2: Admin Panel - Core Features (Weeks 3-5)**
**Focus**: Exam management & student enrollment

**Exam Management**:
- [ ] Improved exam upload interface
- [ ] Question editor with sections
- [ ] Voice navigation configuration
- [ ] Question preview & validation
- [ ] Exam publishing workflow

**Student Management**:
- [ ] Batch student upload (CSV)
- [ ] Face dataset upload interface
- [ ] Accessibility profile builder
- [ ] Exam assignment UI
- [ ] Student list & filtering

**Backend**:
- [ ] New exam routes with sections
- [ ] Student bulk import service
- [ ] Face dataset storage & indexing
- [ ] Validation services

**Tests**: End-to-end exams for exam upload → publish → student assignment

---

### **Phase 3: AI Configuration & Services (Weeks 6-8)**
**Focus**: Offline AI models integration

**Backend Services**:
- [ ] Vosk STT integration
- [ ] Whisper fallback setup
- [ ] eSpeak TTS service
- [ ] Ollama LLM integration
- [ ] Grammar correction service
- [ ] Model auto-download & caching

**Frontend**:
- [ ] AI Configuration Dashboard
- [ ] Live STT/TTS/LLM testing interface
- [ ] Engine switcher UI
- [ ] Language selector
- [ ] Settings persistence

**Deployment**:
- [ ] Docker setup with Vosk models
- [ ] Installation guide
- [ ] Configuration validation
- [ ] Fallback mechanisms

---

### **Phase 4: Real-time Monitoring (Weeks 9-11)**
**Focus**: Live tracking & anomaly detection

**Backend**:
- [ ] WebSocket server setup
- [ ] Real-time session tracking
- [ ] Anomaly detection algorithms
- [ ] Suspicious activity flagging
- [ ] Environment monitoring (audio/video)
- [ ] Performance optimization

**Frontend**:
- [ ] Real-time monitoring dashboard
- [ ] Live session map
- [ ] Anomaly alert system
- [ ] Session timeline
- [ ] Drill-down analytics

**Features**:
- [ ] Word count tracking
- [ ] Pause/navigation pattern analysis
- [ ] Background noise detection
- [ ] Multi-tab detection
- [ ] Mouse/keyboard unusual activity

---

### **Phase 5: Security & Controls (Weeks 12-13)**
**Focus**: Kiosk mode & security enforcement

**Electron/Desktop**:
- [ ] Kiosk mode enforcement
- [ ] Internet blocking
- [ ] Permission verification
- [ ] Screen capture prevention
- [ ] Fullscreen enforcement

**Backend**:
- [ ] Security control APIs
- [ ] Permission verification service
- [ ] MFA service (TOTP/Email)
- [ ] Session timeout enforcement
- [ ] Audit logging for all actions

**Frontend**:
- [ ] Security controls dashboard
- [ ] Pre-exam checklist
- [ ] Permission request flows
- [ ] Admin MFA setup/verify

---

### **Phase 6: Reporting & Exports (Weeks 14-15)**
**Focus**: Analytics & data export

**Backend**:
- [ ] PDF generation service
- [ ] CSV export service
- [ ] Analytics computation
- [ ] Report templating
- [ ] Batch export operations

**Frontend**:
- [ ] Report builder UI
- [ ] Chart visualization (Chart.js)
- [ ] Filter & search
- [ ] Export scheduling
- [ ] Email delivery integration

**Features**:
- [ ] Performance analytics
- [ ] Student comparison
- [ ] Exam statistics
- [ ] Activity timeline export
- [ ] Downloadable certificates

---

### **Phase 7: Testing & Optimization (Weeks 16-17)**
**Focus**: Quality & performance

- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] E2E tests (exam flow)
- [ ] Performance testing
- [ ] Load testing (concurrent exams)
- [ ] Security audit
- [ ] Accessibility testing (WCAG 2.1 AA)

---

### **Phase 8: Deployment & Documentation (Week 18)**
**Focus**: Production readiness

- [ ] Docker containers
- [ ] Kubernetes manifests
- [ ] Database backup strategy
- [ ] CI/CD pipeline
- [ ] Documentation (API, Admin, User)
- [ ] Training materials
- [ ] Migration guide
- [ ] Launch checklist

---

### **Timeline Summary**

```
Week 1-2:   Foundation (RBAC, Schemas)
Week 3-5:   Admin Panel (Exams, Students)
Week 6-8:   AI Services (Vosk, Whisper, Ollama)
Week 9-11:  Monitoring (Real-time, Anomaly Detection)
Week 12-13: Security (Kiosk, MFA, Controls)
Week 14-15: Reporting (Export, Analytics)
Week 16-17: Testing & Optimization
Week 18:    Deployment & Documentation

Total: ~18 weeks (4.5 months)
```

---

## 11. Scalability Recommendations {#scalability}

### **Horizontal Scaling**

```
Current (Single Server):
┌─────────────────────────┐
│  Frontend (React)       │
│  Backend (Express)      │
│  Database (MongoDB)     │
│  AI Services (Local)    │
└─────────────────────────┘

Scaled Architecture:
┌────────────────────────────────────┐
│      Load Balancer (Nginx)         │
├────────────────────────────────────┤
│  Backend Pod 1  │  Backend Pod 2   │
│  Backend Pod 3  │  Backend Pod 4   │
├────────────────────────────────────┤
│    MongoDB Replica Set (3 nodes)   │
├────────────────────────────────────┤
│  AI Service Pod 1 │  AI Pod 2      │
│  AI Service Pod 3 │  AI Pod 4      │
├────────────────────────────────────┤
│  Redis Cache (2 nodes + sentinel)  │
└────────────────────────────────────┘
```

### **Database Optimization**

1. **MongoDB Replica Set** (3 nodes minimum):
   - Primary: Writes
   - Secondary 1: Reads + backups
   - Secondary 2: Reads + disaster recovery

2. **Indexes**:
   ```javascript
   // Exam Collection
   db.exams.createIndex({ code: 1 })
   db.exams.createIndex({ createdBy: 1, status: 1 })
   
   // Student Collection
   db.students.createIndex({ studentId: 1 }, { unique: true })
   db.students.createIndex({ examCode: 1 })
   
   // Responses Collection
   db.responses.createIndex({ studentId: 1, examCode: 1 })
   db.responses.createIndex({ sessionId: 1 })
   db.responses.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 }) // TTL
   
   // Audit Logs
   db.audits.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 }) // 30 day TTL
   db.audits.createIndex({ studentId: 1, timestamp: -1 })
   ```

3. **Sharding Strategy**:
   - Shard key: `studentId` (good cardinality)
   - Separate collections for hot data (current exams) vs. cold (archived)

### **API Gateway & Rate Limiting**

```javascript
// Nginx configuration for load balancing
upstream backend_servers {
    server srv1.example.com:3000;
    server srv2.example.com:3000;
    server srv3.example.com:3000;
}

server {
    listen 80;
    
    # Rate limiting per IP
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    
    location /api {
        limit_req zone=api_limit burst=200;
        proxy_pass http://backend_servers;
    }
}
```

### **Caching Strategy (Redis)**

```typescript
// Service with caching
class CacheService {
  private redis: Redis;
  
  // Cache exam for 1 hour
  async getExam(examCode: string) {
    const cached = await this.redis.get(`exam:${examCode}`);
    if (cached) return JSON.parse(cached);
    
    const exam = await db.exams.findOne({ code: examCode });
    await this.redis.setex(`exam:${examCode}`, 3600, JSON.stringify(exam));
    return exam;
  }
  
  // Cache student faces for fast recognition
  async getFaceDescriptors(studentId: string) {
    const key = `faces:${studentId}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);
    
    const faces = await db.students.findOne({ studentId });
    await this.redis.setex(key, 86400, JSON.stringify(faces));
    return faces;
  }
  
  // Session caching (for real-time monitoring)
  async cacheSession(sessionId: string, data: any) {
    // Store for 4 hours (typical exam duration + buffer)
    await this.redis.setex(`session:${sessionId}`, 14400, JSON.stringify(data));
  }
}
```

### **Microservices (Future)**

```
Stage 1 (Current): Monolithic
├── Backend (Express)
└── Database (MongoDB)

Stage 2 (6 months): Microservices
├── Admin Service (Exam, Student mgmt)
├── Student Service (Exam, responses)
├── AI Service (STT, TTS, LLM)
├── Monitoring Service (Real-time tracking)
├── Report Service (Export, analytics)
└── Authentication Service (JWT, MFA)
   ↓
   API Gateway (Kong / Nginx)
   ↓
   Message Queue (RabbitMQ / Kafka)
   ↓
   Databases:
   ├── Main (MongoDB)
   ├── Cache (Redis)
   └── Message Store (Event Log)
```

### **AI Services Scaling**

```
Single Machine:
Vosk (1 instance) + eSpeak (1) + Ollama (1)
Max concurrent: ~5-10

Scaled:
├── Vosk Service (3-5 containers)
├── Whisper Service (2-3 containers)
├── eSpeak Service (1-2 containers)
└── Ollama Service (2-4 containers, GPU-enabled)

Load distribution:
Request → API Gateway → AI Service Pool → Model
```

### **Exam Seats (Concurrent Users)**

```
Infrastructure:
├── 4 Backend instances (~100req/s each = 400 req/s)
├── MongoDB + replicas (~500 connections each)
├── Redis cache (~10K connections)
└── 4 AI service containers

Capacity:
- 1000 concurrent exams @ 5 API calls/minute
- 50,000 historical responses queryable
- Real-time monitoring of 100 active exams
- 500 reports generated/day

Bottleneck Mitigation:
- Chat queue for AI processing
- Read replicas for reporting
- Distributed caching
- Async report generation
```

### **Backup & Disaster Recovery**

```bash
# Daily backup strategy
0 2 * * * mongodump --uri="mongodb://..." --out /backup/daily/$(date +\%Y\%m\%d)

# Weekly S3 upload
0 3 * * 0 aws s3 sync /backup/weekly s3://backup-bucket/

# Point-in-time recovery
mongorestore --uri="mongodb+srv://..." /backup/daily/20260225/

# Test restore monthly
0 3 1 * * /scripts/test-restore.sh
```

---

## Summary & Next Steps

### **Immediate Actions (This Week)**
1. ✅ Review this document with team
2. ✅ Prioritize missing features (Board: P0, P1, P2)
3. ✅ Update MongoDB schemas
4. ✅ Set up development environment with Vosk/Ollama
5. ✅ Create sprint planning (18-week timeline)

### **Development Start (Next Week)**
1. Update database with new schemas
2. Implement RBAC middleware
3. Start Phase 1 (Foundation)
4. Begin Phase 2 (Exam Management UI)

### **Key Success Metrics**
- Exam upload → publish time: < 5 minutes
- Student face recognition accuracy: > 95%
- STT accuracy: > 90% (Whisper), > 80% (Vosk)
- Real-time monitoring latency: < 500ms
- Offline mode sync: < 1 minute when reconnected
- Admin panel response time: < 2 seconds
- Exam completion rate: > 98%

---

**Generated**: February 25, 2026  
**For**: VoiceSecure Admin Panel Redesign v2.0  
**Status**: ✅ Ready for Implementation
