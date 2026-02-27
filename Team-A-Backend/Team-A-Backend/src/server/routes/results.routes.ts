import { Router, Request, Response } from "express";
import { dataProvider } from "../../database/provider";
import { sendError, sendSuccess } from "../http-response";

const router = Router();

// GET /api/results  — all results (admin overview or student's own)
router.get("/", async (_req: Request, res: Response) => {
  try {
    const results = await dataProvider.getAllResults();
    sendSuccess(res, results);
  } catch (error) {
    sendError(res, String(error));
  }
});

// GET /api/results/:sessionId  — specific session result
router.get("/:sessionId", async (req: Request, res: Response) => {
  try {
    const result = await dataProvider.getResultBySession(String(req.params.sessionId));
    if (!result) {
      sendError(res, "Session result not found", 404);
      return;
    }
    sendSuccess(res, result);
  } catch (error) {
    sendError(res, String(error));
  }
});

export default router;
