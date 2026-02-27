import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { speechService } from "../../services/speech.service";
import { ttsService } from "../../services/tts.service";
import { llamaService } from "../../services/llama.service";
import { sendError, sendSuccess } from "../http-response";

const router = Router();

// Multer for audio uploads (WAV/WebM blobs from frontend)
const audioUpload = multer({ dest: path.join(process.cwd(), "tmp-uploads") });

// POST /api/ai/stt-command
// Accepts multipart: field "audio" (WAV buffer)
router.post("/stt-command", audioUpload.single("audio"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      sendError(res, "No audio file uploaded", 400);
      return;
    }
    const buffer = fs.readFileSync(req.file.path);
    const result = await speechService.recognizeCommand(buffer);
    fs.unlink(req.file.path, () => {});
    sendSuccess(res, result);
  } catch (error) {
    sendError(res, String(error));
  }
});

// POST /api/ai/stt-answer
router.post("/stt-answer", audioUpload.single("audio"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      sendError(res, "No audio file uploaded", 400);
      return;
    }
    const buffer = fs.readFileSync(req.file.path);
    const result = await speechService.transcribeAnswer(buffer);
    fs.unlink(req.file.path, () => {});
    sendSuccess(res, result);
  } catch (error) {
    sendError(res, String(error));
  }
});

// POST /api/ai/tts-speak
router.post("/tts-speak", (req: Request, res: Response) => {
  const { text } = req.body as { text: string };
  if (!text) {
    sendError(res, "text required", 400);
    return;
  }
  ttsService.speak(text);
  sendSuccess(res, { spoken: true });
});

// POST /api/ai/format-answer
router.post("/format-answer", async (req: Request, res: Response) => {
  try {
    const { rawText } = req.body as { rawText: string };
    if (!rawText) {
      sendError(res, "rawText required", 400);
      return;
    }
    const formatted = await llamaService.formatExamAnswer(rawText);
    sendSuccess(res, { formatted });
  } catch (error) {
    sendError(res, String(error));
  }
});

export default router;
