import { Router } from "express";
import { asyncHandler } from "../core/middleware/async-handler";
import { requireAuth, requireRole } from "../core/middleware/auth";
import { AIConfigurationModel } from "../models/ai-configuration.model";
import { SystemLogModel } from "../models/system-log.model";

const router = Router();

router.get(
  "/ai",
  requireAuth,
  requireRole("super-admin", "exam-admin"),
  asyncHandler(async (_req, res) => {
    const cfg = await AIConfigurationModel.findOneAndUpdate(
      { singletonKey: "global" },
      { $setOnInsert: { singletonKey: "global" } },
      { upsert: true, new: true },
    );
    res.json({ success: true, data: cfg });
  }),
);

router.put(
  "/ai",
  requireAuth,
  requireRole("super-admin"),
  asyncHandler(async (req, res) => {
    const cfg = await AIConfigurationModel.findOneAndUpdate(
      { singletonKey: "global" },
      {
        $set: {
          ...req.body,
          updatedBy: req.auth!.adminId,
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true },
    );

    res.json({ success: true, data: cfg });
  }),
);

router.post(
  "/system-logs",
  requireAuth,
  requireRole("super-admin", "exam-admin"),
  asyncHandler(async (req, res) => {
    const log = await SystemLogModel.create(req.body);
    res.status(201).json({ success: true, data: log });
  }),
);

export default router;
