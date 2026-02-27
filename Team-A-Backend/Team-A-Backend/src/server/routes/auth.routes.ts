import { Router, Request, Response } from "express";
import { dataProvider } from "../../database/provider";
import { sendError, sendSuccess } from "../http-response";

const router = Router();

// POST /api/auth/login  (student password-based login)
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
      sendError(res, "email and password required", 400);
      return;
    }
    const student = await dataProvider.findStudentByCredentials(email, password);
    if (!student) {
      sendError(res, "Invalid credentials", 401);
      return;
    }
    sendSuccess(res, {
      authenticated: true,
      student: {
        studentId: student.studentId || student.rollNumber,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        examCode: student.examCode,
      },
    });
  } catch (error) {
    sendError(res, String(error));
  }
});

// POST /api/auth/face-recognize  (student face-based login)
router.post("/face-recognize", async (req: Request, res: Response) => {
  try {
    const { examCode, liveDescriptor, faceDescriptor } = req.body as {
      examCode?: string;
      liveDescriptor?: number[];
      faceDescriptor?: number[];
    };
    const descriptor = liveDescriptor || faceDescriptor;
    if (!examCode || !Array.isArray(descriptor)) {
      sendError(res, "examCode and face descriptor required", 400);
      return;
    }
    const result = await dataProvider.verifyFace(examCode, descriptor);
    if (!result.success) {
      sendError(res, "Face not recognized", 401);
      return;
    }
    const student = await dataProvider.findStudentById(result.studentId || '');
    sendSuccess(res, {
      matched: true,
      studentId: result.studentId,
      student: student ? {
        studentId: student.studentId || student.rollNumber,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        examCode: student.examCode,
      } : null,
    });
  } catch (error) {
    sendError(res, String(error));
  }
});

export default router;
