import { mongoService } from './mongo-client';
import { faceService } from '../services/face.service';
import { ResponseDocument } from './models/Response';

// In production the provider always delegates to mongoService/faceService.
// Mock database code has been removed as all testing features are disabled.

type AuditPayload = {
  studentId: string;
  examCode: string;
  action: string;
  metadata?: unknown;
};

class DataProvider {
  // fallback helper is no longer used, left in case additional data layers are added later
  private async withFallback<T>(primary: () => Promise<T>, _fallback: () => Promise<T>): Promise<T> {
    // always call primary in real mode
    return primary();
  }

  async adminLogin(username: string, password: string): Promise<boolean> {
    return mongoService.adminLogin(username, password);
  }

  async saveExam(exam: any): Promise<void> {
    await mongoService.saveExam(exam);
  }

  async publishExam(code: string): Promise<void> {
    await mongoService.publishExam(code);
  }

  async unpublishExam(code: string): Promise<void> {
    await mongoService.unpublishExam(code);
  }

  async deleteExam(code: string): Promise<boolean> {
    return mongoService.deleteExam(code);
  }

  async updateExam(code: string, update: any): Promise<boolean> {
    return mongoService.updateExam(code, update);
  }

  async getExamByCode(code: string): Promise<any | null> {
    return mongoService.getExamByCode(code);
  }

  async getAllExams(): Promise<any[]> {
    return mongoService.getAllExams();
  }

  async getActiveExams(): Promise<any[]> {
    return mongoService.getActiveExams();
  }

  async registerStudent(student: any): Promise<void> {
    await mongoService.registerStudent(student);
  }

  async verifyFace(examCode: string, liveDescriptor: number[]): Promise<{ success: boolean; studentId?: string; confidence?: number; distance?: number; student?: any }> {
    return faceService.verifyFace(examCode, liveDescriptor);
  }

  async saveResponse(response: ResponseDocument): Promise<void> {
    await mongoService.saveResponse(response);
  }

  async logAudit(entry: AuditPayload): Promise<void> {
    await mongoService.logAudit(entry);
  }

  async submitExam(studentId: string, examCode: string): Promise<void> {
    await mongoService.submitExam(studentId, examCode);
  }

  // ── Exam Sessions ────────────────────────────────────
  async startExamSession(examCode: string, rollNumber: string, studentId?: string): Promise<string> {
    await mongoService.logAudit({ studentId: rollNumber, examCode, action: 'EXAM_START' });
    return rollNumber;
  }

  async saveSessionAnswer(data: { rollNumber: string; examCode: string; questionIndex: number; answer: string }): Promise<void> {
    await mongoService.saveResponse({ ...data, timestamp: new Date().toISOString() } as any);
  }

  async endExamSession(rollNumber: string, examCode: string): Promise<{ sessionId: string; estimatedScore: number }> {
    await mongoService.submitExam(rollNumber, examCode);
    return { sessionId: rollNumber, estimatedScore: 0 };
  }

  async submitFullExam(sessionData: any): Promise<{ sessionId: string; estimatedScore: number }> {
    const rollNumber = sessionData.rollNumber || sessionData.studentId;
    const examCode = sessionData.examCode;
    const answers = Array.isArray(sessionData.answers) ? sessionData.answers : [];
    const answeredCount = answers.length;

    // Store submission result with answer count
    try {
      const db = mongoService.getDb();
      await db.collection('submissions').updateOne(
        { studentId: rollNumber, examCode },
        {
          $set: {
            studentId: rollNumber,
            studentName: sessionData.studentName || rollNumber,
            examCode,
            answeredCount,
            totalQuestions: sessionData.totalQuestions || answeredCount,
            answers,
            submittedAt: new Date().toISOString(),
            status: 'submitted',
          },
        },
        { upsert: true },
      );
    } catch {}

    await mongoService.submitExam(rollNumber, examCode);
    return { sessionId: rollNumber, estimatedScore: answeredCount };
  }

  async autoSaveSession(sessionData: any): Promise<void> {
    // auto-save currently a no-op in real DB mode
  }

  // ── Auth ─────────────────────────────────────────────
  async findStudentByCredentials(email: string, password: string): Promise<any | null> {
    // not currently used; can be implemented as needed
    return null;
  }

  async findStudentById(idOrRoll: string): Promise<any | null> {
    // simple pass-through to mongoService lookup
    try {
      const db = mongoService.getDb();
      let student = await db.collection('students').findOne({ studentId: idOrRoll });
      if (!student) {
        student = await db.collection('students').findOne({ rollNumber: idOrRoll });
      }
      return student;
    } catch {
      return null;
    }
  }

  // ── Dashboard / Stats ────────────────────────────────
  async getDashboardStats(): Promise<{ totalExams: number; totalSubmissions: number; pendingReview: number; averageScore: number }> {
    return mongoService.getDashboardStats();
  }

  async getRecentActivity(): Promise<{ message: string }[]> {
    return mongoService.getRecentActivity();
  }

  async getSubmissions(): Promise<any[]> {
    return mongoService.getSubmissions();
  }

  async getStudentsForScoring(): Promise<any[]> {
    return mongoService.getStudentsForScoring();
  }

  async setStudentScore(idOrRoll: string, score: number): Promise<void> {
    await mongoService.setStudentScore(idOrRoll, score);
  }

  async getStudentAnswers(idOrRoll: string, examCode?: string): Promise<any[]> {
    return mongoService.getStudentAnswers(idOrRoll, examCode);
  }

  async getStudentDashboardStats(idOrRoll: string): Promise<{ completedExams: number; upcomingExams: number; averageScore: number; totalTimeSpent: number }> {
    return mongoService.getStudentDashboardStats(idOrRoll);
  }

  // ── Results ──────────────────────────────────────────
  async getAllResults(): Promise<any[]> {
    return mongoService.getAllResults();
  }

  async getResultBySession(sessionId: string): Promise<any | null> {
    return mongoService.getResultBySession(sessionId);
  }

  // ── Face Embeddings ──────────────────────────────────
  async verifyFaceById(studentId: string, liveDescriptor: number[]): Promise<{
    matched: boolean;
    studentId?: string;
    studentName?: string;
    confidence: number;
    distance: number;
    method: string;
    student?: any;
  }> {
    return faceService.verifyFaceByStudentId(studentId, liveDescriptor);
  }

  async registerFaceEmbedding(data: {
    studentId: string;
    studentName: string;
    examCode?: string;
    email?: string;
    descriptors: number[][];
    qualityScore?: number;
  }): Promise<{ registered: boolean; studentId: string; embeddingSize: number; frameCount: number }> {
    return faceService.registerFaceEmbedding(data);
  }

  async getAllRegisteredStudents(): Promise<any[]> {
    return faceService.getRegisteredStudents();
  }
}

export const dataProvider = new DataProvider();
