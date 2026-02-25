import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { mongoService } from "../../database/mongo-client";
import { mockMongoService } from "../../database/mock-mongo";
import { pdfService } from "../../services/pdf.service";

const router = Router();

// Use mock service if MongoDB is not available
const dbService = process.env.USE_MOCK_DB === "true" ? mockMongoService : mongoService;

// Multer — store uploaded PDFs in a temp folder
const upload = multer({
  dest: path.join(process.cwd(), "tmp-uploads"),
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === "application/pdf");
  },
});

// POST /api/admin/login
router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    res.status(400).json({ success: false, error: "username and password required" });
    return;
  }
  const ok = await dbService.adminLogin(username, password);
  res.json({ success: ok });
});

// POST /api/admin/upload-exam-pdf
// Accepts multipart/form-data with field "pdf" + body fields: code, title, durationMinutes
router.post(
  "/upload-exam-pdf",
  upload.single("pdf"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: "No PDF file uploaded" });
        return;
      }
      const { code, title, durationMinutes } = req.body as {
        code: string;
        title: string;
        durationMinutes: string;
      };
      const questions = await pdfService.parsePDF(req.file.path);
      await dbService.saveExam({
        code,
        title,
        questions,
        durationMinutes: Number(durationMinutes),
        status: "draft",
      });
      // Clean up temp file
      fs.unlink(req.file.path, () => {});
      res.json({ success: true, questionCount: questions.length });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  },
);

// POST /api/admin/publish-exam
router.post("/publish-exam", async (req: Request, res: Response) => {
  const { code } = req.body as { code: string };
  if (!code) {
    res.status(400).json({ success: false, error: "code required" });
    return;
  }
  await dbService.publishExam(code);
  res.json({ success: true });
});

// POST /api/admin/register-student-face
router.post("/register-student-face", async (req: Request, res: Response) => {
  try {
    const student = req.body;
    await dbService.registerStudent({
      ...student,
      registeredAt: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;
