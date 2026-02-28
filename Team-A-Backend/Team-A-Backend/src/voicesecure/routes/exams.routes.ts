import { Router } from "express";
import { asyncHandler } from "../core/middleware/async-handler";
import { requireAuth, requireRole } from "../core/middleware/auth";
import { ExamModel } from "../models/exam.model";

const router = Router();

// Sample endpoint: Exam creation
router.post(
  "/",
  requireAuth,
  requireRole("super-admin", "exam-admin"),
  asyncHandler(async (req, res) => {
    const exam = await ExamModel.create({
      ...req.body,
      createdBy: req.auth!.adminId,
    });
    res.status(201).json({ success: true, data: exam });
  }),
);

router.get(
  "/:examId",
  requireAuth,
  requireRole("super-admin", "exam-admin"),
  asyncHandler(async (req, res) => {
    const exam = await ExamModel.findById(req.params.examId).populate("createdBy", "name email role");
    if (!exam) {
      res.status(404).json({ success: false, message: "Exam not found" });
      return;
    }
    res.json({ success: true, data: exam });
  }),
);

export default router;
