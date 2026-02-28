import { Router } from "express";
import { asyncHandler } from "../core/middleware/async-handler";
import { requireAuth, requireRole } from "../core/middleware/auth";
import { AnswerModel } from "../models/answer.model";
import { ExamSessionModel } from "../models/exam-session.model";

const router = Router();

// Sample endpoint: Auto-save answer
router.put(
  "/autosave",
  requireAuth,
  requireRole("super-admin", "exam-admin"),
  asyncHandler(async (req, res) => {
    const { examSessionId, questionNumber, rawSpeechText, formattedAnswer } = req.body as {
      examSessionId?: string;
      questionNumber?: number;
      rawSpeechText?: string;
      formattedAnswer?: string;
    };

    if (!examSessionId || !questionNumber || !rawSpeechText || !formattedAnswer) {
      res.status(400).json({ success: false, message: "examSessionId, questionNumber, rawSpeechText and formattedAnswer are required" });
      return;
    }

    const revision = {
      rawSpeechText,
      formattedAnswer,
      editedAt: new Date(),
    };

    const wordCount = formattedAnswer.trim().split(/\s+/).filter(Boolean).length;

    const answer = await AnswerModel.findOneAndUpdate(
      { examSessionId, questionNumber },
      {
        $set: {
          rawSpeechText,
          formattedAnswer,
          wordCount,
          lastEditedAt: new Date(),
        },
        $push: {
          revisionHistory: {
            $each: [revision],
            $slice: -20,
          },
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );

    await ExamSessionModel.findByIdAndUpdate(examSessionId, {
      $inc: { autoSaveCount: 1 },
      $set: { currentQuestionNumber: questionNumber },
    });

    res.json({ success: true, data: answer });
  }),
);

export default router;
