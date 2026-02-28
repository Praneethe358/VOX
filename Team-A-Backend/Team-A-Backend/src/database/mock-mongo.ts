/**
 * mock-mongo.ts
 * Simple in-memory mock database for development without MongoDB
 * This allows testing the frontend-backend integration without installing MongoDB
 */

import bcrypt from "bcrypt";

interface Admin {
  username: string;
  passwordHash: string;
}

interface Student {
  studentId?: string;
  examCode?: string;
  faceDescriptor?: number[];
  normalizedEmbedding?: number[];
  name: string;
  rollNumber?: string;
  email?: string;
  passwordHash?: string;
  faceEmbedding?: string;
  registeredAt?: string;
}

interface FaceEmbeddingRecord {
  studentId: string;
  studentName: string;
  examCode?: string;
  email?: string;
  facialEmbedding: number[];
  normalizedEmbedding: number[];
  frameCount: number;
  qualityScore: number;
  createdAt: string;
  updatedAt: string;
}

interface FaceLoginAttemptRecord {
  studentId?: string;
  examCode?: string;
  matched: boolean;
  confidence: number;
  timestamp: string;
  reason?: string;
}

interface Exam {
  code: string;
  title: string;
  durationMinutes: number;
  status: string;
  questions: any[];
}

interface Response {
  rollNumber: string;
  examCode: string;
  questionIndex: number;
  answer: string;
  timestamp: string;
}

interface Audit {
  studentId: string;
  examCode: string;
  action: string;
  metadata?: unknown;
  timestamp: string;
}

interface ExamSession {
  sessionId: string;
  rollNumber: string;
  examCode: string;
  studentId?: string;
  studentName?: string;
  startedAt: string;
  endedAt?: string;
  status: "active" | "completed";
  answers: { questionIndex: number; answer: string; timestamp: string }[];
  score?: number;
  estimatedScore?: number;
  totalMarks?: number;
}

// In-memory storage
const store = {
  admins: [] as Admin[],
  students: [] as Student[],
  exams: [] as Exam[],
  responses: [] as Response[],
  audits: [] as Audit[],
  sessions: [] as ExamSession[],
  face_embeddings: [] as FaceEmbeddingRecord[],
  face_login_attempts: [] as FaceLoginAttemptRecord[],
};

export class MockMongoService {
  async connect(): Promise<void> {
    console.log("🔧 [MockDB] Using in-memory database (MongoDB not required)");
    await this.seedDatabase();
  }

  async disconnect(): Promise<void> {
    console.log("🔧 [MockDB] Disconnected");
  }

  private async seedDatabase(): Promise<void> {
    // Seed default admin
    if (store.admins.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      store.admins.push({
        username: "admin",
        passwordHash: hashedPassword,
      });
      console.log("🌱 [MockDB] Seeded default admin: (user: admin, pass: admin123)");
    }

    // Seed demo exam
    if (store.exams.length === 0) {
      store.exams.push({
        code: "TECH101",
        title: "Introduction to AI (Demo)",
        durationMinutes: 30,
        status: "active",
        questions: [
          { id: 1, text: "What is the full form of AI?" },
          { id: 2, text: "Define Machine Learning in one sentence." },
          { id: 3, text: "Who is known as the father of Artificial Intelligence?" },
        ],
      });
      console.log("🌱 [MockDB] Seeded demo exam: TECH101");
    }

    // Seed demo student
    if (store.students.length === 0) {
      const studentPasswordHash = await bcrypt.hash("student123", 10);
      store.students.push({
        studentId: "DEMO_STUDENT_001",
        name: "Demo Student",
        rollNumber: "DEMO001",
        email: "demo@student.local",
        examCode: "TECH101",
        passwordHash: studentPasswordHash,
        registeredAt: new Date().toISOString(),
      });
      console.log("🌱 [MockDB] Seeded demo student: (roll: DEMO001, pass: student123)");
    }
  }

  // ── Admin ────────────────────────────────────────────
  async adminLogin(username: string, password: string): Promise<boolean> {
    try {
      const admin = store.admins.find((a) => a.username === username);
      if (!admin) return false;
      return await bcrypt.compare(password, admin.passwordHash);
    } catch {
      return false;
    }
  }

  // ── Exam ─────────────────────────────────────────────
  async saveExam(exam: any): Promise<void> {
    store.exams.push(exam);
  }

  async publishExam(code: string): Promise<void> {
    const exam = store.exams.find((e) => e.code === code);
    if (exam) {
      exam.status = "active";
    }
  }

  async getExamByCode(code: string): Promise<any> {
    return store.exams.find((e) => e.code === code) || null;
  }

  async getAllExams(): Promise<any[]> {
    return store.exams;
  }

  async getActiveExams(): Promise<any[]> {
    return store.exams.filter((e) => e.status === "active");
  }

  // ── Student ──────────────────────────────────────────
  async registerStudent(student: Student): Promise<void> {
    const key = student.studentId || student.rollNumber;
    const existingIndex = store.students.findIndex(
      (s) => (s.studentId || s.rollNumber) === key
    );

    if (existingIndex >= 0) {
      store.students[existingIndex] = { ...store.students[existingIndex], ...student };
    } else {
      store.students.push(student);
    }
  }

  async verifyFace(examCode: string, liveDescriptor: number[]): Promise<{ success: boolean; studentId?: string; confidence?: number; distance?: number; student?: any }> {
    if (!Array.isArray(liveDescriptor) || liveDescriptor.length === 0) {
      return { success: false };
    }

    const normalizedExamCode = (examCode || '').trim().toUpperCase();
    const normalizedLive = this.l2Normalize(liveDescriptor);

    // First check face_embeddings store (higher accuracy with normalized embeddings)
    for (const record of store.face_embeddings) {
      const recExam = (record.examCode || '').trim().toUpperCase();
      if (recExam !== normalizedExamCode) continue;
      if (!record.normalizedEmbedding || record.normalizedEmbedding.length !== normalizedLive.length) continue;

      const similarity = this.cosineSim(normalizedLive, record.normalizedEmbedding);
      const dist = this.eucDist(normalizedLive, record.normalizedEmbedding);
      if (similarity >= 0.85) {
        const student = store.students.find(s => s.studentId === record.studentId);
        return {
          success: true,
          studentId: record.studentId,
          confidence: similarity,
          distance: dist,
          student: student ? { studentId: student.studentId, name: student.name, examCode: student.examCode, email: student.email } : undefined,
        };
      }
    }

    // Fallback: check legacy students store with Euclidean distance
    const candidates = store.students.filter((student) => {
      const studentExamCode = (student.examCode || '').trim().toUpperCase();
      return studentExamCode === normalizedExamCode && Array.isArray(student.faceDescriptor);
    });

    const EUCLID_THRESHOLD = 0.55;
    for (const student of candidates) {
      const stored = student.normalizedEmbedding || this.l2Normalize(student.faceDescriptor || []);
      if (stored.length !== normalizedLive.length) continue;

      const similarity = this.cosineSim(normalizedLive, stored);
      const dist = this.eucDist(normalizedLive, stored);
      if (similarity >= 0.85 || dist < EUCLID_THRESHOLD) {
        return {
          success: true,
          studentId: student.studentId || student.rollNumber,
          confidence: similarity,
          distance: dist,
          student: { studentId: student.studentId, name: student.name, examCode: student.examCode, email: student.email },
        };
      }
    }

    return { success: false, confidence: 0, distance: Infinity };
  }

  async getStudentByRollNumber(rollNumber: string): Promise<Student | null> {
    return store.students.find((s) => s.rollNumber === rollNumber) || null;
  }

  async getAllStudents(): Promise<Student[]> {
    return store.students;
  }

  // ── Response ─────────────────────────────────────────
  async saveResponse(response: Response): Promise<void> {
    store.responses.push(response);
  }

  async getStudentResponses(rollNumber: string, examCode: string): Promise<Response[]> {
    return store.responses.filter(
      (r) => r.rollNumber === rollNumber && r.examCode === examCode
    );
  }

  async getAllResponses(): Promise<Response[]> {
    return store.responses;
  }

  async logAudit(entry: { studentId: string; examCode: string; action: string; metadata?: unknown }): Promise<void> {
    store.audits.push({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  }

  async submitExam(studentId: string, examCode: string): Promise<void> {
    await this.logAudit({ studentId, examCode, action: 'EXAM_SUBMITTED' });
    // Mark matching active session as completed
    const session = store.sessions.find(
      (s) => (s.rollNumber === studentId || s.studentId === studentId) && s.examCode === examCode && s.status === 'active'
    );
    if (session) {
      session.status = 'completed';
      session.endedAt = new Date().toISOString();
      const exam = store.exams.find((e) => e.code === examCode);
      const totalQ = exam ? exam.questions.length : 0;
      session.estimatedScore = totalQ ? Math.round((session.answers.length / totalQ) * 100) : 0;
      session.totalMarks = 100;
    }
  }

  // ── Exam Sessions ────────────────────────────────────
  async startExamSession(examCode: string, rollNumber: string, studentId?: string): Promise<string> {
    // End any existing active session for this student/exam
    const existing = store.sessions.find(
      (s) => s.rollNumber === rollNumber && s.examCode === examCode && s.status === 'active'
    );
    if (existing) {
      existing.status = 'completed';
      existing.endedAt = new Date().toISOString();
    }

    const student = store.students.find((s) => s.rollNumber === rollNumber || s.studentId === rollNumber);
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    store.sessions.push({
      sessionId,
      rollNumber,
      examCode,
      studentId: studentId || student?.studentId || rollNumber,
      studentName: student?.name,
      startedAt: new Date().toISOString(),
      status: 'active',
      answers: [],
    });
    return sessionId;
  }

  async saveSessionAnswer(data: { rollNumber: string; examCode: string; questionIndex: number; answer: string }): Promise<void> {
    const session = store.sessions.find(
      (s) => s.rollNumber === data.rollNumber && s.examCode === data.examCode && s.status === 'active'
    );
    const entry = { questionIndex: data.questionIndex, answer: data.answer, timestamp: new Date().toISOString() };
    if (session) {
      const existing = session.answers.findIndex((a) => a.questionIndex === data.questionIndex);
      if (existing >= 0) {
        session.answers[existing] = entry;
      } else {
        session.answers.push(entry);
      }
    }
    // Also persist to responses collection
    store.responses.push({
      rollNumber: data.rollNumber,
      examCode: data.examCode,
      questionIndex: data.questionIndex,
      answer: data.answer,
      timestamp: new Date().toISOString(),
    });
  }

  async endExamSession(rollNumber: string, examCode: string): Promise<{ sessionId: string; estimatedScore: number }> {
    const session = store.sessions.find(
      (s) => s.rollNumber === rollNumber && s.examCode === examCode && s.status === 'active'
    );
    if (session) {
      session.status = 'completed';
      session.endedAt = new Date().toISOString();
      const exam = store.exams.find((e) => e.code === examCode);
      const totalQ = exam ? exam.questions.length : 1;
      session.estimatedScore = Math.round((session.answers.length / totalQ) * 100);
      session.totalMarks = 100;
      await this.logAudit({ studentId: rollNumber, examCode, action: 'EXAM_ENDED' });
      return { sessionId: session.sessionId, estimatedScore: session.estimatedScore };
    }
    return { sessionId: '', estimatedScore: 0 };
  }

  async submitFullExam(sessionData: any): Promise<{ sessionId: string; estimatedScore: number }> {
    const { rollNumber, examCode, answers } = sessionData;
    // Save all answers
    if (Array.isArray(answers)) {
      for (const a of answers) {
        await this.saveSessionAnswer({ rollNumber, examCode, questionIndex: a.questionIndex, answer: a.answer });
      }
    }
    return this.endExamSession(rollNumber, examCode);
  }

  async autoSaveSession(sessionData: any): Promise<void> {
    const { rollNumber, examCode, answers } = sessionData;
    if (Array.isArray(answers) && answers.length > 0) {
      const lastAnswer = answers[answers.length - 1];
      await this.saveSessionAnswer({ rollNumber, examCode, questionIndex: lastAnswer.questionIndex, answer: lastAnswer.answer });
    }
  }

  // ── Auth ─────────────────────────────────────────────
  async findStudentByCredentials(email: string, password: string): Promise<Student | null> {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const student = store.students.find((s) => (s.email || '').toLowerCase() === normalizedEmail);
    if (!student || !student.passwordHash) return null;
    const ok = await bcrypt.compare(password, student.passwordHash);
    return ok ? student : null;
  }

  async findStudentById(idOrRoll: string): Promise<Student | null> {
    return store.students.find(
      (s) => s.studentId === idOrRoll || s.rollNumber === idOrRoll
    ) || null;
  }

  // ── Dashboard / Stats ────────────────────────────────
  async getDashboardStats(): Promise<{ totalExams: number; totalSubmissions: number; pendingReview: number; averageScore: number }> {
    const totalExams = store.exams.length;
    const completed = store.sessions.filter((s) => s.status === 'completed');
    const totalSubmissions = completed.length;
    const pendingReview = completed.filter((s) => s.score === undefined).length;
    const scored = completed.filter((s) => s.score !== undefined);
    const averageScore = scored.length > 0 ? Math.round(scored.reduce((sum, s) => sum + (s.score || 0), 0) / scored.length) : 0;
    return { totalExams, totalSubmissions, pendingReview, averageScore };
  }

  async getRecentActivity(): Promise<{ message: string }[]> {
    const recent = [...store.audits]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 20)
      .map((a) => ({ message: `${a.action} — student ${a.studentId} (exam: ${a.examCode}) at ${new Date(a.timestamp).toLocaleString()}` }));

    if (recent.length === 0) {
      return [
        { message: 'System started with mock database' },
        { message: 'Demo exam TECH101 loaded' },
      ];
    }
    return recent;
  }

  async getSubmissions(): Promise<any[]> {
    return store.sessions
      .filter((s) => s.status === 'completed')
      .map((s, i) => ({
        id: i + 1,
        name: s.studentName || s.rollNumber,
        exam: s.examCode,
        score: s.score ?? null,
        status: s.score !== undefined ? 'graded' : 'submitted',
        submittedAt: s.endedAt || s.startedAt,
        rollNumber: s.rollNumber,
        sessionId: s.sessionId,
        answerCount: s.answers.length,
      }));
  }

  async getStudentsForScoring(): Promise<any[]> {
    return store.sessions
      .filter((s) => s.status === 'completed')
      .map((s, i) => ({
        id: i + 1,
        name: s.studentName || s.rollNumber,
        exam: s.examCode,
        score: s.score ?? null,
        status: s.score !== undefined ? 'graded' : 'submitted',
        submittedAt: s.endedAt || s.startedAt,
        rollNumber: s.rollNumber,
        sessionId: s.sessionId,
        answers: s.answers,
      }));
  }

  async setStudentScore(idOrRoll: string, score: number): Promise<void> {
    const session = store.sessions
      .filter((s) => s.status === 'completed')
      .find((s) => s.rollNumber === idOrRoll || s.sessionId === idOrRoll);
    if (session) {
      session.score = score;
    }
  }

  async getStudentAnswers(idOrRoll: string): Promise<any[]> {
    const sessions = store.sessions.filter(
      (s) => s.rollNumber === idOrRoll || s.studentId === idOrRoll || s.sessionId === idOrRoll
    );
    const answers: any[] = [];
    for (const session of sessions) {
      for (const answer of session.answers) {
        const exam = store.exams.find((e) => e.code === session.examCode);
        const question = exam?.questions[answer.questionIndex];
        answers.push({
          examCode: session.examCode,
          examTitle: exam?.title || session.examCode,
          questionIndex: answer.questionIndex,
          question: question?.text || `Question ${answer.questionIndex + 1}`,
          answer: answer.answer,
          timestamp: answer.timestamp,
        });
      }
    }
    return answers;
  }

  // ── Student Dashboard / Profile ──────────────────────
  async getStudentDashboardStats(idOrRoll: string): Promise<{ completedExams: number; upcomingExams: number; averageScore: number; totalTimeSpent: number }> {
    const completed = store.sessions.filter(
      (s) => s.status === 'completed' && (s.rollNumber === idOrRoll || s.studentId === idOrRoll)
    );
    const scored = completed.filter((s) => s.score !== undefined);
    const avg = scored.length > 0 ? Math.round(scored.reduce((sum, s) => sum + (s.score || 0), 0) / scored.length) : 0;
    const active = await this.getActiveExams();
    return {
      completedExams: completed.length,
      upcomingExams: active.length,
      averageScore: avg,
      totalTimeSpent: completed.length * 30,
    };
  }

  // ── Results ──────────────────────────────────────────
  async getAllResults(): Promise<any[]> {
    return store.sessions
      .filter((s) => s.status === 'completed')
      .map((s) => {
        const exam = store.exams.find((e) => e.code === s.examCode);
        return {
          sessionId: s.sessionId,
          examCode: s.examCode,
          examTitle: exam?.title || s.examCode,
          rollNumber: s.rollNumber,
          studentName: s.studentName || s.rollNumber,
          score: s.score ?? s.estimatedScore ?? 0,
          totalMarks: s.totalMarks ?? 100,
          submittedAt: s.endedAt || s.startedAt,
        };
      });
  }

  async getResultBySession(sessionId: string): Promise<any | null> {
    const session = store.sessions.find((s) => s.sessionId === sessionId);
    if (!session) return null;
    const exam = store.exams.find((e) => e.code === session.examCode);
    return {
      sessionId: session.sessionId,
      examCode: session.examCode,
      examTitle: exam?.title || session.examCode,
      rollNumber: session.rollNumber,
      studentName: session.studentName || session.rollNumber,
      score: session.score ?? session.estimatedScore ?? 0,
      totalMarks: session.totalMarks ?? 100,
      submittedAt: session.endedAt || session.startedAt,
      answers: session.answers,
      results: { estimatedScore: session.estimatedScore ?? session.score ?? 0 },
    };
  }

  // ── Utility ──────────────────────────────────────────
  getStore() {
    return store;
  }

  // ── Face Embeddings ─────────────────────────────────────────────────────

  private l2Normalize(vec: number[]): number[] {
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return mag === 0 ? vec : vec.map(v => v / mag);
  }

  private cosineSim(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  }

  private eucDist(a: number[], b: number[]): number {
    if (a.length !== b.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
  }

  async registerFaceEmbedding(data: {
    studentId: string;
    studentName: string;
    examCode?: string;
    email?: string;
    descriptors: number[][];
    qualityScore?: number;
  }): Promise<{ registered: boolean; studentId: string; embeddingSize: number; frameCount: number }> {
    const { studentId, studentName, examCode, email, descriptors, qualityScore } = data;

    // Average descriptors
    const dim = descriptors[0].length;
    const avg = new Array(dim).fill(0);
    for (const desc of descriptors) {
      for (let i = 0; i < dim; i++) avg[i] += desc[i];
    }
    for (let i = 0; i < dim; i++) avg[i] /= descriptors.length;
    const normalized = this.l2Normalize(avg);

    const now = new Date().toISOString();
    const record: FaceEmbeddingRecord = {
      studentId,
      studentName,
      examCode,
      email,
      facialEmbedding: avg,
      normalizedEmbedding: normalized,
      frameCount: descriptors.length,
      qualityScore: qualityScore ?? 0.9,
      createdAt: now,
      updatedAt: now,
    };

    // Upsert
    const idx = store.face_embeddings.findIndex(e => e.studentId === studentId);
    if (idx >= 0) {
      store.face_embeddings[idx] = record;
    } else {
      store.face_embeddings.push(record);
    }

    // Also update students entry
    const sIdx = store.students.findIndex(s => s.studentId === studentId);
    if (sIdx >= 0) {
      store.students[sIdx].faceDescriptor = avg;
      store.students[sIdx].normalizedEmbedding = normalized;
      store.students[sIdx].name = studentName;
      store.students[sIdx].examCode = examCode;
      store.students[sIdx].email = email;
    } else {
      store.students.push({
        studentId,
        name: studentName,
        examCode,
        email,
        faceDescriptor: avg,
        normalizedEmbedding: normalized,
        registeredAt: now,
      });
    }

    return { registered: true, studentId, embeddingSize: normalized.length, frameCount: descriptors.length };
  }

  async verifyFaceById(studentId: string, liveDescriptor: number[]): Promise<{
    matched: boolean;
    studentId?: string;
    studentName?: string;
    confidence: number;
    distance: number;
    method: string;
    student?: any;
  }> {
    const normalizedLive = this.l2Normalize(liveDescriptor);
    const THRESHOLD = 0.85;

    // Check rate limiting
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const recentFails = store.face_login_attempts.filter(
      a => a.studentId === studentId && !a.matched && a.timestamp >= cutoff,
    ).length;
    if (recentFails >= 5) {
      return { matched: false, confidence: 0, distance: Infinity, method: 'cosine', studentId };
    }

    // Check face_embeddings first
    let record = store.face_embeddings.find(e => e.studentId === studentId);
    let stored: number[] | undefined;
    let studentName: string | undefined;

    if (record) {
      stored = record.normalizedEmbedding;
      studentName = record.studentName;
    } else {
      // Fallback to students collection
      const student = store.students.find(s => s.studentId === studentId);
      if (student?.faceDescriptor) {
        stored = student.normalizedEmbedding || this.l2Normalize(student.faceDescriptor);
        studentName = student.name;
      }
    }

    if (!stored || stored.length !== normalizedLive.length) {
      store.face_login_attempts.push({ studentId, matched: false, confidence: 0, timestamp: new Date().toISOString(), reason: 'No embedding' });
      return { matched: false, confidence: 0, distance: Infinity, method: 'cosine', studentId };
    }

    const similarity = this.cosineSim(normalizedLive, stored);
    const distance = this.eucDist(normalizedLive, stored);
    const matched = similarity >= THRESHOLD;

    store.face_login_attempts.push({
      studentId,
      matched,
      confidence: similarity,
      timestamp: new Date().toISOString(),
      reason: matched ? 'Match' : `Similarity ${similarity.toFixed(3)} < ${THRESHOLD}`,
    });

    return {
      matched,
      studentId,
      studentName,
      confidence: similarity,
      distance,
      method: 'cosine',
      student: record || store.students.find(s => s.studentId === studentId),
    };
  }

  async getAllRegisteredStudents(): Promise<any[]> {
    // Combine face_embeddings + legacy students
    const fromEmbeddings = store.face_embeddings.map(e => ({
      studentId: e.studentId,
      studentName: e.studentName,
      examCode: e.examCode,
      email: e.email,
      frameCount: e.frameCount,
      qualityScore: e.qualityScore,
      createdAt: e.createdAt,
      hasFaceData: true,
    }));
    const embeddingIds = new Set(fromEmbeddings.map(e => e.studentId));
    const fromStudents = store.students
      .filter(s => s.studentId && !embeddingIds.has(s.studentId))
      .map(s => ({
        studentId: s.studentId,
        studentName: s.name,
        examCode: s.examCode,
        email: s.email,
        frameCount: 0,
        qualityScore: 0,
        createdAt: s.registeredAt,
        hasFaceData: Boolean(s.faceDescriptor && s.faceDescriptor.length > 0),
      }));
    return [...fromEmbeddings, ...fromStudents];
  }
}

export const mockMongoService = new MockMongoService();
