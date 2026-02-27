import { Router, Request, Response } from "express";
import { dataProvider } from "../../database/provider";
import { sendError, sendSuccess } from "../http-response";

const router = Router();

// GET /api/student/exams
router.get("/exams", async (_req: Request, res: Response) => {
  try {
    const exams = await dataProvider.getActiveExams();
    sendSuccess(res, exams);
  } catch (error) {
    sendError(res, String(error));
  }
});

// POST /api/student/verify-face
router.post("/verify-face", async (req: Request, res: Response) => {
  try {
    const { examCode, liveDescriptor } = req.body as {
      examCode: string;
      liveDescriptor: number[];
    };
    if (!examCode || !Array.isArray(liveDescriptor)) {
      sendError(res, "examCode and liveDescriptor required", 400);
      return;
    }
    const result = await dataProvider.verifyFace(examCode, liveDescriptor);
    sendSuccess(res, {
      matched: result.success,
      studentId: result.studentId,
    });
  } catch (error) {
    sendError(res, String(error));
  }
});

// GET /api/student/exam/:code
router.get("/exam/:code", async (req: Request, res: Response) => {
  try {
    const exam = await dataProvider.getExamByCode(String(req.params.code));
    if (!exam) {
      sendError(res, "Exam not found", 404);
      return;
    }
    sendSuccess(res, exam);
  } catch (error) {
    sendError(res, String(error));
  }
});

// POST /api/student/get-exam   (body-based alternative for frontend fetch)
router.post("/get-exam", async (req: Request, res: Response) => {
  try {
    const { code } = req.body as { code: string };
    const exam = await dataProvider.getExamByCode(code);
    if (!exam) {
      sendError(res, "Exam not found", 404);
      return;
    }
    sendSuccess(res, exam);
  } catch (error) {
    sendError(res, String(error));
  }
});

// POST /api/student/start-exam
router.post("/start-exam", async (req: Request, res: Response) => {
  try {
    const { examCode, rollNumber, studentId } = req.body as { examCode: string; rollNumber: string; studentId?: string };
    if (!examCode || !rollNumber) {
      sendError(res, "examCode and rollNumber required", 400);
      return;
    }
    const exam = await dataProvider.getExamByCode(examCode);
    if (!exam) {
      sendError(res, "Exam not found", 404);
      return;
    }
    const sessionId = await dataProvider.startExamSession(examCode, rollNumber, studentId);
    sendSuccess(res, { sessionId, examCode, rollNumber, exam });
  } catch (error) {
    sendError(res, String(error));
  }
});

// POST /api/student/submit-answer
router.post("/submit-answer", async (req: Request, res: Response) => {
  try {
    const { rollNumber, examCode, questionIndex, answer } = req.body as {
      rollNumber: string;
      examCode: string;
      questionIndex: number;
      answer: string;
    };
    if (rollNumber === undefined || examCode === undefined || questionIndex === undefined) {
      sendError(res, "rollNumber, examCode, questionIndex, answer required", 400);
      return;
    }
    await dataProvider.saveSessionAnswer({ rollNumber, examCode, questionIndex, answer: answer || '' });
    sendSuccess(res, { saved: true });
  } catch (error) {
    sendError(res, String(error));
  }
});

// POST /api/student/end-exam
router.post("/end-exam", async (req: Request, res: Response) => {
  try {
    const { rollNumber, examCode } = req.body as { rollNumber: string; examCode: string };
    if (!rollNumber || !examCode) {
      sendError(res, "rollNumber and examCode required", 400);
      return;
    }
    const result = await dataProvider.endExamSession(rollNumber, examCode);
    sendSuccess(res, result);
  } catch (error) {
    sendError(res, String(error));
  }
});

export default router;
