export interface Question {
  id: number;
  text: string;
  type: "mcq" | "descriptive";
  options?: string[];       // A, B, C, D option texts (for MCQ)
  correctAnswer?: number;   // 0-based index into options (for auto-grading)
}

export interface ExamDocument {
  code: string;
  title: string;
  questions: Question[];
  durationMinutes: number;
  status: "draft" | "active";
  instructions?: string;
  createdAt?: string;
}
