import { Schema, model, Document, Types } from "mongoose";

interface ExamQuestion {
  questionNumber: number;
  prompt: string;
  marks: number;
  type: "mcq" | "short" | "long";
  options?: string[];
}

export interface ExamDocument extends Document {
  title: string;
  subject: string;
  durationMinutes: number;
  totalMarks: number;
  instructions: string;
  language: string;
  questions: ExamQuestion[];
  pdfURL?: string;
  scheduledDate: Date;
  createdBy: Types.ObjectId;
  isActive: boolean;
}

const questionSchema = new Schema<ExamQuestion>(
  {
    questionNumber: { type: Number, required: true, min: 1 },
    prompt: { type: String, required: true, trim: true, maxlength: 2000 },
    marks: { type: Number, required: true, min: 0.5, max: 100 },
    type: { type: String, enum: ["mcq", "short", "long"], required: true },
    options: {
      type: [String],
      default: undefined,
      validate: {
        validator: (v?: string[]) => !v || v.length <= 8,
        message: "MCQ options exceed limit",
      },
    },
  },
  { _id: false },
);

const examSchema = new Schema<ExamDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    durationMinutes: { type: Number, required: true, min: 1, max: 600 },
    totalMarks: { type: Number, required: true, min: 1, max: 1000 },
    instructions: { type: String, required: true, trim: true, maxlength: 10000 },
    language: { type: String, required: true, default: "en", maxlength: 20 },
    questions: {
      type: [questionSchema],
      required: true,
      validate: {
        validator: (v: ExamQuestion[]) => Array.isArray(v) && v.length > 0 && v.length <= 300,
        message: "questions must be between 1 and 300",
      },
    },
    pdfURL: { type: String, trim: true, maxlength: 500 },
    scheduledDate: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin", required: true, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

examSchema.index({ subject: 1, scheduledDate: 1 });
examSchema.index({ isActive: 1, scheduledDate: 1 });

export const ExamModel = model<ExamDocument>("Exam", examSchema);
