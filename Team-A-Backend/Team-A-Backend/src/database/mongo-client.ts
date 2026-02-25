import { MongoClient, Db } from "mongodb";
import bcrypt from "bcrypt";
import { AdminDocument } from "./models/Admin";
import { StudentDocument } from "./models/Student";
import { ExamDocument } from "./models/Exam";
import { ResponseDocument } from "./models/Response";
import { AuditDocument } from "./models/Audit";
import { faceService } from "../services/face.service";

const MONGO_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const DB_NAME = "mindkraft";

export class MongoService {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect(): Promise<void> {
    this.client = new MongoClient(MONGO_URI);
    await this.client.connect();
    this.db = this.client.db(DB_NAME);
    faceService.setDb(this.db);
    console.log(`Connected to MongoDB: ${DB_NAME}`);
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
    await this.col("exams").insertOne({ ...exam });
  }

  async publishExam(code: string): Promise<void> {
    await this.col("exams").updateOne({ code }, { $set: { status: "active" } });
  }

  async getExamByCode(code: string): Promise<ExamDocument | null> {
    const doc = await this.col("exams").findOne({ code }) as ExamDocument | null;
    // Cache locally
    if (doc) await this.col("localExams").replaceOne({ code }, doc, { upsert: true });
    return doc;
  }

  // ── Student ───────────────────────────────────────────
  async registerStudent(student: StudentDocument): Promise<void> {
    await this.col("students").replaceOne(
      { studentId: student.studentId },
      student,
      { upsert: true },
    );
  }

  // ── Response ──────────────────────────────────────────
  async saveResponse(response: ResponseDocument): Promise<void> {
    await this.col("responses").insertOne({ ...response });
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
