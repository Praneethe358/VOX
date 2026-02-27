const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'http://localhost:3000/api';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface Student {
  studentId?: string;
  examCode?: string;
  faceDescriptor?: number[];
  name: string;
  rollNumber?: string;
  email?: string;
  faceEmbedding?: string;
}

class UnifiedApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  private buildUrl(endpoint: string): string {
    const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}${normalized}`;
  }

  private getJsonHeaders(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private normalize<T>(raw: any, ok: boolean, fallbackError?: string): ApiResponse<T> {
    if (raw && typeof raw === 'object' && typeof raw.success === 'boolean') {
      if (raw.data !== undefined) {
        return raw as ApiResponse<T>;
      }
      if (raw.exams !== undefined) {
        return { success: raw.success, data: raw.exams as T, error: raw.error, message: raw.message };
      }
      return raw as ApiResponse<T>;
    }

    if (!ok) {
      return { success: false, error: fallbackError || 'Request failed' };
    }

    return { success: true, data: raw as T };
  }

  private async request<T>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(this.buildUrl(endpoint), {
        method,
        headers: this.getJsonHeaders(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      const raw = await response.json().catch(() => undefined);
      return this.normalize<T>(raw, response.ok, `HTTP ${response.status}`);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async requestMultipart<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    try {
      const headers: HeadersInit = {};
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(this.buildUrl(endpoint), {
        method: 'POST',
        headers,
        body: formData,
      });

      const raw = await response.json().catch(() => undefined);
      return this.normalize<T>(raw, response.ok, `HTTP ${response.status}`);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async loginAdmin(username: string, password: string): Promise<ApiResponse<{ authenticated: boolean }>> {
    const response = await this.request<{ authenticated: boolean }>('/admin/login', 'POST', { username, password });
    if (response.success && response.data && (response.data as any).authenticated === false) {
      return { success: false, error: 'Invalid username or password' };
    }
    return response;
  }

  async uploadExamPdf(pdfFile: File, examData: { code: string; title: string; durationMinutes: number }): Promise<ApiResponse<{ questionCount: number }>> {
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('code', examData.code);
    formData.append('title', examData.title);
    formData.append('durationMinutes', String(examData.durationMinutes));
    return this.requestMultipart<{ questionCount: number }>('/admin/upload-exam-pdf', formData);
  }

  async publishExam(code: string): Promise<ApiResponse<{ published: boolean; code: string }>> {
    return this.request('/admin/publish-exam', 'POST', { code });
  }

  async registerStudent(student: Student): Promise<ApiResponse<{ registered: boolean }>> {
    return this.request('/admin/register-student-face', 'POST', student);
  }

  async getDashboardStats(): Promise<ApiResponse<{
    totalExams?: number;
    totalSubmissions?: number;
    pendingReview?: number;
    averageScore?: number;
  }>> {
    return this.request('/admin/dashboard/stats', 'GET');
  }

  async getRecentActivity(): Promise<ApiResponse<Array<{ message: string }>>> {
    return this.request('/admin/activity', 'GET');
  }

  async getExams(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/admin/exams', 'GET');
  }

  async createExam(exam: { title: string; code?: string; durationMinutes: number; questions?: Array<{ text: string }> }): Promise<ApiResponse<{ code: string; questionCount: number }>> {
    return this.request('/admin/create-exam', 'POST', exam);
  }

  async getSubmissions(): Promise<ApiResponse<any[]>> {
    return this.request('/admin/submissions', 'GET');
  }

  async getStudentsForScoring(): Promise<ApiResponse<any[]>> {
    return this.request('/admin/students-for-scoring', 'GET');
  }

  async submitStudentScore(studentId: number, score: number) {
    return this.request('/admin/score', 'POST', { studentId, score });
  }

  async downloadStudentAnswers(studentId: number): Promise<Blob> {
    const response = await fetch(this.buildUrl(`/admin/answers/${studentId}/download`));
    if (!response.ok) throw new Error(`Download failed with status ${response.status}`);
    return response.blob();
  }

  async getAvailableExams(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/student/exams', 'GET');
  }

  async verifyStudentFace(examCode: string, liveDescriptor: number[]): Promise<{
    success: boolean;
    data?: { matched: boolean; studentId?: string; confidence: number; student?: any };
    error?: string;
  }> {
    const response = await this.request<{ matched: boolean; studentId?: string }>('/student/verify-face', 'POST', { examCode, liveDescriptor });
    if (!response.success) {
      return {
        success: false,
        data: { matched: false, confidence: 0 },
        error: response.error,
      };
    }

    const matched = Boolean(response.data?.matched);
    return {
      success: true,
      data: {
        matched,
        studentId: response.data?.studentId,
        confidence: matched ? 1 : 0,
      },
    };
  }

  async startExam(examCode: string, rollNumber: string) {
    return this.request('/student/start-exam', 'POST', { examCode, rollNumber });
  }

  async submitAnswer(data: { rollNumber: string; examCode: string; questionIndex: number; answer: string }) {
    return this.request('/student/submit-answer', 'POST', data);
  }

  async endExam(rollNumber: string, examCode: string) {
    return this.request('/student/end-exam', 'POST', { rollNumber, examCode });
  }

  async authenticateWithFace(faceData: any) {
    return this.request('/auth/face-recognize', 'POST', faceData);
  }

  async loginWithPassword(email: string, password: string) {
    return this.request('/auth/login', 'POST', { email, password });
  }

  async getExamById(examId: string) {
    return this.request(`/exams/${examId}`, 'GET');
  }

  async startExamSession(examId: string) {
    return this.request('/exam-sessions/start', 'POST', { examId });
  }

  async autoSaveSession(sessionData: any) {
    return this.request('/exam-sessions/autosave', 'POST', sessionData);
  }

  async submitExam(sessionData: any): Promise<ApiResponse<{ results?: { estimatedScore?: number } }>> {
    return this.request('/exam-sessions/submit', 'POST', sessionData);
  }

  async convertSpeechToText(audioBlob: Blob, language: string = 'en'): Promise<{ text: string; confidence: number }> {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('language', language);

    const headers: HeadersInit = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const response = await fetch(this.buildUrl('/ai/stt-answer'), {
      method: 'POST',
      headers,
      body: formData,
    });

    const raw = await response.json().catch(() => ({}));
    const payload = raw?.data ?? raw;
    return {
      text: payload?.text ?? '',
      confidence: payload?.confidence ?? 0,
    };
  }

  async synthesizeSpeech(text: string, language: string = 'en', rate: number = 1.0): Promise<ApiResponse<{ audioUrl?: string }>> {
    return this.request('/ai/tts-speak', 'POST', { text, language, rate });
  }

  async formatAnswer(rawText: string, questionContext?: string): Promise<ApiResponse<{ formatted: string }>> {
    return this.request('/ai/format-answer', 'POST', { rawText, questionContext });
  }

  async getDashboardStudentStats(): Promise<ApiResponse<{
    completedExams?: number;
    upcomingExams?: number;
    averageScore?: number;
    totalTimeSpent?: number;
  }>> {
    return this.request('/students/dashboard', 'GET');
  }

  async getStudentProfile(): Promise<ApiResponse<{ student?: any }>> {
    return this.request('/students/profile', 'GET');
  }

  async getExamResults(sessionId: string) {
    return this.request(`/results/${sessionId}`, 'GET');
  }

  async getAllResults() {
    return this.request('/results', 'GET');
  }

  async checkHealth() {
    return this.request('/health', 'GET');
  }
}

export const unifiedApiClient = new UnifiedApiClient();

export const adminApi = {
  login: async (username: string, password: string) => {
    const response = await unifiedApiClient.loginAdmin(username, password);
    return { success: response.success, error: response.error };
  },
  uploadExamPdf: unifiedApiClient.uploadExamPdf.bind(unifiedApiClient),
  publishExam: unifiedApiClient.publishExam.bind(unifiedApiClient),
  registerStudent: unifiedApiClient.registerStudent.bind(unifiedApiClient),
  getDashboardStats: unifiedApiClient.getDashboardStats.bind(unifiedApiClient),
  getRecentActivity: unifiedApiClient.getRecentActivity.bind(unifiedApiClient),
  getExams: unifiedApiClient.getExams.bind(unifiedApiClient),
  createExam: unifiedApiClient.createExam.bind(unifiedApiClient),
  getSubmissions: unifiedApiClient.getSubmissions.bind(unifiedApiClient),
  getStudentsForScoring: unifiedApiClient.getStudentsForScoring.bind(unifiedApiClient),
  submitStudentScore: unifiedApiClient.submitStudentScore.bind(unifiedApiClient),
  downloadStudentAnswers: unifiedApiClient.downloadStudentAnswers.bind(unifiedApiClient),
};

export const studentApi = {
  getAvailableExams: unifiedApiClient.getAvailableExams.bind(unifiedApiClient),
  startExam: unifiedApiClient.startExam.bind(unifiedApiClient),
  submitAnswer: unifiedApiClient.submitAnswer.bind(unifiedApiClient),
  endExam: unifiedApiClient.endExam.bind(unifiedApiClient),
  formatAnswer: unifiedApiClient.formatAnswer.bind(unifiedApiClient),
  startExamSession: unifiedApiClient.startExamSession.bind(unifiedApiClient),
  autoSaveSession: unifiedApiClient.autoSaveSession.bind(unifiedApiClient),
  submitExamSession: unifiedApiClient.submitExam.bind(unifiedApiClient),
  getExams: unifiedApiClient.getExams.bind(unifiedApiClient),
  getExamById: unifiedApiClient.getExamById.bind(unifiedApiClient),
};

export const dbApi = {
  checkHealth: unifiedApiClient.checkHealth.bind(unifiedApiClient),
};

export default unifiedApiClient;
