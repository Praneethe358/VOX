export interface Question {
  id: number;
  text: string;
}

export interface ExamDocument {
  code: string;
  title: string;
  questions: Question[];
  durationMinutes: number;
  status: "draft" | "active";
}
