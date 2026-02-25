// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;
import fs from "fs";
import { Question } from "../database/models/Exam";

export class PdfService {
  async parsePDF(filePath: string): Promise<Question[]> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return this.extractQuestions(data.text);
    } catch (error) {
      console.error("PDF parse error:", error);
      return [];
    }
  }

  private extractQuestions(text: string): Question[] {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const questions: Question[] = [];
    let id = 1;

    for (const line of lines) {
      // Match lines that start with a number followed by . or ) or :
      if (/^\d+[\.\)\:]\s+.+/.test(line)) {
        const questionText = line.replace(/^\d+[\.\)\:]\s+/, "").trim();
        if (questionText.length > 5) {
          questions.push({ id: id++, text: questionText });
        }
      }
    }

    return questions;
  }
}

export const pdfService = new PdfService();
