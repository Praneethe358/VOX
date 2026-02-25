import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { speechService } from "../../services/speech.service";
import { ttsService } from "../../services/tts.service";
import { llamaService } from "../../services/llama.service";

const router = Router();

// Multer for audio uploads (WAV/WebM blobs from frontend)
const audioUpload = multer({ dest: path.join(process.cwd(), "tmp-uploads") });

// POST /api/ai/stt-command
// Accepts multipart: field "audio" (WAV buffer)
router.post("/stt-command", audioUpload.single("audio"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No audio file uploaded" });
      return;
    }
    const buffer = fs.readFileSync(req.file.path);
    const result = await speechService.recognizeCommand(buffer);
    fs.unlink(req.file.path, () => {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ text: "", confidence: 0, error: String(error) });
  }
});

// POST /api/ai/stt-answer
router.post("/stt-answer", audioUpload.single("audio"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No audio file uploaded" });
      return;
    }
    const buffer = fs.readFileSync(req.file.path);
    const result = await speechService.transcribeAnswer(buffer);
    fs.unlink(req.file.path, () => {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ text: "", confidence: 0, error: String(error) });
  }
});

// POST /api/ai/tts-speak
router.post("/tts-speak", (req: Request, res: Response) => {
  const { text } = req.body as { text: string };
  if (!text) {
    res.status(400).json({ error: "text required" });
    return;
  }
  ttsService.speak(text);
  res.json({ success: true });
});

// POST /api/ai/format-answer
router.post("/format-answer", async (req: Request, res: Response) => {
  try {
    const { rawText } = req.body as { rawText: string };
    if (!rawText) {
      res.status(400).json({ error: "rawText required" });
      return;
    }
    const formatted = await llamaService.formatExamAnswer(rawText);
    res.json({ formatted });
  } catch (error) {
    res.status(500).json({ formatted: "", error: String(error) });
  }
});

export default router;
