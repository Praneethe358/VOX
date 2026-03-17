/* ─────────────────────────────────────────────────────────────────────────────
 * Unified API Client — covers Legacy + Vox v1 endpoints
 * ───────────────────────────────────────────────────────────────────────────── */

const RAW_API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'http://localhost:3000/api';

function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return 'http://localhost:3000/api';
  if (/\/api(?:\/|$)/.test(trimmed)) return trimmed;
  return `${trimmed}/api`;
}

const API_BASE_URL = normalizeApiBaseUrl(RAW_API_BASE_URL);

// ─── Types ──────────────────────────────────────────────────────────────────
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

export interface VoiceSecureStudent {
  _id?: string;
  registerNumber: string;
  fullName: string;
  email: string;
  department: string;
  year: number;
  languagePreference?: string;
  faceEmbedding?: number[];
  faceRegisteredAt?: string;
  faceAuthEnabled?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VoiceSecureExam {
  _id?: string;
  title: string;
  subject: string;
  durationMinutes: number;
  totalMarks: number;
  instructions: string;
  language?: string;
  questions: Array<{
    questionNumber: number;
    prompt: string;
    marks: number;
    type: 'mcq' | 'short' | 'long';
    options?: string[];
  }>;
  pdfURL?: string;
  scheduledDate: string;
  createdBy?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AIConfiguration {
  sttEngine: 'vosk' | 'whisper';
  llmModel: string;
  grammarCorrection: boolean;
  autoSaveInterval: number;
  multilingualMode: boolean;
  ttsSpeed: number;
  updatedBy?: string;
  updatedAt?: string;
}

export interface ActivityLog {
  _id?: string;
  examSessionId: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface SystemLog {
  _id?: string;
  level: 'error' | 'critical';
  message: string;
  source: string;
  examSessionId?: string;
  timestamp: string;
}

// ─── Token Management ───────────────────────────────────────────────────────
const TOKEN_KEY = 'auth_token';
const ADMIN_KEY = 'admin_user';

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

function setStoredAdmin(admin: Record<string, unknown>): void {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

function getStoredAdmin(): Record<string, unknown> | null {
  const raw = localStorage.getItem(ADMIN_KEY);
  return raw ? JSON.parse(raw) : null;
}

export { getStoredToken, setStoredToken, clearStoredToken, setStoredAdmin, getStoredAdmin };

// ─── Client Class ───────────────────────────────────────────────────────────
class UnifiedApiClient {
  private get token(): string | null {
    return getStoredToken();
  }

  private buildUrl(endpoint: string): string {
    const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}${normalized}`;
  }

  private getJsonHeaders(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const token = this.token;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {};
    const token = this.token;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  private normalize<T>(raw: any, ok: boolean, fallbackError?: string): ApiResponse<T> {
    if (raw && typeof raw === 'object' && typeof raw.success === 'boolean') {
      if (raw.data !== undefined) return raw as ApiResponse<T>;
      if (raw.exams !== undefined) return { success: raw.success, data: raw.exams as T, error: raw.error, message: raw.message };
      return raw as ApiResponse<T>;
    }
    if (!ok) return { success: false, error: fallbackError || 'Request failed' };
    return { success: true, data: raw as T };
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown,
    extraHeaders?: HeadersInit,
  ): Promise<ApiResponse<T>> {
    try {
      const headers = { ...this.getJsonHeaders(), ...(extraHeaders || {}) };
      const response = await fetch(this.buildUrl(endpoint), {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      // Handle 401 — token expired
      if (response.status === 401) {
        clearStoredToken();
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return { success: false, error: 'Session expired. Please login again.' };
      }

      const raw = await response.json().catch(() => undefined);
      return this.normalize<T>(raw, response.ok, `HTTP ${response.status}`);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? `Connection failed: ${error.message}`
          : 'Unable to reach server. Please check your connection.',
      };
    }
  }

  private async requestMultipart<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(this.buildUrl(endpoint), {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: formData,
      });
      if (response.status === 401) {
        clearStoredToken();
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return { success: false, error: 'Session expired.' };
      }
      const raw = await response.json().catch(() => undefined);
      return this.normalize<T>(raw, response.ok, `HTTP ${response.status}`);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  HEALTH
  // ═══════════════════════════════════════════════════════════════════════════
  async checkHealth() {
    try {
      const resp = await fetch(API_BASE_URL.replace(/\/api$/, '') + '/health');
      const raw = await resp.json().catch(() => ({}));
      return { success: resp.ok, data: raw };
    } catch {
      return { success: false, error: 'Backend unreachable' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  LEGACY ADMIN — /api/admin/*
  // ═══════════════════════════════════════════════════════════════════════════
  async loginAdmin(username: string, password: string): Promise<ApiResponse<{ authenticated: boolean }>> {
    const response = await this.request<{ authenticated: boolean }>('/admin/login', 'POST', { username, password });
    if (response.success && response.data && (response.data as any).authenticated === false) {
      return { success: false, error: 'Invalid username or password' };
    }
    return response;
  }

  async uploadExamPdf(pdfFile: File, examData: { code: string; title: string; durationMinutes: number; instructions?: string }): Promise<ApiResponse<{ questionCount: number; mcqCount: number; code: string }>> {
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('code', examData.code);
    formData.append('title', examData.title);
    formData.append('durationMinutes', String(examData.durationMinutes));
    if (examData.instructions) formData.append('instructions', examData.instructions);
    return this.requestMultipart<{ questionCount: number; mcqCount: number; code: string }>('/admin/upload-exam-pdf', formData);
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

  async createExam(exam: {
    title: string;
    code?: string;
    durationMinutes: number;
    instructions?: string;
    questions?: Array<{ id?: number; text: string; type?: 'mcq' | 'descriptive'; options?: string[]; correctAnswer?: number }>;
  }): Promise<ApiResponse<{ code: string; questionCount: number; mcqCount: number }>> {
    return this.request('/admin/create-exam', 'POST', exam);
  }

  async unpublishExam(code: string): Promise<ApiResponse<{ unpublished: boolean; code: string }>> {
    return this.request('/admin/unpublish-exam', 'POST', { code });
  }

  async deleteExam(code: string): Promise<ApiResponse<{ deleted: boolean; code: string }>> {
    return this.request(`/admin/exam/${code}`, 'DELETE');
  }

  async updateExam(code: string, data: Record<string, unknown>): Promise<ApiResponse<{ updated: boolean; code: string }>> {
    return this.request(`/admin/exam/${code}`, 'PUT', data);
  }

  async getSubmissions(): Promise<ApiResponse<any[]>> {
    return this.request('/admin/submissions', 'GET');
  }

  async getStudentsForScoring(): Promise<ApiResponse<any[]>> {
    return this.request('/admin/students-for-scoring', 'GET');
  }

  async submitStudentScore(studentId: number | string, score: number) {
    return this.request('/admin/score', 'POST', { studentId, score });
  }

  async downloadStudentAnswers(studentId: number | string): Promise<Blob> {
    const headers: HeadersInit = {};
    const token = this.token;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(this.buildUrl(`/admin/answers/${studentId}/download`), { headers });
    if (!response.ok) throw new Error(`Download failed with status ${response.status}`);
    return response.blob();
  }

  async getStudentAnswers(studentId: number | string, examCode?: string): Promise<ApiResponse<any[]>> {
    const query = examCode ? `?examCode=${encodeURIComponent(String(examCode))}` : '';
    return this.request<any[]>(`/admin/answers/${studentId}${query}`, 'GET');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  LEGACY STUDENT — /api/student/*
  // ═══════════════════════════════════════════════════════════════════════════
  async getAvailableExams(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/student/exams', 'GET');
  }

  async verifyStudentFace(examCode: string, liveDescriptor: number[]): Promise<{
    success: boolean;
    data?: { matched: boolean; studentId?: string; confidence: number; student?: any };
    error?: string;
  }> {
    const response = await this.request<{ matched: boolean; studentId?: string }>('/student/verify-face', 'POST', { examCode, liveDescriptor });
    if (!response.success) return { success: false, data: { matched: false, confidence: 0 }, error: response.error };
    const matched = Boolean(response.data?.matched);
    return { success: true, data: { matched, studentId: response.data?.studentId, confidence: matched ? 1 : 0 } };
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

  // ═══════════════════════════════════════════════════════════════════════════
  //  LEGACY AUTH — /api/auth/*
  // ═══════════════════════════════════════════════════════════════════════════
  async authenticateWithFace(faceData: any) {
    return this.request('/auth/face-recognize', 'POST', faceData);
  }

  async loginWithPassword(email: string, password: string) {
    return this.request('/auth/login', 'POST', { email, password });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  LEGACY EXAM SESSIONS — /api/exam-sessions/*
  // ═══════════════════════════════════════════════════════════════════════════
  async getExamById(examId: string) {
    return this.request(`/exams/${examId}`, 'GET');
  }

  async startExamSession(data: { examId?: string; examCode?: string; rollNumber?: string; studentId?: string }) {
    return this.request('/exam-sessions/start', 'POST', data);
  }

  async autoSaveSession(sessionData: any) {
    return this.request('/exam-sessions/autosave', 'POST', sessionData);
  }

  async submitExam(sessionData: any): Promise<ApiResponse<{ sessionId?: string; results?: { estimatedScore?: number } }>> {
    return this.request('/exam-sessions/submit', 'POST', sessionData);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  LEGACY DB — /api/db/*
  // ═══════════════════════════════════════════════════════════════════════════
  async saveResponse(responseDoc: {
    studentId: string;
    examCode: string;
    questionId: number;
    rawAnswer: string;
    formattedAnswer: string;
    confidence: number;
  }) {
    return this.request('/db/save-response', 'POST', responseDoc);
  }

  async logAudit(audit: { studentId: string; examCode: string; action: string; metadata?: unknown }) {
    return this.request('/db/log-audit', 'POST', audit);
  }

  async submitExamDb(data: { studentId: string; examCode: string }) {
    return this.request('/db/submit-exam', 'POST', data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  LEGACY STUDENTS — /api/students/*
  // ═══════════════════════════════════════════════════════════════════════════
  async getDashboardStudentStats(studentId?: string): Promise<ApiResponse<{
    completedExams?: number;
    upcomingExams?: number;
    averageScore?: number;
    totalTimeSpent?: number;
  }>> {
    const headers: HeadersInit = {};
    if (studentId) headers['X-Student-Id'] = studentId;
    return this.request('/students/dashboard', 'GET', undefined, headers);
  }

  async getStudentProfile(studentId?: string): Promise<ApiResponse<{ student?: any }>> {
    const headers: HeadersInit = {};
    if (studentId) headers['X-Student-Id'] = studentId;
    return this.request('/students/profile', 'GET', undefined, headers);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  LEGACY RESULTS — /api/results/*
  // ═══════════════════════════════════════════════════════════════════════════
  async getAllResults() {
    return this.request('/results', 'GET');
  }

  async getExamResults(sessionId: string) {
    return this.request(`/results/${sessionId}`, 'GET');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  AI — /api/ai/*
  // ═══════════════════════════════════════════════════════════════════════════
  async convertSpeechToText(audioBlob: Blob, language: string = 'en'): Promise<{ text: string; confidence: number }> {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('language', language);
    const response = await fetch(this.buildUrl('/ai/stt-answer'), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody?.error ?? `STT failed with status ${response.status}`);
    }
    const raw = await response.json().catch(() => ({}));
    const payload = raw?.data ?? raw;
    return { text: payload?.text ?? '', confidence: payload?.confidence ?? 0 };
  }

  async convertCommandToText(audioBlob: Blob): Promise<{ text: string; confidence: number }> {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    const response = await fetch(this.buildUrl('/ai/stt-command'), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody?.error ?? `STT command failed with status ${response.status}`);
    }
    const raw = await response.json().catch(() => ({}));
    const payload = raw?.data ?? raw;
    return { text: payload?.text ?? '', confidence: payload?.confidence ?? 0 };
  }

  async synthesizeSpeech(text: string, language: string = 'en', rate: number = 1.0): Promise<ApiResponse<{ spoken?: boolean; audioUrl?: string }>> {
    // Backend now returns WAV audio binary; for callers that just need a JSON ack,
    // we fire the request and return a success stub.
    try {
      const speed = Math.round(80 + (rate - 0.5) * (300 - 80) / (2.0 - 0.5));
      const resp = await fetch(this.buildUrl('/ai/tts-speak'), {
        method: 'POST',
        headers: { ...this.getAuthHeaders(), 'Content-Type': 'application/json' } as Record<string, string>,
        body: JSON.stringify({ text, speed, voice: language === 'en' ? 'en-us' : language }),
      });
      if (!resp.ok) throw new Error(`TTS ${resp.status}`);
      return { success: true, data: { spoken: true } };
    } catch {
      return { success: false, error: 'TTS synthesis failed' };
    }
  }

  async formatAnswer(rawText: string, questionContext?: string): Promise<ApiResponse<{ formatted: string }>> {
    return this.request('/ai/format-answer', 'POST', { rawText, questionContext });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  VOX V1 — /api/v1/*  (JWT-protected)
  // ═══════════════════════════════════════════════════════════════════════════

  // --- Auth ---
  async v1AdminLogin(email: string, password: string): Promise<ApiResponse<{
    token: string;
    admin: { id: string; name: string; email: string; role: string; mfaEnabled: boolean };
  }>> {
    const res = await this.request<any>('/v1/auth/admin-login', 'POST', { email, password });
    if (res.success && res.data?.token) {
      setStoredToken(res.data.token);
      setStoredAdmin(res.data.admin);
    }
    return res;
  }

  async v1CreateAdmin(data: { name: string; email: string; password: string; role: string; mfaEnabled?: boolean }) {
    return this.request('/v1/auth/admins', 'POST', data);
  }

  // --- Vox Students ---
  async v1CreateStudent(student: Partial<VoiceSecureStudent>): Promise<ApiResponse<VoiceSecureStudent>> {
    return this.request('/v1/students', 'POST', student);
  }

  async v1UpdateFaceEmbedding(studentId: string, faceEmbedding: number[]): Promise<ApiResponse<VoiceSecureStudent>> {
    return this.request(`/v1/students/${studentId}/face-embedding`, 'PATCH', { faceEmbedding });
  }

  // --- Vox Exams ---
  async v1CreateExam(exam: Partial<VoiceSecureExam>): Promise<ApiResponse<VoiceSecureExam>> {
    return this.request('/v1/exams', 'POST', exam);
  }

  async v1GetExam(examId: string): Promise<ApiResponse<VoiceSecureExam>> {
    return this.request(`/v1/exams/${examId}`, 'GET');
  }

  // --- Vox Exam Sessions ---
  async v1StartExamSession(data: {
    studentId: string;
    examId: string;
    faceAuthConfidence?: number;
    kioskVerified?: boolean;
  }) {
    return this.request('/v1/exam-sessions/start', 'POST', data);
  }

  async v1SubmitExamSession(sessionId: string, data?: { finalPdfURL?: string }) {
    return this.request(`/v1/exam-sessions/${sessionId}/submit`, 'POST', data || {});
  }

  async v1GetExamSession(sessionId: string) {
    return this.request(`/v1/exam-sessions/${sessionId}`, 'GET');
  }

  // --- Vox Answers ---
  async v1AutosaveAnswer(data: {
    examSessionId: string;
    questionNumber: number;
    rawSpeechText: string;
    formattedAnswer: string;
  }) {
    return this.request('/v1/answers/autosave', 'PUT', data);
  }

  // --- Vox Activity Logs ---
  async v1CreateActivityLog(data: {
    examSessionId: string;
    eventType: string;
    metadata?: Record<string, unknown>;
  }): Promise<ApiResponse<ActivityLog>> {
    return this.request('/v1/activity-logs', 'POST', data);
  }

  // --- Vox Config ---
  async v1GetAIConfig(): Promise<ApiResponse<AIConfiguration>> {
    return this.request('/v1/config/ai', 'GET');
  }

  async v1UpdateAIConfig(config: Partial<AIConfiguration>): Promise<ApiResponse<AIConfiguration>> {
    return this.request('/v1/config/ai', 'PUT', config);
  }

  async v1CreateSystemLog(log: {
    level: 'error' | 'critical';
    message: string;
    source: string;
    examSessionId?: string;
  }): Promise<ApiResponse<SystemLog>> {
    return this.request('/v1/config/system-logs', 'POST', log);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  FACE EMBEDDING API — /api/face/*
  // ═══════════════════════════════════════════════════════════════════════════
  async faceRegister(data: {
    studentId: string;
    studentName: string;
    examCode?: string;
    email?: string;
    descriptors: number[][];
    qualityScore?: number;
  }): Promise<ApiResponse<{ studentId: string; embeddingSize: number; frameCount: number }>> {
    return this.request('/face/register', 'POST', data);
  }

  async faceVerify(examCode: string, liveDescriptor: number[]): Promise<ApiResponse<{
    matched: boolean;
    studentId?: string;
    confidence?: number;
    student?: any;
  }>> {
    return this.request('/face/verify', 'POST', { examCode, liveDescriptor });
  }

  async faceVerifyById(studentId: string, liveDescriptor: number[]): Promise<ApiResponse<{
    matched: boolean;
    studentId?: string;
    confidence?: number;
    student?: any;
    token?: string;
  }>> {
    return this.request('/face/verify-by-id', 'POST', { studentId, liveDescriptor });
  }

  async faceGetStudents(): Promise<ApiResponse<any[]>> {
    return this.request('/face/students', 'GET');
  }

  async faceGetEmbedding(studentId: string): Promise<ApiResponse<any>> {
    return this.request(`/face/embedding/${encodeURIComponent(studentId)}`, 'GET');
  }

  async faceDeleteEmbedding(studentId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request(`/face/embedding/${encodeURIComponent(studentId)}`, 'DELETE');
  }

  async faceGetAttempts(studentId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/face/attempts/${encodeURIComponent(studentId)}`, 'GET');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  LOGOUT
  // ═══════════════════════════════════════════════════════════════════════════
  logout(): void {
    clearStoredToken();
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────────
export const unifiedApiClient = new UnifiedApiClient();

// ─── Convenience API Objects ───────────────────────────────────────────────
export const adminApi = {
  login: async (username: string, password: string) => {
    const response = await unifiedApiClient.loginAdmin(username, password);
    return { success: response.success, error: response.error };
  },
  v1Login: unifiedApiClient.v1AdminLogin.bind(unifiedApiClient),
  uploadExamPdf: unifiedApiClient.uploadExamPdf.bind(unifiedApiClient),
  publishExam: unifiedApiClient.publishExam.bind(unifiedApiClient),
  registerStudent: unifiedApiClient.registerStudent.bind(unifiedApiClient),
  getDashboardStats: unifiedApiClient.getDashboardStats.bind(unifiedApiClient),
  getRecentActivity: unifiedApiClient.getRecentActivity.bind(unifiedApiClient),
  getExams: unifiedApiClient.getExams.bind(unifiedApiClient),
  createExam: unifiedApiClient.createExam.bind(unifiedApiClient),
  unpublishExam: unifiedApiClient.unpublishExam.bind(unifiedApiClient),
  deleteExam: unifiedApiClient.deleteExam.bind(unifiedApiClient),
  updateExam: unifiedApiClient.updateExam.bind(unifiedApiClient),
  getSubmissions: unifiedApiClient.getSubmissions.bind(unifiedApiClient),
  getStudentsForScoring: unifiedApiClient.getStudentsForScoring.bind(unifiedApiClient),
  submitStudentScore: unifiedApiClient.submitStudentScore.bind(unifiedApiClient),
  downloadStudentAnswers: unifiedApiClient.downloadStudentAnswers.bind(unifiedApiClient),
  getStudentAnswers: unifiedApiClient.getStudentAnswers.bind(unifiedApiClient),
  getAllResults: unifiedApiClient.getAllResults.bind(unifiedApiClient),
  // v1 endpoints
  v1CreateAdmin: unifiedApiClient.v1CreateAdmin.bind(unifiedApiClient),
  v1CreateStudent: unifiedApiClient.v1CreateStudent.bind(unifiedApiClient),
  v1UpdateFaceEmbedding: unifiedApiClient.v1UpdateFaceEmbedding.bind(unifiedApiClient),
  v1CreateExam: unifiedApiClient.v1CreateExam.bind(unifiedApiClient),
  v1GetExam: unifiedApiClient.v1GetExam.bind(unifiedApiClient),
  v1GetAIConfig: unifiedApiClient.v1GetAIConfig.bind(unifiedApiClient),
  v1UpdateAIConfig: unifiedApiClient.v1UpdateAIConfig.bind(unifiedApiClient),
  v1CreateSystemLog: unifiedApiClient.v1CreateSystemLog.bind(unifiedApiClient),
  v1CreateActivityLog: unifiedApiClient.v1CreateActivityLog.bind(unifiedApiClient),
  v1GetExamSession: unifiedApiClient.v1GetExamSession.bind(unifiedApiClient),
  // Face embedding endpoints
  faceRegister: unifiedApiClient.faceRegister.bind(unifiedApiClient),
  faceGetStudents: unifiedApiClient.faceGetStudents.bind(unifiedApiClient),
  faceGetEmbedding: unifiedApiClient.faceGetEmbedding.bind(unifiedApiClient),
  faceDeleteEmbedding: unifiedApiClient.faceDeleteEmbedding.bind(unifiedApiClient),
  faceGetAttempts: unifiedApiClient.faceGetAttempts.bind(unifiedApiClient),
  logout: unifiedApiClient.logout.bind(unifiedApiClient),
};

export const studentApi = {
  getAvailableExams: unifiedApiClient.getAvailableExams.bind(unifiedApiClient),
  verifyFace: unifiedApiClient.verifyStudentFace.bind(unifiedApiClient),
  startExam: unifiedApiClient.startExam.bind(unifiedApiClient),
  submitAnswer: unifiedApiClient.submitAnswer.bind(unifiedApiClient),
  endExam: unifiedApiClient.endExam.bind(unifiedApiClient),
  formatAnswer: unifiedApiClient.formatAnswer.bind(unifiedApiClient),
  startExamSession: unifiedApiClient.startExamSession.bind(unifiedApiClient),
  autoSaveSession: unifiedApiClient.autoSaveSession.bind(unifiedApiClient),
  submitExamSession: unifiedApiClient.submitExam.bind(unifiedApiClient),
  getExams: unifiedApiClient.getExams.bind(unifiedApiClient),
  getExamById: unifiedApiClient.getExamById.bind(unifiedApiClient),
  getDashboardStats: unifiedApiClient.getDashboardStudentStats.bind(unifiedApiClient),
  getProfile: unifiedApiClient.getStudentProfile.bind(unifiedApiClient),
  getAllResults: unifiedApiClient.getAllResults.bind(unifiedApiClient),
  getExamResults: unifiedApiClient.getExamResults.bind(unifiedApiClient),
  convertSpeechToText: unifiedApiClient.convertSpeechToText.bind(unifiedApiClient),
  convertCommandToText: unifiedApiClient.convertCommandToText.bind(unifiedApiClient),
  synthesizeSpeech: unifiedApiClient.synthesizeSpeech.bind(unifiedApiClient),
  saveResponse: unifiedApiClient.saveResponse.bind(unifiedApiClient),
  logAudit: unifiedApiClient.logAudit.bind(unifiedApiClient),
  authenticateWithFace: unifiedApiClient.authenticateWithFace.bind(unifiedApiClient),
  loginWithPassword: unifiedApiClient.loginWithPassword.bind(unifiedApiClient),
  // Face embedding endpoints
  faceVerify: unifiedApiClient.faceVerify.bind(unifiedApiClient),
  faceVerifyById: unifiedApiClient.faceVerifyById.bind(unifiedApiClient),
  // v1
  v1StartSession: unifiedApiClient.v1StartExamSession.bind(unifiedApiClient),
  v1SubmitSession: unifiedApiClient.v1SubmitExamSession.bind(unifiedApiClient),
  v1GetSession: unifiedApiClient.v1GetExamSession.bind(unifiedApiClient),
  v1AutosaveAnswer: unifiedApiClient.v1AutosaveAnswer.bind(unifiedApiClient),
  v1CreateActivityLog: unifiedApiClient.v1CreateActivityLog.bind(unifiedApiClient),
};

export const dbApi = {
  checkHealth: unifiedApiClient.checkHealth.bind(unifiedApiClient),
};

export default unifiedApiClient;
