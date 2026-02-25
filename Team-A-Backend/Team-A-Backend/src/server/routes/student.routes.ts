import { Router, Request, Response } from "express";
import { mongoService } from "../../database/mongo-client";
import { mockMongoService } from "../../database/mock-mongo";
import { faceService } from "../../services/face.service";

const router = Router();

// Use mock service if MongoDB is not available
const dbService = process.env.USE_MOCK_DB === "true" ? mockMongoService : mongoService;

// POST /api/student/verify-face
router.post("/verify-face", async (req: Request, res: Response) => {
  try {
    const { examCode, liveDescriptor } = req.body as {
      examCode: string;
      liveDescriptor: number[];
    };
    if (!examCode || !Array.isArray(liveDescriptor)) {
      res.status(400).json({ success: false, error: "examCode and liveDescriptor required" });
      return;
    }
    const result = await faceService.verifyFace(examCode, liveDescriptor);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// GET /api/student/exam/:code
router.get("/exam/:code", async (req: Request, res: Response) => {
  try {
    const exam = await dbService.getExamByCode(String(req.params.code));
    if (!exam) {
      res.status(404).json({ success: false, error: "Exam not found" });
      return;
    }
    res.json(exam);
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// POST /api/student/get-exam   (body-based alternative for frontend fetch)
router.post("/get-exam", async (req: Request, res: Response) => {
  try {
    const { code } = req.body as { code: string };
    const exam = await dbService.getExamByCode(code);
    if (!exam) {
      res.status(404).json({ success: false, error: "Exam not found" });
      return;
    }
    res.json(exam);
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;
