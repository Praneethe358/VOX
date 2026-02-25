import { contextBridge, ipcRenderer } from "electron";

// Detect the API base URL passed via additionalArguments
const apiUrlArg = process.argv.find((a) => a.startsWith("--api-url="));
const API_BASE_URL = apiUrlArg ? apiUrlArg.replace("--api-url=", "") : "http://localhost:3000";

// ── Helper: JSON POST via fetch (used by examHTTP) ────────────────────────────
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ── Helper: multipart POST for file/audio uploads ────────────────────────────
async function postForm<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ── IPC-based API (local Electron window — same machine) ─────────────────────
contextBridge.exposeInMainWorld("examAPI", {
  // Admin
  adminLogin: (data: { username: string; password: string }) =>
    ipcRenderer.invoke("admin-login", data),
  uploadExamPDF: (data: {
    filePath: string;
    code: string;
    title: string;
    durationMinutes: number;
  }) => ipcRenderer.invoke("upload-exam-pdf", data),
  publishExam: (data: { code: string }) =>
    ipcRenderer.invoke("publish-exam", data),
  registerStudentFace: (student: unknown) =>
    ipcRenderer.invoke("register-student-face", student),

  // Student
  verifyStudentFace: (data: { examCode: string; liveDescriptor: number[] }) =>
    ipcRenderer.invoke("verify-student-face", data),
  getExamByCode: (data: { code: string }) =>
    ipcRenderer.invoke("get-exam-by-code", data),

  // AI
  sttCommand: (audio: Buffer) => ipcRenderer.invoke("stt-command", audio),
  sttAnswer: (audio: Buffer) => ipcRenderer.invoke("stt-answer", audio),
  ttsSpeak: (text: string) => ipcRenderer.invoke("tts-speak", text),
  formatAnswer: (raw: string) => ipcRenderer.invoke("format-answer", raw),

  // Database
  saveResponse: (response: unknown) => ipcRenderer.invoke("save-response", response),
  logAudit: (data: unknown) => ipcRenderer.invoke("log-audit", data),
  submitExam: (data: { studentId: string; examCode: string }) =>
    ipcRenderer.invoke("submit-exam", data),
});

// ── HTTP-based API (for remote student machines / direct browser access) ──────
// The frontend can use window.examHTTP instead of window.examAPI when running
// in a regular browser (no Electron IPC available).
contextBridge.exposeInMainWorld("examHTTP", {
  // Expose the server base URL so remote clients can build fetch calls directly
  baseUrl: API_BASE_URL,

  // Admin
  adminLogin: (data: { username: string; password: string }) =>
    post("/api/admin/login", data),

  uploadExamPDF: async (formData: FormData) =>
    postForm("/api/admin/upload-exam-pdf", formData),

  publishExam: (data: { code: string }) =>
    post("/api/admin/publish-exam", data),

  registerStudentFace: (student: unknown) =>
    post("/api/admin/register-student-face", student),

  // Student
  verifyStudentFace: (data: { examCode: string; liveDescriptor: number[] }) =>
    post("/api/student/verify-face", data),

  getExamByCode: (data: { code: string }) =>
    post("/api/student/get-exam", data),

  // AI  (audio: Blob → FormData with field "audio")
  sttCommand: async (audioBlob: Blob) => {
    const fd = new FormData();
    fd.append("audio", audioBlob, "audio.wav");
    return postForm("/api/ai/stt-command", fd);
  },

  sttAnswer: async (audioBlob: Blob) => {
    const fd = new FormData();
    fd.append("audio", audioBlob, "audio.wav");
    return postForm("/api/ai/stt-answer", fd);
  },

  ttsSpeak: (text: string) => post("/api/ai/tts-speak", { text }),

  formatAnswer: (rawText: string) => post("/api/ai/format-answer", { rawText }),

  // Database
  saveResponse: (response: unknown) => post("/api/db/save-response", response),

  logAudit: (data: unknown) => post("/api/db/log-audit", data),

  submitExam: (data: { studentId: string; examCode: string }) =>
    post("/api/db/submit-exam", data),
});

// ── Expose the API base URL for the renderer's own fetch calls ────────────────
contextBridge.exposeInMainWorld("API_BASE_URL", API_BASE_URL);
