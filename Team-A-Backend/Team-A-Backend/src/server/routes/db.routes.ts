import { Router, Request, Response } from "express";
import { dataProvider } from "../../database/provider";
import { ResponseDocument } from "../../database/models/Response";
import { sendError, sendSuccess } from "../http-response";

const router = Router();

// POST /api/db/save-response
router.post("/save-response", async (req: Request, res: Response) => {
  try {
    const response = req.body as ResponseDocument;
    await dataProvider.saveResponse(response);
    sendSuccess(res, { saved: true });
  } catch (error) {
    sendError(res, String(error));
  }
});

// POST /api/db/log-audit
router.post("/log-audit", async (req: Request, res: Response) => {
  try {
    const { studentId, examCode, action, metadata } = req.body as {
      studentId: string;
      examCode: string;
      action: string;
      metadata?: unknown;
    };
    await dataProvider.logAudit({ studentId, examCode, action, metadata });
    sendSuccess(res, { logged: true });
  } catch (error) {
    sendError(res, String(error));
  }
});

// POST /api/db/submit-exam
router.post("/submit-exam", async (req: Request, res: Response) => {
  try {
    const { studentId, examCode } = req.body as {
      studentId: string;
      examCode: string;
    };
    await dataProvider.submitExam(studentId, examCode);
    sendSuccess(res, { submitted: true });
  } catch (error) {
    sendError(res, String(error));
  }
});

export default router;
