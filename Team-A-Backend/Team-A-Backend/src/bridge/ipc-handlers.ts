import { ipcMain, IpcMainInvokeEvent } from "electron";
import { mongoService } from "../database/mongo-client";
import { pdfService } from "../services/pdf.service";
import { speechService } from "../services/speech.service";
import { ttsService } from "../services/tts.service";
import { llamaService } from "../services/llama.service";
import { faceService } from "../services/face.service";
import { ResponseDocument } from "../database/models/Response";
import { StudentDocument } from "../database/models/Student";

export function registerIPCHandlers(): void {
  // ── Admin ──────────────────────────────────────────────────────────
  ipcMain.handle("admin-login", async (
    _e: IpcMainInvokeEvent,
    data: { username: string; password: string },
  ) => {
    return mongoService.adminLogin(data.username, data.password);
  });

  ipcMain.handle("upload-exam-pdf", async (
    _e: IpcMainInvokeEvent,
    data: { filePath: string; code: string; title: string; durationMinutes: number },
  ) => {
    try {
      const questions = await pdfService.parsePDF(data.filePath);
      await mongoService.saveExam({
        code: data.code,
        title: data.title,
        questions,
        durationMinutes: data.durationMinutes,
        status: "draft",
      });
      return { success: true, questionCount: questions.length };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("publish-exam", async (
    _e: IpcMainInvokeEvent,
    data: { code: string },
  ) => {
    await mongoService.publishExam(data.code);
    return { success: true };
  });

  ipcMain.handle("register-student-face", async (
    _e: IpcMainInvokeEvent,
    student: StudentDocument,
  ) => {
    await mongoService.registerStudent({
      ...student,
      registeredAt: new Date().toISOString(),
    });
    return { success: true };
  });

  // ── Student ────────────────────────────────────────────────────────
  ipcMain.handle("verify-student-face", async (
    _e: IpcMainInvokeEvent,
    data: { examCode: string; liveDescriptor: number[] },
  ) => {
    return faceService.verifyFace(data.examCode, data.liveDescriptor);
  });

  ipcMain.handle("get-exam-by-code", async (
    _e: IpcMainInvokeEvent,
    data: { code: string },
  ) => {
    return mongoService.getExamByCode(data.code);
  });

  // ── AI ────────────────────────────────────────────────────────────
  ipcMain.handle("stt-command", async (
    _e: IpcMainInvokeEvent,
    audioBuffer: Buffer,
  ) => {
    return speechService.recognizeCommand(audioBuffer);
  });

  ipcMain.handle("stt-answer", async (
    _e: IpcMainInvokeEvent,
    audioBuffer: Buffer,
  ) => {
    return speechService.transcribeAnswer(audioBuffer);
  });

  ipcMain.handle("tts-speak", async (
    _e: IpcMainInvokeEvent,
    text: string,
  ) => {
    ttsService.speak(text);
  });

  ipcMain.handle("format-answer", async (
    _e: IpcMainInvokeEvent,
    rawText: string,
  ) => {
    return llamaService.formatExamAnswer(rawText);
  });

  // ── Database ───────────────────────────────────────────────────────
  ipcMain.handle("save-response", async (
    _e: IpcMainInvokeEvent,
    response: ResponseDocument,
  ) => {
    await mongoService.saveResponse(response);
    return { success: true };
  });

  ipcMain.handle("log-audit", async (
    _e: IpcMainInvokeEvent,
    data: { studentId: string; examCode: string; action: string; metadata?: unknown },
  ) => {
    await mongoService.logAudit(data);
    return { success: true };
  });

  ipcMain.handle("submit-exam", async (
    _e: IpcMainInvokeEvent,
    data: { studentId: string; examCode: string },
  ) => {
    await mongoService.submitExam(data.studentId, data.examCode);
    return { success: true };
  });
}
