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
  name: string;
  rollNumber: string;
  email: string;
  faceEmbedding?: string;
  registeredAt?: string;
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

// In-memory storage
const store = {
  admins: [] as Admin[],
  students: [] as Student[],
  exams: [] as Exam[],
  responses: [] as Response[],
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
    store.students.push(student);
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

  // ── Utility ──────────────────────────────────────────
  getStore() {
    return store;
  }
}

export const mockMongoService = new MockMongoService();
