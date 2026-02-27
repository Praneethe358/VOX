import express, { Application, Request, Response } from "express";
import cors from "cors";
import adminRoutes from "./routes/admin.routes";
import studentRoutes from "./routes/student.routes";
import aiRoutes from "./routes/ai.routes";
import dbRoutes from "./routes/db.routes";
import authRoutes from "./routes/auth.routes";
import studentsRoutes from "./routes/students.routes";
import resultsRoutes from "./routes/results.routes";
import examSessionsRoutes from "./routes/exam-sessions.routes";
import { dataProvider } from "../database/provider";
import { sendError, sendSuccess } from "./http-response";

export function createExpressApp(): Application {
  const app = express();

  // ── Middleware ────────────────────────────────────────────────────
  app.use(
    cors({
      origin: "*", // Allow all origins — tighten in production
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Student-Id"],
    }),
  );
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ── Health check ──────────────────────────────────────────────────
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "mindkraft-backend", timestamp: new Date().toISOString() });
  });

  // ── API Routes ────────────────────────────────────────────────────
  app.use("/api/admin", adminRoutes);
  app.use("/api/student", studentRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/db", dbRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/students", studentsRoutes);
  app.use("/api/results", resultsRoutes);
  app.use("/api/exam-sessions", examSessionsRoutes);

  // GET /api/exams/:examId  — exam lookup by code (used by some frontend hooks)
  app.get("/api/exams/:examId", async (req: Request, res: Response) => {
    try {
      const exam = await dataProvider.getExamByCode(String(req.params.examId));
      if (!exam) {
        sendError(res, "Exam not found", 404);
        return;
      }
      sendSuccess(res, exam);
    } catch (error) {
      sendError(res, String(error));
    }
  });

  // ── 404 fallback ─────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Route not found" });
  });

  return app;
}
