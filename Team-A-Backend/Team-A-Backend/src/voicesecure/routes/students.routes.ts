import { Router } from "express";
import { asyncHandler } from "../core/middleware/async-handler";
import { requireAuth, requireRole } from "../core/middleware/auth";
import { StudentModel } from "../models/student.model";

const router = Router();

// Sample endpoint: Student registration
router.post(
  "/",
  requireAuth,
  requireRole("super-admin", "exam-admin"),
  asyncHandler(async (req, res) => {
    const payload = req.body;
    const student = await StudentModel.create(payload);
    res.status(201).json({ success: true, data: student });
  }),
);

// Sample endpoint: Face embedding update (no raw image storage)
router.patch(
  "/:studentId/face-embedding",
  requireAuth,
  requireRole("super-admin", "exam-admin"),
  asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { faceEmbedding } = req.body as { faceEmbedding?: number[] };

    if (!Array.isArray(faceEmbedding) || faceEmbedding.length === 0) {
      res.status(400).json({ success: false, message: "faceEmbedding must be a non-empty numeric array" });
      return;
    }

    const student = await StudentModel.findByIdAndUpdate(
      studentId,
      {
        $set: {
          faceEmbedding,
          faceRegisteredAt: new Date(),
          faceAuthEnabled: true,
        },
      },
      { new: true, runValidators: true },
    );

    if (!student) {
      res.status(404).json({ success: false, message: "Student not found" });
      return;
    }

    res.json({ success: true, data: student });
  }),
);

export default router;
