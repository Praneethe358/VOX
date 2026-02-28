import { Schema, model, Document, Types } from "mongoose";

type SessionStatus = "not-started" | "in-progress" | "submitted" | "terminated";

interface SuspiciousFlag {
  reason: string;
  at: Date;
  metadata?: Record<string, unknown>;
}

export interface ExamSessionDocument extends Document {
  studentId: Types.ObjectId;
  examId: Types.ObjectId;
  loginTime?: Date;
  startTime?: Date;
  endTime?: Date;
  currentQuestionNumber: number;
  status: SessionStatus;
  faceAuthConfidence?: number;
  kioskVerified: boolean;
  suspiciousFlags: SuspiciousFlag[];
  autoSaveCount: number;
  finalPdfURL?: string;
  isLocked: boolean;
  submittedAt?: Date;
}

const suspiciousFlagSchema = new Schema<SuspiciousFlag>(
  {
    reason: { type: String, required: true, trim: true, maxlength: 200 },
    at: { type: Date, default: () => new Date(), required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const examSessionSchema = new Schema<ExamSessionDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true, index: true },
    loginTime: { type: Date },
    startTime: { type: Date },
    endTime: { type: Date },
    currentQuestionNumber: { type: Number, required: true, default: 1, min: 1 },
    status: { type: String, enum: ["not-started", "in-progress", "submitted", "terminated"], default: "not-started", required: true },
    faceAuthConfidence: { type: Number, min: 0, max: 1 },
    kioskVerified: { type: Boolean, default: false },
    suspiciousFlags: {
      type: [suspiciousFlagSchema],
      default: [],
      validate: {
        validator: (v: SuspiciousFlag[]) => v.length <= 100,
        message: "suspiciousFlags exceeds max length",
      },
    },
    autoSaveCount: { type: Number, default: 0, min: 0 },
    finalPdfURL: { type: String, trim: true, maxlength: 500 },
    isLocked: { type: Boolean, default: false },
    submittedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);
examSessionSchema.index({ status: 1, createdAt: -1 });
examSessionSchema.index({ studentId: 1, examId: 1, status: 1 });

export const ExamSessionModel = model<ExamSessionDocument>("ExamSession", examSessionSchema);
