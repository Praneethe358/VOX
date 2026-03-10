import { Router, Request, Response } from "express";
import { dataProvider } from "../../database/provider";
import { sendError, sendSuccess } from "../http-response";

const router = Router();

// GET /api/students/dashboard
router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const studentId = (req.query.studentId as string) || (req.headers['x-student-id'] as string);
    if (!studentId) {
      sendError(res, "studentId required", 400);
      return;
    }
    const stats = await dataProvider.getStudentDashboardStats(studentId);
    sendSuccess(res, stats);
  } catch (error) {
    sendError(res, String(error));
  }
});

// GET /api/students/profile
router.get("/profile", async (req: Request, res: Response) => {
  try {
    const studentId = (req.query.studentId as string) || (req.headers['x-student-id'] as string);
    if (!studentId) {
      sendError(res, "studentId required", 400);
      return;
    }
    const student = await dataProvider.findStudentById(studentId);
    if (!student) {
      sendError(res, "Student not found", 404);
      return;
    }
    sendSuccess(res, {
      student: {
        studentId: student.studentId || student.rollNumber,
        name: student.name,
        email: student.email || '',
        rollNumber: student.rollNumber || '',
        examCode: student.examCode || '',
      },
    });
  } catch (error) {
    sendError(res, String(error));
  }
});

export default router;
