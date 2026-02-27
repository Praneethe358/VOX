/**
 * Student-related types
 */

export interface StudentProfile {
  studentId: string;
  name: string;
  email: string;
  phoneNumber: string;
  enrollmentDate: Date;
  disabilityType: 'temporary_fracture' | 'permanent_motor' | 'visual' | 'hearing' | 'other';
  faceDescriptor: number[];
  accessibilityProfile: {
    requiresVoiceNavigation: boolean;
    preferredLanguage: string;
    speechRate: number;
    fontSize: number;
    highContrast: boolean;
    textToSpeech: boolean;
  };
}

export interface FaceRecognitionData {
  studentId: string;
  faceDescriptor: number[];
  confidence: number; // 0-1
  timestamp: Date;
  verified: boolean;
  imageUrl?: string;
}

export interface StudentAuthState {
  isAuthenticated: boolean;
  student: StudentProfile | null;
  faceVerified: boolean;
  sessionToken?: string;
  loginTimestamp?: Date;
}

export interface FaceMatchResult {
  matched: boolean;
  studentId: string;
  confidence: number; // 0-1 (should be >0.95 for match)
  matchedStudent?: StudentProfile;
  timestamp: Date;
}
