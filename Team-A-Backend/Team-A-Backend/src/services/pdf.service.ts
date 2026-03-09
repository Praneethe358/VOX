// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PDFParse } = require("pdf-parse") as { PDFParse: new (opts: { data: Buffer }) => { getText: () => Promise<{ text: string }> } };
import fs from "fs";
import { Question } from "../database/models/Exam";

/**
 * PdfService — Extracts questions (including MCQs with options) from PDF files.
 *
 * Supported question formats:
 *   1. What is AI?             |  1) What is AI?   |  Q1. What is AI?
 *   A) Artificial Intelligence |  a. Artificial...  |  (a) Artificial...
 *   B) Auto Intelligence       |  b. Auto...        |  (b) Auto...
 *   C) Applied Intelligence    |  c. Applied...     |  (c) Applied...
 *   D) None of the above       |  d. None...        |  (d) None...
 *   Answer: A                  |  *A) (asterisk marks correct)
 *
 * Descriptive questions (no options detected) are returned as type "descriptive".
 */
export class PdfService {
  async parsePDF(filePath: string): Promise<Question[]> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: dataBuffer });
      const result = await parser.getText();
      const rawText = result.text;
      console.log(`[PDF] Extracted ${rawText.length} chars from PDF`);
      console.log(`[PDF] First 500 chars:\n${rawText.substring(0, 500)}`);
      const questions = this.extractQuestions(rawText);
      console.log(`[PDF] Extracted ${questions.length} questions`);
      return questions;
    } catch (error) {
      console.error("PDF parse error:", error);
      return [];
    }
  }

  /**
   * Normalise text extracted from PDFs:
   *  - Replace non-breaking spaces, zero-width chars, and other Unicode whitespace
   *  - Normalise line endings
   */
  private normaliseText(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Replace non-breaking spaces, thin spaces, zero-width spaces etc.
      .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ");
  }

  /**
   * Parse raw text into structured questions.
   * Also exported so the admin route can use it on plain-text / CSV uploads.
   */
  extractQuestions(text: string): Question[] {
    const normalised = this.normaliseText(text);
    const lines = normalised
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      // Filter out pdf-parse v2 page separator lines like "-- 1 of 2 --"
      .filter((l) => !/^--\s*\d+\s+of\s+\d+\s*--$/.test(l));

    console.log(`[PDF] Processing ${lines.length} non-empty lines`);
    if (lines.length > 0 && lines.length <= 5) {
      console.log(`[PDF] All lines:`, lines);
    } else if (lines.length > 5) {
      console.log(`[PDF] First 5 lines:`, lines.slice(0, 5));
    }

    const questions: Question[] = [];
    let currentQ: { id: number; text: string; options: string[]; correctIdx: number } | null = null;
    let nextId = 1;

    // ── Regex patterns (broadened for more PDF formats) ──────────────

    // Matches: "1. text", "1) text", "1: text", "1] text",
    //          "Q1. text", "Q.1 text", "Q 1. text", "Question 1: text"
    //          Also handles numbers without delimiters if followed by enough text
    const questionRe =
      /^(?:q(?:uestion)?\s*\.?\s*)?(\d+)\s*[.)\]:\-–—]\s*(.+)/i;

    // Fallback: line that starts with a number and has 10+ chars of text after it (no delimiter)
    const questionFallbackRe = /^(\d+)\s+(.{10,})/;

    // Matches option letters: "A) text", "a. text", "(A) text", "(a) text", "*A) text"
    const optionLetterRe =
      /^(\*?)\s*\(?([A-Da-d])\)?\s*[.)\]:\-–—]\s*(.+)/;

    // Matches option with number: "1) text" etc. — only used inside an open question
    const optionNumberRe = /^(\*?)\s*\(?([1-4])\)?\s*[.)\]:\-–—]\s*(.+)/;

    // Answer line: "Answer: A", "Ans: B", "Correct Answer: C", etc.
    const answerLineRe =
      /^(?:answer|ans|correct(?:\s*answer)?)\s*[:=\-–—]?\s*([A-Da-d1-4])/i;

    const pushCurrent = () => {
      if (!currentQ) return;
      const hasOptions = currentQ.options.length >= 2;
      questions.push({
        id: currentQ.id,
        text: currentQ.text,
        type: hasOptions ? "mcq" : "descriptive",
        ...(hasOptions ? { options: currentQ.options } : {}),
        ...(hasOptions && currentQ.correctIdx >= 0 ? { correctAnswer: currentQ.correctIdx } : {}),
      });
      currentQ = null;
    };

    for (const line of lines) {
      // 1) Check for an "Answer: X" line
      const ansMatch = line.match(answerLineRe);
      if (ansMatch && currentQ && currentQ.options.length >= 2) {
        const val = ansMatch[1].toUpperCase();
        const idx = val >= "A" && val <= "D"
          ? val.charCodeAt(0) - 65
          : parseInt(val, 10) - 1;
        if (idx >= 0 && idx < currentQ.options.length) {
          currentQ.correctIdx = idx;
        }
        continue;
      }

      // 2) Check for option with letter marker (A/B/C/D)
      const optLetterMatch = line.match(optionLetterRe);
      if (optLetterMatch && currentQ) {
        const isCorrect = optLetterMatch[1] === "*";
        const optText = optLetterMatch[3].trim();
        const idx = currentQ.options.length;
        currentQ.options.push(optText);
        if (isCorrect) currentQ.correctIdx = idx;
        continue;
      }

      // 3) Check for option with number marker (1/2/3/4) — only if we have an open question
      if (currentQ && currentQ.options.length < 4) {
        const optNumMatch = line.match(optionNumberRe);
        if (optNumMatch) {
          const num = parseInt(optNumMatch[2], 10);
          if (currentQ.options.length > 0 || (num >= 1 && num <= 4 && num !== nextId)) {
            const isCorrect = optNumMatch[1] === "*";
            const optText = optNumMatch[3].trim();
            const idx = currentQ.options.length;
            currentQ.options.push(optText);
            if (isCorrect) currentQ.correctIdx = idx;
            continue;
          }
        }
      }

      // 4) Check for a new question line (primary pattern)
      const qMatch = line.match(questionRe);
      if (qMatch) {
        pushCurrent();
        const qText = qMatch[2].trim();
        if (qText.length > 2) {
          currentQ = { id: nextId++, text: qText, options: [], correctIdx: -1 };
        }
        continue;
      }

      // 4b) Fallback question pattern (number + long text, no delimiter)
      const qFallback = line.match(questionFallbackRe);
      if (qFallback) {
        const num = parseInt(qFallback[1], 10);
        // Only treat as a question if the number is roughly sequential
        if (num === nextId || (num >= 1 && !currentQ)) {
          pushCurrent();
          const qText = qFallback[2].trim();
          currentQ = { id: nextId++, text: qText, options: [], correctIdx: -1 };
          continue;
        }
      }

      // 5) If none of the above matched and we have a current question with no options yet,
      //    this line might be a continuation of the question text.
      if (currentQ && currentQ.options.length === 0 && line.length > 3) {
        currentQ.text += " " + line;
      }
    }

    // Flush the last question
    pushCurrent();

    // ── Fallback: if the regex-based parser found nothing, try splitting by
    //    common question-number patterns using split ──────────────────────
    if (questions.length === 0 && normalised.length > 20) {
      console.log("[PDF] Primary parser found 0 questions, trying fallback split...");
      const fallback = this.fallbackExtract(normalised);
      if (fallback.length > 0) return fallback;
    }

    return questions;
  }

  /**
   * Fallback extractor: splits the whole text by any pattern that looks like
   * a question number boundary, then treats each chunk as a question.
   */
  private fallbackExtract(text: string): Question[] {
    // Split on patterns like "1.", "2)", "Q3:", etc. at the start of a line
    const parts = text.split(/(?:^|\n)\s*(?:q(?:uestion)?\s*\.?\s*)?\d+\s*[.)\]:\-–—]/i);
    // The first part is usually header text before question 1 — skip it
    const chunks = parts.slice(1).map((p) => p.trim()).filter((p) => p.length > 3);

    if (chunks.length === 0) {
      // Last resort: split by double-newlines and treat each paragraph as a question
      const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 10);
      // Only use this if we get a reasonable number (2-200)
      if (paragraphs.length >= 2 && paragraphs.length <= 200) {
        console.log(`[PDF] Paragraph-split fallback found ${paragraphs.length} questions`);
        return paragraphs.map((p, i) => ({
          id: i + 1,
          text: p.replace(/\n/g, " ").trim(),
          type: "descriptive" as const,
        }));
      }
      return [];
    }

    console.log(`[PDF] Fallback split found ${chunks.length} questions`);
    const questions: Question[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      // Try to extract options from the chunk
      const optionRe = /(?:^|\n)\s*\(?([A-Da-d])\)?\s*[.)\]:\-–—]\s*(.+)/g;
      const options: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = optionRe.exec(chunk)) !== null) {
        options.push(m[2].trim());
      }
      // The question text is everything before the first option
      const firstOptIdx = chunk.search(/(?:^|\n)\s*\(?[A-Da-d]\)?\s*[.)\]:\-–—]/);
      const qText = (firstOptIdx > 0 ? chunk.substring(0, firstOptIdx) : chunk)
        .replace(/\n/g, " ")
        .trim();
      const hasOptions = options.length >= 2;
      questions.push({
        id: i + 1,
        text: qText,
        type: hasOptions ? "mcq" : "descriptive",
        ...(hasOptions ? { options } : {}),
      });
    }
    return questions;
  }
}

export const pdfService = new PdfService();
