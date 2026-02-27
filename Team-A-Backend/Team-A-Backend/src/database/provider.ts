import { mongoService } from './mongo-client';
import { mockMongoService } from './mock-mongo';
import { faceService } from '../services/face.service';
import { ResponseDocument } from './models/Response';

const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true';

type AuditPayload = {
  studentId: string;
  examCode: string;
  action: string;
  metadata?: unknown;
};

class DataProvider {
  private async withFallback<T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    if (USE_MOCK_DB) {
      return fallback();
    }

    try {
      return await primary();
    } catch {
      return fallback();
    }
  }

  async adminLogin(username: string, password: string): Promise<boolean> {
    return this.withFallback(
      () => mongoService.adminLogin(username, password),
      () => mockMongoService.adminLogin(username, password),
    );
  }

  async saveExam(exam: any): Promise<void> {
    await this.withFallback(
      () => mongoService.saveExam(exam),
      () => mockMongoService.saveExam(exam),
    );
  }

  async publishExam(code: string): Promise<void> {
    await this.withFallback(
      () => mongoService.publishExam(code),
      () => mockMongoService.publishExam(code),
    );
  }

  async getExamByCode(code: string): Promise<any | null> {
    return this.withFallback(
      () => mongoService.getExamByCode(code),
      () => mockMongoService.getExamByCode(code),
    );
  }

  async getAllExams(): Promise<any[]> {
    return this.withFallback(
      () => mongoService.getAllExams(),
      () => mockMongoService.getAllExams(),
    );
  }

  async getActiveExams(): Promise<any[]> {
    return this.withFallback(
      () => mongoService.getActiveExams(),
      () => mockMongoService.getActiveExams(),
    );
  }

  async registerStudent(student: any): Promise<void> {
    await this.withFallback(
      () => mongoService.registerStudent(student),
      () => mockMongoService.registerStudent(student),
    );
  }

  async verifyFace(examCode: string, liveDescriptor: number[]): Promise<{ success: boolean; studentId?: string }> {
    if (USE_MOCK_DB) {
      return mockMongoService.verifyFace(examCode, liveDescriptor);
    }

    try {
      return await faceService.verifyFace(examCode, liveDescriptor);
    } catch {
      return mockMongoService.verifyFace(examCode, liveDescriptor);
    }
  }

  async saveResponse(response: ResponseDocument): Promise<void> {
    await this.withFallback(
      () => mongoService.saveResponse(response),
      () => mockMongoService.saveResponse(response as any),
    );
  }

  async logAudit(entry: AuditPayload): Promise<void> {
    await this.withFallback(
      () => mongoService.logAudit(entry),
      () => mockMongoService.logAudit(entry),
    );
  }

  async submitExam(studentId: string, examCode: string): Promise<void> {
    await this.withFallback(
      () => mongoService.submitExam(studentId, examCode),
      () => mockMongoService.submitExam(studentId, examCode),
    );
  }

  // ── Exam Sessions ────────────────────────────────────
  async startExamSession(examCode: string, rollNumber: string, studentId?: string): Promise<string> {
    return this.withFallback(
      async () => { await mongoService.logAudit({ studentId: rollNumber, examCode, action: 'EXAM_START' }); return rollNumber; },
      () => mockMongoService.startExamSession(examCode, rollNumber, studentId),
    );
  }

  async saveSessionAnswer(data: { rollNumber: string; examCode: string; questionIndex: number; answer: string }): Promise<void> {
    await this.withFallback(
      () => mongoService.saveResponse({ ...data, timestamp: new Date().toISOString() } as any),
      () => mockMongoService.saveSessionAnswer(data),
    );
  }

  async endExamSession(rollNumber: string, examCode: string): Promise<{ sessionId: string; estimatedScore: number }> {
    return this.withFallback(
      async () => { await mongoService.submitExam(rollNumber, examCode); return { sessionId: rollNumber, estimatedScore: 0 }; },
      () => mockMongoService.endExamSession(rollNumber, examCode),
    );
  }

  async submitFullExam(sessionData: any): Promise<{ sessionId: string; estimatedScore: number }> {
    return this.withFallback(
      async () => { await mongoService.submitExam(sessionData.rollNumber, sessionData.examCode); return { sessionId: sessionData.rollNumber, estimatedScore: 0 }; },
      () => mockMongoService.submitFullExam(sessionData),
    );
  }

  async autoSaveSession(sessionData: any): Promise<void> {
    await this.withFallback(
      async () => {},
      () => mockMongoService.autoSaveSession(sessionData),
    );
  }

  // ── Auth ─────────────────────────────────────────────
  async findStudentByCredentials(email: string, password: string): Promise<any | null> {
    return this.withFallback(
      async () => null,
      () => mockMongoService.findStudentByCredentials(email, password),
    );
  }

  async findStudentById(idOrRoll: string): Promise<any | null> {
    return this.withFallback(
      async () => null,
      () => mockMongoService.findStudentById(idOrRoll),
    );
  }

  // ── Dashboard / Stats ────────────────────────────────
  async getDashboardStats(): Promise<{ totalExams: number; totalSubmissions: number; pendingReview: number; averageScore: number }> {
    return this.withFallback(
      async () => ({ totalExams: 0, totalSubmissions: 0, pendingReview: 0, averageScore: 0 }),
      () => mockMongoService.getDashboardStats(),
    );
  }

  async getRecentActivity(): Promise<{ message: string }[]> {
    return this.withFallback(
      async () => [],
      () => mockMongoService.getRecentActivity(),
    );
  }

  async getSubmissions(): Promise<any[]> {
    return this.withFallback(
      async () => [],
      () => mockMongoService.getSubmissions(),
    );
  }

  async getStudentsForScoring(): Promise<any[]> {
    return this.withFallback(
      async () => [],
      () => mockMongoService.getStudentsForScoring(),
    );
  }

  async setStudentScore(idOrRoll: string, score: number): Promise<void> {
    await this.withFallback(
      async () => {},
      () => mockMongoService.setStudentScore(idOrRoll, score),
    );
  }

  async getStudentAnswers(idOrRoll: string): Promise<any[]> {
    return this.withFallback(
      async () => [],
      () => mockMongoService.getStudentAnswers(idOrRoll),
    );
  }

  async getStudentDashboardStats(idOrRoll: string): Promise<{ completedExams: number; upcomingExams: number; averageScore: number; totalTimeSpent: number }> {
    return this.withFallback(
      async () => ({ completedExams: 0, upcomingExams: 0, averageScore: 0, totalTimeSpent: 0 }),
      () => mockMongoService.getStudentDashboardStats(idOrRoll),
    );
  }

  // ── Results ──────────────────────────────────────────
  async getAllResults(): Promise<any[]> {
    return this.withFallback(
      async () => [],
      () => mockMongoService.getAllResults(),
    );
  }

  async getResultBySession(sessionId: string): Promise<any | null> {
    return this.withFallback(
      async () => null,
      () => mockMongoService.getResultBySession(sessionId),
    );
  }
}

export const dataProvider = new DataProvider();
