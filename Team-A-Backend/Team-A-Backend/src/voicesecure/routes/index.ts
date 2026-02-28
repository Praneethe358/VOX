import { Router } from "express";
import authRoutes from "./auth.routes";
import studentsRoutes from "./students.routes";
import examsRoutes from "./exams.routes";
import examSessionsRoutes from "./exam-sessions.routes";
import answersRoutes from "./answers.routes";
import activityLogsRoutes from "./activity-logs.routes";
import configRoutes from "./config.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/students", studentsRoutes);
router.use("/exams", examsRoutes);
router.use("/exam-sessions", examSessionsRoutes);
router.use("/answers", answersRoutes);
router.use("/activity-logs", activityLogsRoutes);
router.use("/config", configRoutes);

export default router;
