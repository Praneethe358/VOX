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
    return await this.col("responses").find({}).toArray();
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

  async getStudentAnswers(idOrRoll: string): Promise<any[]> {
    return await this.col("responses").find({ rollNumber: idOrRoll }).toArray();
  }

  async getStudentDashboardStats(idOrRoll: string): Promise<{ completedExams: number; upcomingExams: number; averageScore: number; totalTimeSpent: number }> {
    const completedExams = await this.col("responses").countDocuments({ rollNumber: idOrRoll });
    return { completedExams, upcomingExams: 0, averageScore: 0, totalTimeSpent: 0 };
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
