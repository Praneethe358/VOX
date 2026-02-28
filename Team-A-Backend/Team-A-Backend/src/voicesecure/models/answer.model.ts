import { Schema, model, Document, Types } from "mongoose";

interface RevisionItem {
  rawSpeechText: string;
  formattedAnswer: string;
  editedAt: Date;
}

export interface AnswerDocument extends Document {
  examSessionId: Types.ObjectId;
  questionNumber: number;
  rawSpeechText: string;
  formattedAnswer: string;
  wordCount: number;
  lastEditedAt: Date;
  revisionHistory: RevisionItem[];
}

const revisionSchema = new Schema<RevisionItem>(
  {
    rawSpeechText: { type: String, required: true, trim: true, maxlength: 8000 },
    formattedAnswer: { type: String, required: true, trim: true, maxlength: 10000 },
    editedAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

const answerSchema = new Schema<AnswerDocument>(
  {
    examSessionId: { type: Schema.Types.ObjectId, ref: "ExamSession", required: true, index: true },
    questionNumber: { type: Number, required: true, min: 1 },
    rawSpeechText: { type: String, required: true, trim: true, maxlength: 8000 },
    formattedAnswer: { type: String, required: true, trim: true, maxlength: 10000 },
    wordCount: { type: Number, required: true, min: 0, max: 5000 },
    lastEditedAt: { type: Date, required: true, default: () => new Date() },
    revisionHistory: {
      type: [revisionSchema],
      default: [],
      validate: {
        validator: (v: RevisionItem[]) => v.length <= 20,
        message: "revisionHistory exceeds max length",
      },
    },
  },
  { timestamps: true, versionKey: false },
);
answerSchema.index({ examSessionId: 1, questionNumber: 1 }, { unique: true });

export const AnswerModel = model<AnswerDocument>("Answer", answerSchema);
