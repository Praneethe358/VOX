import { Router, Request, Response } from "express";
import { mongoService } from "../../database/mongo-client";
import { ResponseDocument } from "../../database/models/Response";

const router = Router();

// POST /api/db/save-response
router.post("/save-response", async (req: Request, res: Response) => {
  try {
    const response = req.body as ResponseDocument;
    await mongoService.saveResponse(response);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
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
    await mongoService.logAudit({ studentId, examCode, action, metadata });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// POST /api/db/submit-exam
router.post("/submit-exam", async (req: Request, res: Response) => {
  try {
    const { studentId, examCode } = req.body as {
      studentId: string;
      examCode: string;
    };
    await mongoService.submitExam(studentId, examCode);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;
