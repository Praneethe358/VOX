import express, { Application, Request, Response } from "express";
import cors from "cors";
import adminRoutes from "./routes/admin.routes";
import studentRoutes from "./routes/student.routes";
import aiRoutes from "./routes/ai.routes";
import dbRoutes from "./routes/db.routes";

export function createExpressApp(): Application {
  const app = express();

  // ── Middleware ────────────────────────────────────────────────────
  app.use(
    cors({
      origin: "*", // Allow all origins — tighten in production
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
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

  // ── 404 fallback ─────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Route not found" });
  });

  return app;
}
