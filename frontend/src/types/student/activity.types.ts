/**
 * Activity logging and session types
 */

export type ActivityAction = 
  | 'exam_start'
  | 'exam_end'
  | 'question_viewed'
  | 'answer_started'
  | 'answer_submitted'
  | 'answer_reviewed'
  | 'navigation_previous'
  | 'navigation_next'
  | 'voice_command'
  | 'auto_save'
  | 'microphone_toggled'
  | 'camera_toggled'
  | 'inactivity_detected'
  | 'anomaly_detected';

export interface ActivityLog {
  logId: string;
  sessionId: string;
  studentId: string;
  examCode: string;
  action: ActivityAction;
  questionId?: string;
  metadata: {
    timestamp: Date;
    duration?: number; // seconds
    details?: Record<string, any>;
  };
  suspiciousFlag?: boolean;
  flagReason?: string;
}

export interface SessionState {
  sessionId: string;
  studentId: string;
  examCode: string;
  status: 'not_started' | 'in_progress' | 'paused' | 'submitted' | 'ended';
  startTime: Date;
  endTime?: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  totalPausedDuration: number; // seconds
  lastActivityTime: Date;
  isFullscreenEnabled: boolean;
  isKioskModeEnabled: boolean;
  microphoneActive: boolean;
  cameraActive: boolean;
  backgroundChanges: number;
  navigationHistory: {
    questionId: string;
    sectionId: string;
    timestamp: Date;
  }[];
}

export interface AutoSaveCheckpoint {
  checkpointId: string;
  sessionId: string;
  timestamp: Date;
  answers: {
    questionId: string;
    formattedAnswer: string;
  }[];
  totalQuestionsAnswered: number;
}

export interface SubmissionData {
  sessionId: string;
  studentId: string;
  examCode: string;
  submittedAt: Date;
  finalAnswers: {
    questionId: string;
    formattedAnswer: string;
    wordCount: number;
    timeSpent: number;
  }[];
  totalDuration: number; // seconds
  totalScore?: number;
  totalMarks: number;
  percentage?: number;
  activityLog: ActivityLog[];
  metadata: {
    deviceInfo: string;
    browserVersion: string;
    screenResolution: string;
    totalPauseDuration: number;
    suspiciousFlags: string[];
  };
}

export interface ExamStatistics {
  totalQuestions: number;
  answeredQuestions: number;
  unattemptedQuestions: number;
  flaggedQuestions: number;
  totalTimeSpent: number; // seconds
  averageTimePerQuestion: number; // seconds
  totalWordCount: number;
  suspiciousActivityCount: number;
}
