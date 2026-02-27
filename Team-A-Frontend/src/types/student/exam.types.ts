/**
 * Exam-related types and interfaces
 */

export interface Question {
  questionId: string;
  sectionId: string;
  text: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'descriptive' | 'numerical' | 'boolean';
  expectedAnswerLength: 'short' | 'medium' | 'long';
  order: number;
  hints?: string[];
}

export interface ExamSection {
  sectionId: string;
  sectionName: string; // "Part A", "Part B", etc.
  questions: Question[];
  timeLimit?: number; // Optional per-section limit in minutes
  totalMarks: number;
}

export interface ExamData {
  examCode: string;
  title: string;
  description: string;
  subject: string;
  durationMinutes: number;
  totalMarks: number;
  sections: ExamSection[];
  voiceNavigationEnabled: boolean;
  voiceLanguage: string; // "en", "hi", "mr"
  questionReadingEnabled: boolean;
  multilingualEnabled: boolean;
  supportedLanguages: string[];
  aiConfig: {
    sttEngine: 'vosk' | 'whisper';
    sttLanguage: string;
    llmModel: 'llama3.2' | 'llama2' | 'mistral';
    grammarCorrectionEnabled: boolean;
    answerFormatting: boolean;
    autoSaveInterval: number; // in seconds
  };
}

export interface StudentAnswer {
  questionId: string;
  sectionId: string;
  rawTranscript: string;
  formattedAnswer: string;
  confidence: number; // 0-1 (STT confidence)
  audioFile?: {
    url: string;
    duration: number; // seconds
    format: string;
  };
  attemptedAt: Date;
  submittedAt: Date;
  timeSpent: number; // seconds
  wordCount: number;
  suspiciousFlags: string[];
}

export interface ExamSession {
  sessionId: string;
  studentId: string;
  examCode: string;
  status: 'in_progress' | 'submitted' | 'evaluated' | 'paused';
  startTime: Date;
  endTime?: Date;
  totalDuration?: number; // seconds
  currentQuestionId: string;
  currentSectionId: string;
  answers: StudentAnswer[];
  totalScore?: number;
  totalMarks?: number;
  percentage?: number;
  lastSavedAt: Date;
  environmentData: {
    deviceInfo: string;
    screenResolution: string;
    isFullscreen: boolean;
    browserTabs: number;
  };
}

export interface ExamNavigationState {
  currentQuestionIndex: number;
  currentSectionIndex: number;
  visitedQuestions: Set<string>;
  flaggedQuestions: Set<string>;
  answeredQuestions: Set<string>;
}
