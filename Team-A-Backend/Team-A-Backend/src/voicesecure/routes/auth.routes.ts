import { Router } from "express";
import bcrypt from "bcrypt";
import { asyncHandler } from "../core/middleware/async-handler";
import { AdminModel } from "../models/admin.model";
import { signAdminToken, requireAuth, requireRole } from "../core/middleware/auth";

const router = Router();

router.post(
  "/admin-login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ success: false, message: "email and password are required" });
      return;
    }

    const admin = await AdminModel.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    const token = signAdminToken({
      adminId: String(admin._id),
      email: admin.email,
      role: admin.role,
    });

    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          mfaEnabled: admin.mfaEnabled,
        },
      },
    });
  }),
);

router.post(
  "/admins",
  requireAuth,
  requireRole("super-admin"),
  asyncHandler(async (req, res) => {
    const { name, email, password, role, mfaEnabled } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: "super-admin" | "exam-admin";
      mfaEnabled?: boolean;
    };

    if (!name || !email || !password || !role) {
      res.status(400).json({ success: false, message: "name, email, password and role are required" });
      return;
    }

    const existing = await AdminModel.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(409).json({ success: false, message: "Admin email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await AdminModel.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      mfaEnabled: !!mfaEnabled,
    });

    res.status(201).json({ success: true, data: admin });
  }),
);

export default router;
