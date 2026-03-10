import { MongoClient, Db } from "mongodb";
import bcrypt from "bcrypt";
import { AdminDocument } from "./models/Admin";
import { StudentDocument } from "./models/Student";
import { ExamDocument } from "./models/Exam";
import { ResponseDocument } from "./models/Response";
import { AuditDocument } from "./models/Audit";
import { faceService } from "../services/face.service";

const MONGO_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.MONGODB_DB_NAME;

function redactMongoUri(uri: string): string {
  return uri.replace(/:\/\/([^@]+)@/, "://***:***@");
}

export class MongoService {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect(): Promise<void> {
    this.client = new MongoClient(MONGO_URI);
    await this.client.connect();
    this.db = DB_NAME ? this.client.db(DB_NAME) : this.client.db();
    faceService.setDb(this.db);
    console.log(`Connected to MongoDB: ${redactMongoUri(MONGO_URI)} | db=${this.db.databaseName}`);

    // Drop stale unique index on examId that causes E11000 duplicate-key errors
    try {
      const indexes = await this.db.collection("exams").indexes();
      if (indexes.some((idx: any) => idx.name === "examId_1")) {
        await this.db.collection("exams").dropIndex("examId_1");
        console.log("Dropped stale examId_1 index from exams collection");
      }
    } catch (e) {
      // Ignore if index doesn't exist or collection not yet created
    }
  }

  private col(name: string) {
    if (!this.db) throw new Error("MongoDB not connected");
    return this.db.collection(name);
  }

  // ── Admin ────────────────────────────────────────────
  async adminLogin(username: string, password: string): Promise<boolean> {
    try {
      const admin = await this.col("admins").findOne({ username }) as AdminDocument | null;
      if (!admin) return false;
      return bcrypt.compare(password, admin.passwordHash);
    } catch { return false; }
  }

  // ── Exam ─────────────────────────────────────────────
  async saveExam(exam: ExamDocument): Promise<void> {
    // Upsert by code so duplicate exam codes overwrite instead of erroring
    await this.col("exams").replaceOne(
      { code: exam.code },
      { ...exam, createdAt: exam.createdAt ?? new Date().toISOString() },
      { upsert: true },
    );
  }

  async publishExam(code: string): Promise<void> {
    await this.col("exams").updateOne({ code }, { $set: { status: "active" } });
  }

  async unpublishExam(code: string): Promise<void> {
    await this.col("exams").updateOne({ code }, { $set: { status: "draft" } });
  }

  async deleteExam(code: string): Promise<boolean> {
    const result = await this.col("exams").deleteOne({ code });
    return (result.deletedCount ?? 0) > 0;
  }

  async updateExam(code: string, update: Partial<ExamDocument>): Promise<boolean> {
    // Strip code from update to prevent code changes
    const { code: _ignore, ...rest } = update as any;
    const result = await this.col("exams").updateOne({ code }, { $set: rest });
    return (result.matchedCount ?? 0) > 0;
  }

  async getExamByCode(code: string): Promise<ExamDocument | null> {
    const doc = await this.col("exams").findOne({ code }) as ExamDocument | null;
    // Cache locally
    if (doc) await this.col("localExams").replaceOne({ code }, doc, { upsert: true });
    return doc;
  }

  async getAllExams(): Promise<ExamDocument[]> {
    const docs = await this.col("exams").find({}).sort({ createdAt: -1 }).toArray();
    return docs as unknown as ExamDocument[];
  }

  async getActiveExams(): Promise<ExamDocument[]> {
    const docs = await this.col("exams").find({ status: "active" }).sort({ createdAt: -1 }).toArray();
    return docs as unknown as ExamDocument[];
  }

  // ── Student ───────────────────────────────────────────
  async registerStudent(student: StudentDocument): Promise<void> {
    const registerNumber = String((student as any).registerNumber || student.studentId || "").trim();
    const fullName = String((student as any).fullName || student.name || "").trim();
    const email = String((student as any).email || `${registerNumber || student.studentId}@mindkraft.local`).trim().toLowerCase();

    if (!registerNumber) {
      throw new Error("registerStudent requires studentId/registerNumber");
    }

    await this.col("students").replaceOne(
      { $or: [{ studentId: student.studentId }, { registerNumber }, { email }] },
      {
        ...student,
        registerNumber,
        studentId: student.studentId || registerNumber,
        fullName,
        email,
      },
      { upsert: true },
    );
  }

  // ── Response ──────────────────────────────────────────
  async saveResponse(response: ResponseDocument): Promise<void> {
    await this.col("responses").insertOne({ ...response });
  }

  // ── Dashboard / Stats ───────────────────────────────────
  async getDashboardStats(): Promise<{ totalExams: number; totalSubmissions: number; pendingReview: number; averageScore: number }> {
    const totalExams = await this.col("exams").countDocuments();
    const totalSubmissions = await this.col("responses").countDocuments();
    // pendingReview and averageScore require business logic; return 0 for now
    return { totalExams, totalSubmissions, pendingReview: 0, averageScore: 0 };
  }

  async getRecentActivity(): Promise<{ message: string }[]> {
    const docs = await this.col("audits").find({}).sort({ timestamp: -1 }).limit(20).toArray();
    return docs.map(d => ({ message: `${d.action} by ${d.studentId || 'system'}` }));
  }

  async getSubmissions(): Promise<any[]> {
    const submissions = await this.col("submissions").find({}).sort({ submittedAt: -1 }).toArray();
    const responses = await this.col("responses").find({}).toArray();
    const students = await this.col("students").find({}).toArray();

    const studentNameById = new Map<string, string>();
    students.forEach((s: any) => {
      const key = String(s.studentId || s.rollNumber || s.registerNumber || "").trim();
      if (!key) return;
      studentNameById.set(key, String(s.name || s.fullName || key));
    });
    // Also look up names from face_embeddings collection
    try {
      const faceEmbeddings = await this.col("face_embeddings").find({}).toArray();
      faceEmbeddings.forEach((fe: any) => {
        const key = String(fe.studentId || "").trim();
        if (!key || studentNameById.has(key)) return;
        studentNameById.set(key, String(fe.studentName || fe.name || key));
      });
    } catch {}

    const normalizedFromSubmissions = submissions.map((s: any, idx: number) => {
      const studentId = String(s.studentId || s.rollNumber || "").trim();
      const totalQuestions = Number(s.totalQuestions || 0);
      const answerCount = Number(s.answeredCount || (Array.isArray(s.answers) ? s.answers.length : 0));
      const score = totalQuestions > 0 ? Math.round((answerCount / totalQuestions) * 100) : null;

      return {
        id: String(s._id || s.sessionId || `${studentId}-${s.examCode}-${idx}`),
        name: studentNameById.get(studentId) || s.studentName || studentId || "Unknown Student",
        exam: String(s.examCode || s.exam || "Unknown Exam"),
        score,
        status: s.status === "graded" ? "graded" : "submitted",
        submittedAt: s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "—",
        rollNumber: studentId || undefined,
        sessionId: String(s.sessionId || ""),
        answerCount,
      };
    });

    if (normalizedFromSubmissions.length > 0) {
      return normalizedFromSubmissions;
    }

    // Fallback for older data: aggregate raw response rows by student+exam
    const grouped = new Map<string, { studentId: string; examCode: string; answerCount: number; submittedAt: string }>();
    responses.forEach((r: any) => {
      const studentId = String(r.rollNumber || r.studentId || "").trim();
      const examCode = String(r.examCode || "Unknown Exam").trim();
      const key = `${studentId}::${examCode}`;
      const ts = String(r.timestamp || r.submittedAt || new Date().toISOString());

      const existing = grouped.get(key);
      if (existing) {
        existing.answerCount += 1;
        if (new Date(ts).getTime() > new Date(existing.submittedAt).getTime()) {
          existing.submittedAt = ts;
        }
      } else {
        grouped.set(key, { studentId, examCode, answerCount: 1, submittedAt: ts });
      }
    });

    return Array.from(grouped.values()).map((g, idx) => ({
      id: `${g.studentId}-${g.examCode}-${idx}`,
      name: studentNameById.get(g.studentId) || g.studentId || "Unknown Student",
      exam: g.examCode,
      score: null,
      status: "pending",
      submittedAt: g.submittedAt ? new Date(g.submittedAt).toLocaleString() : "—",
      rollNumber: g.studentId || undefined,
      sessionId: undefined,
      answerCount: g.answerCount,
    }));
  }

  async getStudentsForScoring(): Promise<any[]> {
    return await this.col("students").find({}).toArray();
  }

  async setStudentScore(idOrRoll: string, score: number): Promise<void> {
    await this.col("students").updateOne(
      { $or: [{ studentId: idOrRoll }, { rollNumber: idOrRoll }] },
      { $set: { score } },
    );
  }

  async getStudentAnswers(idOrRoll: string, examCode?: string): Promise<any[]> {
    // Build query: search by studentId/rollNumber, optionally filter by exam
    const studentFilter = { $or: [{ studentId: idOrRoll }, { rollNumber: idOrRoll }] } as any;
    const query = examCode ? { ...studentFilter, examCode } : studentFilter;

    const fromResponses = await this.col("responses").find(query).sort({ _id: -1 }).toArray();
    let answers = fromResponses;

    if (answers.length === 0) {
      // Fallback: check submissions collection for embedded answers
      const submission = await this.col("submissions").findOne(studentFilter);
      if (submission?.answers && Array.isArray(submission.answers)) {
        answers = submission.answers;
      }
    }

    // Deduplicate: keep only the latest answer per questionId (last write wins)
    const seen = new Map<string | number, any>();
    for (const ans of answers) {
      const key = ans.questionId ?? ans.questionIndex ?? ans._id;
      seen.set(key, ans); // later entries (sorted _id desc → reversed) overwrite earlier ones
    }
    // Reverse so latest answer per question is kept, then return in question order
    const deduped = Array.from(seen.values());
    deduped.sort((a: any, b: any) => {
      const aQ = a.questionId ?? a.questionIndex ?? 0;
      const bQ = b.questionId ?? b.questionIndex ?? 0;
      return Number(aQ) - Number(bQ);
    });
    return deduped;
  }

  async getStudentDashboardStats(idOrRoll: string): Promise<{ completedExams: number; upcomingExams: number; averageScore: number; totalTimeSpent: number }> {
    // Count completed exams from submissions collection
    const submissions = await this.col("submissions").find({ studentId: idOrRoll, status: 'submitted' }).toArray();
    const completedExams = submissions.length;

    // If no submissions, fall back to counting responses
    const fallbackCount = completedExams || await this.col("responses").countDocuments({ rollNumber: idOrRoll });

    // Count upcoming exams (published exams not yet submitted by this student)
    let upcomingExams = 0;
    try {
      const allExams = await this.col("exams").countDocuments({ published: true });
      upcomingExams = Math.max(0, allExams - completedExams);
    } catch {}

    // Calculate average score from submissions
    let averageScore = 0;
    if (submissions.length > 0) {
      const totalScore = submissions.reduce((sum: number, s: any) => {
        const answered = s.answeredCount || 0;
        const total = s.totalQuestions || 1;
        return sum + Math.round((answered / total) * 100);
      }, 0);
      averageScore = Math.round(totalScore / submissions.length);
    }

    return {
      completedExams: completedExams || fallbackCount,
      upcomingExams,
      averageScore,
      totalTimeSpent: completedExams, // approximate hours
    };
  }

  // ── Results ──────────────────────────────────────────
  async getAllResults(): Promise<any[]> {
    return await this.col("results").find({}).toArray();
  }

  async getResultBySession(sessionId: string): Promise<any | null> {
    return (await this.col("results").findOne({ sessionId })) as any | null;
  }

  // ── Audit ─────────────────────────────────────────────
  async logAudit(entry: Omit<AuditDocument, "timestamp">): Promise<void> {
    await this.col("audits").insertOne({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  }

  async submitExam(studentId: string, examCode: string): Promise<void> {
    await this.logAudit({ studentId, examCode, action: "EXAM_SUBMITTED" });
  }

  async disconnect(): Promise<void> {
    await this.client?.close();
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error("MongoDB not connected");
    }
    return this.db;
  }
}

export const mongoService = new MongoService();

export function getDb(): Db {
  return mongoService.getDb();
}
