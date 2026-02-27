import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { dataProvider } from "../../database/provider";
import { pdfService } from "../../services/pdf.service";
import { sendError, sendSuccess } from "../http-response";

const router = Router();

// GET /api/admin/exams
router.get("/exams", async (_req: Request, res: Response) => {
  try {
    const exams = await dataProvider.getAllExams();
    sendSuccess(res, exams);
  } catch (error) {
    sendError(res, String(error));
  }
});

// Multer — store uploaded files in a temp folder (accepts all types)
const upload = multer({
  dest: path.join(process.cwd(), "tmp-uploads"),
});

// POST /api/admin/login
router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    sendError(res, "username and password required", 400);
    return;
  }
  const ok = await dataProvider.adminLogin(username, password);
  if (!ok) {
    sendError(res, "Invalid username or password", 401);
    return;
  }
  sendSuccess(res, { authenticated: true });
});

// POST /api/admin/create-exam
// Pure JSON body — no file required. Used for quick exam creation without a PDF.
router.post("/create-exam", async (req: Request, res: Response) => {
  try {
    const { code, title, durationMinutes, questions: rawQuestions } = req.body as {
      code?: string;
      title: string;
      durationMinutes?: number | string;
      questions?: Array<{ id?: number; text: string }>;
    };
    if (!title || !title.trim()) {
      sendError(res, "title is required", 400);
      return;
    }
    const examCode = (code || title).trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
    const questions = Array.isArray(rawQuestions)
      ? rawQuestions.map((q, i) => ({ id: q.id ?? i + 1, text: q.text }))
      : [];
    await dataProvider.saveExam({
      code: examCode,
      title: title.trim(),
      questions,
      durationMinutes: Number(durationMinutes ?? 30),
      status: "active",
    });
    sendSuccess(res, { code: examCode, questionCount: questions.length });
  } catch (error) {
    sendError(res, String(error));
  }
});

// POST /api/admin/upload-exam-pdf
// Accepts multipart/form-data with field "pdf" (or any file) + body fields: code, title, durationMinutes
router.post(
  "/upload-exam-pdf",
  upload.single("pdf"),
  async (req: Request, res: Response) => {
    try {
      const { code, title, durationMinutes } = req.body as {
        code: string;
        title: string;
        durationMinutes: string;
      };
      if (!title || !title.trim()) {
        sendError(res, "title is required", 400);
        return;
      }
      const examCode = (code || title).trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
      let questions: { id: number; text: string }[] = [];

      if (req.file) {
        const mime = req.file.mimetype;
        const fileBuffer = fs.readFileSync(req.file.path);

        if (mime === "application/pdf" || req.file.originalname.endsWith(".pdf")) {
          questions = await pdfService.parsePDF(req.file.path);
        } else if (mime === "application/json" || req.file.originalname.endsWith(".json")) {
          const parsed = JSON.parse(fileBuffer.toString("utf-8"));
          const arr = Array.isArray(parsed) ? parsed : parsed.questions ?? [];
          questions = arr.map((q: any, i: number) => ({
            id: q.id ?? i + 1,
            text: typeof q === "string" ? q : (q.text ?? q.question ?? String(q)),
          }));
        } else {
          // Plain text / CSV / other: treat each non-empty line as a question
          const lines = fileBuffer.toString("utf-8").split("\n").map((l: string) => l.trim()).filter(Boolean);
          questions = lines
            .filter((l: string) => l.length > 3)
            .map((l: string, i: number) => ({
              id: i + 1,
              text: l.replace(/^[\d]+[.):] ?/, "").trim() || l,
            }));
        }
        fs.unlink(req.file.path, () => {});
      }

      await dataProvider.saveExam({
        code: examCode,
        title: title.trim(),
        questions,
        durationMinutes: Number(durationMinutes ?? 30),
        status: "active",
      });
      sendSuccess(res, { code: examCode, questionCount: questions.length });
    } catch (error) {
      sendError(res, String(error));
    }
  },
);

// POST /api/admin/publish-exam
router.post("/publish-exam", async (req: Request, res: Response) => {
  const { code } = req.body as { code: string };
  if (!code) {
    sendError(res, "code required", 400);
    return;
  }
  await dataProvider.publishExam(code);
  sendSuccess(res, { published: true, code });
});

// POST /api/admin/register-student-face
router.post("/register-student-face", async (req: Request, res: Response) => {
  try {
    const student = req.body;
    await dataProvider.registerStudent({
      ...student,
      registeredAt: new Date().toISOString(),
    });
    sendSuccess(res, { registered: true });
  } catch (error) {
    sendError(res, String(error));
  }
});

// GET /api/admin/dashboard/stats
router.get("/dashboard/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await dataProvider.getDashboardStats();
    sendSuccess(res, stats);
  } catch (error) {
    sendError(res, String(error));
  }
});

// GET /api/admin/activity
router.get("/activity", async (_req: Request, res: Response) => {
  try {
    const activity = await dataProvider.getRecentActivity();
    sendSuccess(res, activity);
  } catch (error) {
    sendError(res, String(error));
  }
});

// GET /api/admin/submissions
router.get("/submissions", async (_req: Request, res: Response) => {
  try {
    const submissions = await dataProvider.getSubmissions();
    sendSuccess(res, submissions);
  } catch (error) {
    sendError(res, String(error));
  }
});

// GET /api/admin/students-for-scoring
router.get("/students-for-scoring", async (_req: Request, res: Response) => {
  try {
    const students = await dataProvider.getStudentsForScoring();
    sendSuccess(res, students);
  } catch (error) {
    sendError(res, String(error));
  }
});

// POST /api/admin/score
router.post("/score", async (req: Request, res: Response) => {
  try {
    const { studentId, score } = req.body as { studentId: string | number; score: number };
    if (studentId === undefined || score === undefined) {
      sendError(res, "studentId and score required", 400);
      return;
    }
    await dataProvider.setStudentScore(String(studentId), Number(score));
    sendSuccess(res, { scored: true });
  } catch (error) {
    sendError(res, String(error));
  }
});

// GET /api/admin/answers/:studentId/download
router.get("/answers/:studentId/download", async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const answers = await dataProvider.getStudentAnswers(String(studentId));
    const lines = answers.map((a, i) =>
      `${i + 1}. [${a.examTitle || a.examCode}] Q${a.questionIndex + 1}: ${a.question}\n   Answer: ${a.answer}\n   Time: ${a.timestamp}`
    );
    const text = `Student Answers — ${studentId}\n${'='.repeat(60)}\n\n${lines.join('\n\n')}`;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="answers-${studentId}.txt"`);
    res.send(text);
  } catch (error) {
    sendError(res, String(error));
  }
});

export default router;
