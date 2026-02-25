export interface ResponseDocument {
  studentId: string;
  examCode: string;
  questionId: number;
  rawAnswer: string;
  formattedAnswer: string;
  confidence: number;
  timestamp: string;
}
