/**
 * Face Recognition Routes
 *
 * POST /api/face/register     — Register face embedding (admin, multi-frame)
 * POST /api/face/verify       — Verify face for login (student)
 * POST /api/face/verify-by-id — Verify face against specific studentId
 * GET  /api/face/students     — List registered students (admin)
 * GET  /api/face/embedding/:studentId — Get embedding info for a student
 * DELETE /api/face/embedding/:studentId — Delete a student's face data
 * GET  /api/face/attempts/:studentId — Get login attempt history
 */

import { Router, Request, Response } from "express";
import { faceService } from "../../services/face.service";
import { dataProvider } from "../../database/provider";
import { sendError, sendSuccess } from "../http-response";

const router = Router();

// ─── POST /api/face/register ────────────────────────────────────────────────
// Body: { studentId, studentName, examCode?, email?, descriptors: number[][], qualityScore? }
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { studentId, studentName, examCode, email, descriptors, qualityScore } = req.body;

    if (!studentId || !studentName) {
      sendError(res, "studentId and studentName are required", 400);
      return;
    }
    if (!Array.isArray(descriptors) || descriptors.length === 0) {
      sendError(res, "descriptors array is required (capture at least 1 frame)", 400);
      return;
    }
    // Validate each descriptor is a number array
    for (let i = 0; i < descriptors.length; i++) {
      if (!Array.isArray(descriptors[i]) || descriptors[i].length < 64) {
        sendError(res, `Invalid descriptor at index ${i}: must be a number array of length >= 64`, 400);
        return;
      }
    }

    // Register via dataProvider (delegates to mockDb in mock mode, faceService in real DB)
    const result = await dataProvider.registerFaceEmbedding({
      studentId,
      studentName,
      examCode,
      email,
      descriptors,
      qualityScore,
    });

    // Also register in the legacy student store for backward compat
    const averaged = faceService.averageDescriptors(descriptors);
    await dataProvider.registerStudent({
      studentId,
      name: studentName,
      examCode: examCode || "TECH101",
      email,
      faceDescriptor: averaged,
      registeredAt: new Date().toISOString(),
    });

    console.log(`[face/register] ✅ Registered ${studentId} (${studentName}), embedding size: ${result.embeddingSize}, frames: ${result.frameCount}`);
    sendSuccess(res, result);
  } catch (error) {
    console.error("[face/register] Error:", error);
    sendError(res, String(error), 500);
  }
});

// ─── POST /api/face/verify ──────────────────────────────────────────────────
// Body: { examCode, liveDescriptor: number[] }
// Used for generic exam-based face matching (legacy flow)
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const { examCode, liveDescriptor } = req.body;

    if (!Array.isArray(liveDescriptor) || liveDescriptor.length === 0) {
      sendError(res, "liveDescriptor array is required", 400);
      return;
    }

    // Try face service first (real DB), fall back to dataProvider
    const result = await dataProvider.verifyFace(examCode || "", liveDescriptor);

    console.log(`[face/verify] examCode=${examCode}, matched=${result.success}, confidence=${result.confidence?.toFixed(3)}, distance=${result.distance?.toFixed(3)}, studentId=${result.studentId}`);

    sendSuccess(res, {
      matched: result.success,
      studentId: result.studentId,
      confidence: result.confidence ?? (result.success ? 1 : 0),
      distance: result.distance ?? 0,
      method: "cosine",
      student: result.student,
    });
  } catch (error) {
    console.error("[face/verify] Error:", error);
    sendError(res, String(error), 500);
  }
});

// ─── POST /api/face/verify-by-id ───────────────────────────────────────────
// Body: { studentId, liveDescriptor: number[] }
// Used by student login flow — looks up specific student
router.post("/verify-by-id", async (req: Request, res: Response) => {
  try {
    const { studentId, liveDescriptor } = req.body;

    if (!studentId) {
      sendError(res, "studentId is required", 400);
      return;
    }
    if (!Array.isArray(liveDescriptor) || liveDescriptor.length === 0) {
      sendError(res, "liveDescriptor array is required", 400);
      return;
    }

    // Use dataProvider which routes to mock or real DB automatically
    const result = await dataProvider.verifyFaceById(studentId, liveDescriptor);
    console.log(`[face/verify-by-id] studentId=${studentId}, matched=${result.matched}, confidence=${result.confidence?.toFixed(3)}, distance=${result.distance?.toFixed(3)}`);
    sendSuccess(res, result);
  } catch (error) {
    console.error("[face/verify-by-id] Error:", error);
    sendError(res, String(error), 500);
  }
});

// ─── GET /api/face/students ─────────────────────────────────────────────────
// Returns list of registered face students (minus raw embeddings)
router.get("/students", async (_req: Request, res: Response) => {
  try {
    const allStudents = await dataProvider.getAllRegisteredStudents();
    sendSuccess(res, allStudents);
  } catch (error) {
    console.error("[face/students] Error:", error);
    sendError(res, String(error), 500);
  }
});

// ─── GET /api/face/embedding/:studentId ─────────────────────────────────────
router.get("/embedding/:studentId", async (req: Request, res: Response) => {
  try {
    const studentId = String(req.params.studentId);
    const embedding = await faceService.getFaceEmbedding(studentId);
    if (!embedding) {
      sendError(res, "No face embedding found for this student", 404);
      return;
    }
    sendSuccess(res, {
      studentId: embedding.studentId,
      studentName: embedding.studentName,
      embeddingSize: embedding.normalizedEmbedding?.length ?? 0,
      frameCount: embedding.frameCount,
      qualityScore: embedding.qualityScore,
      createdAt: embedding.createdAt,
      updatedAt: embedding.updatedAt,
    });
  } catch (error) {
    sendError(res, String(error), 500);
  }
});

// ─── DELETE /api/face/embedding/:studentId ──────────────────────────────────
router.delete("/embedding/:studentId", async (req: Request, res: Response) => {
  try {
    const studentId = String(req.params.studentId);
    const deleted = await faceService.deleteFaceEmbedding(studentId);
    sendSuccess(res, { deleted, studentId });
  } catch (error) {
    sendError(res, String(error), 500);
  }
});

// ─── GET /api/face/attempts/:studentId ──────────────────────────────────────
router.get("/attempts/:studentId", async (req: Request, res: Response) => {
  try {
    const studentId = String(req.params.studentId);
    const attempts = await faceService.getLoginAttempts(studentId);
    sendSuccess(res, attempts);
  } catch (error) {
    sendError(res, String(error), 500);
  }
});

export default router;
