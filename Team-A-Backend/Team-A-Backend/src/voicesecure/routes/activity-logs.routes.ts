import { Router } from "express";
import { asyncHandler } from "../core/middleware/async-handler";
import { requireAuth, requireRole } from "../core/middleware/auth";
import { ActivityLogModel } from "../models/activity-log.model";

const router = Router();

// Sample endpoint: Log activity
router.post(
  "/",
  requireAuth,
  requireRole("super-admin", "exam-admin"),
  asyncHandler(async (req, res) => {
    const { examSessionId, eventType, metadata } = req.body as {
      examSessionId?: string;
      eventType?: string;
      metadata?: Record<string, unknown>;
    };

    if (!examSessionId || !eventType) {
      res.status(400).json({ success: false, message: "examSessionId and eventType are required" });
      return;
    }

    const log = await ActivityLogModel.create({
      examSessionId,
      eventType,
      metadata,
      timestamp: new Date(),
    });

    res.status(201).json({ success: true, data: log });
  }),
);

export default router;
