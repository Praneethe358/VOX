// API service for communicating with the MindKraft backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface LoginResponse {
  success: boolean;
}

interface Student {
  name: string;
  rollNumber: string;
  email: string;
  faceEmbedding?: string;
}

interface Exam {
  code: string;
  title: string;
  durationMinutes: number;
  questions: any[];
  status: 'draft' | 'published' | 'closed';
}

// ── Admin API ──────────────────────────────────────────────────────
export const adminApi = {
  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false };
    }
  },

  /**
   * Upload exam PDF
   */
  async uploadExamPdf(
    pdfFile: File,
    examData: { code: string; title: string; durationMinutes: number }
  ): Promise<ApiResponse<{ questionCount: number }>> {
    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('code', examData.code);
      formData.append('title', examData.title);
      formData.append('durationMinutes', examData.durationMinutes.toString());

      const response = await fetch(`${API_BASE_URL}/api/admin/upload-exam-pdf`, {
        method: 'POST',
        body: formData,
      });

      return await response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  /**
   * Publish an exam to make it available for students
   */
  async publishExam(code: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/publish-exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      return await response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  /**
   * Register a student with face data
   */
  async registerStudent(student: Student): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/register-student-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(student),
      });

      return await response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};

// ── Student API ──────────────────────────────────────────────────────
export const studentApi = {
  /**
   * Get available exams for a student
   */
  async getAvailableExams(): Promise<ApiResponse<Exam[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/student/exams`);
      return await response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  /**
   * Start an exam session
   */
  async startExam(examCode: string, rollNumber: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/student/start-exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ examCode, rollNumber }),
      });

      return await response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  /**
   * Submit an answer
   */
  async submitAnswer(data: {
    rollNumber: string;
    examCode: string;
    questionIndex: number;
    answer: string;
  }): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/student/submit-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      return await response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  /**
   * End exam session
   */
  async endExam(rollNumber: string, examCode: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/student/end-exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rollNumber, examCode }),
      });

      return await response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};

// ── Database API ──────────────────────────────────────────────────────
export const dbApi = {
  /**
   * Check database health
   */
  async checkHealth(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};

export default {
  admin: adminApi,
  student: studentApi,
  db: dbApi,
};
