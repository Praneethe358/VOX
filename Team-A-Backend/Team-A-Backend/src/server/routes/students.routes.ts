import { Router, Request, Response } from "express";
import { dataProvider } from "../../database/provider";
import { sendError, sendSuccess } from "../http-response";

const router = Router();

// GET /api/students/dashboard  (student dashboard stats)
// Accepts optional ?studentId= query param or falls back to a demo student
router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const studentId = (req.query.studentId as string) || (req.headers['x-student-id'] as string) || 'DEMO_STUDENT_001';
    const stats = await dataProvider.getStudentDashboardStats(studentId);
    sendSuccess(res, stats);
  } catch (error) {
    sendError(res, String(error));
  }
});

// GET /api/students/profile
router.get("/profile", async (req: Request, res: Response) => {
  try {
    const studentId = (req.query.studentId as string) || (req.headers['x-student-id'] as string) || 'DEMO_STUDENT_001';
    const student = await dataProvider.findStudentById(studentId);
    if (!student) {
      // Return a generic profile rather than 404 so demo mode works
      sendSuccess(res, {
        student: {
          studentId: 'DEMO_STUDENT_001',
          name: 'Demo Student',
          email: 'demo@student.local',
          rollNumber: 'DEMO001',
        },
      });
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
