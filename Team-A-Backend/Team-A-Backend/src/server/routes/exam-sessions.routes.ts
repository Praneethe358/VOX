import { Router, Request, Response } from "express";
import { dataProvider } from "../../database/provider";
import { sendError, sendSuccess } from "../http-response";

const router = Router();

// POST /api/exam-sessions/start
router.post("/start", async (req: Request, res: Response) => {
  try {
    const { examId, examCode, rollNumber, studentId } = req.body as {
      examId?: string;
      examCode?: string;
      rollNumber?: string;
      studentId?: string;
    };
    const code = examCode || examId || '';
    const roll = rollNumber || studentId || '';
    if (!code || !roll) {
      sendError(res, "examCode/examId and rollNumber/studentId required", 400);
      return;
    }
    const exam = await dataProvider.getExamByCode(code);
    if (!exam) {
      sendError(res, "Exam not found", 404);
      return;
    }
    const sessionId = await dataProvider.startExamSession(code, roll, studentId);
    sendSuccess(res, { sessionId, examCode: code, rollNumber: roll, exam });
  } catch (error) {
    sendError(res, String(error));
  }
});

// POST /api/exam-sessions/autosave
router.post("/autosave", async (req: Request, res: Response) => {
  try {
    await dataProvider.autoSaveSession(req.body);
    sendSuccess(res, { saved: true });
  } catch (error) {
    sendError(res, String(error));
  }
});

// POST /api/exam-sessions/submit
router.post("/submit", async (req: Request, res: Response) => {
  try {
    const sessionData = req.body;
    if (!sessionData.rollNumber && !sessionData.studentId) {
      sendError(res, "rollNumber or studentId required", 400);
      return;
    }
    if (!sessionData.examCode) {
      sendError(res, "examCode required", 400);
      return;
    }
    const result = await dataProvider.submitFullExam({
      ...sessionData,
      rollNumber: sessionData.rollNumber || sessionData.studentId,
    });
    sendSuccess(res, {
      sessionId: result.sessionId,
      results: { estimatedScore: result.estimatedScore },
    });
  } catch (error) {
    sendError(res, String(error));
  }
});

export default router;
