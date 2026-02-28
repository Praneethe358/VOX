import { Router } from "express";
import { asyncHandler } from "../core/middleware/async-handler";
import { requireAuth, requireRole } from "../core/middleware/auth";
import { ExamSessionModel } from "../models/exam-session.model";
import { AnswerModel } from "../models/answer.model";

const router = Router();

// Sample endpoint: Start exam session
router.post(
  "/start",
  requireAuth,
  requireRole("super-admin", "exam-admin"),
  asyncHandler(async (req, res) => {
    const { studentId, examId, faceAuthConfidence, kioskVerified } = req.body as {
      studentId?: string;
      examId?: string;
      faceAuthConfidence?: number;
      kioskVerified?: boolean;
    };

    if (!studentId || !examId) {
      res.status(400).json({ success: false, message: "studentId and examId are required" });
      return;
    }

    const session = await ExamSessionModel.create({
      studentId,
      examId,
      loginTime: new Date(),
      startTime: new Date(),
      currentQuestionNumber: 1,
      status: "in-progress",
      faceAuthConfidence,
      kioskVerified: !!kioskVerified,
    });

    res.status(201).json({ success: true, data: session });
  }),
);

// Sample endpoint: Submit exam
router.post(
  "/:sessionId/submit",
  requireAuth,
  requireRole("super-admin", "exam-admin"),
  asyncHandler(async (req, res) => {
    const { finalPdfURL } = req.body as { finalPdfURL?: string };

    const session = await ExamSessionModel.findByIdAndUpdate(
      req.params.sessionId,
      {
        $set: {
          status: "submitted",
          submittedAt: new Date(),
          endTime: new Date(),
          isLocked: true,
          finalPdfURL,
        },
      },
      { new: true, runValidators: true },
    );

    if (!session) {
      res.status(404).json({ success: false, message: "Exam session not found" });
      return;
    }

    res.json({ success: true, data: session });
  }),
);

router.get(
  "/:sessionId",
  requireAuth,
  requireRole("super-admin", "exam-admin"),
  asyncHandler(async (req, res) => {
    const session = await ExamSessionModel.findById(req.params.sessionId)
      .populate("studentId", "registerNumber fullName email department year")
      .populate("examId", "title subject durationMinutes totalMarks scheduledDate");

    if (!session) {
      res.status(404).json({ success: false, message: "Exam session not found" });
      return;
    }

    const answers = await AnswerModel.find({ examSessionId: session._id }).sort({ questionNumber: 1 });
    res.json({ success: true, data: { session, answers } });
  }),
);

export default router;
