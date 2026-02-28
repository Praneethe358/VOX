import { Schema, model, Document, Types } from "mongoose";

export interface SystemLogDocument extends Document {
  level: "error" | "critical";
  message: string;
  source: string;
  examSessionId?: Types.ObjectId;
  timestamp: Date;
}

const systemLogSchema = new Schema<SystemLogDocument>(
  {
    level: { type: String, enum: ["error", "critical"], required: true, index: true },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    source: { type: String, required: true, trim: true, maxlength: 150 },
    examSessionId: { type: Schema.Types.ObjectId, ref: "ExamSession", index: true },
    timestamp: { type: Date, required: true, default: () => new Date(), index: true },
  },
  { timestamps: false, versionKey: false },
);

systemLogSchema.index({ level: 1, timestamp: -1 });

export const SystemLogModel = model<SystemLogDocument>("SystemLog", systemLogSchema);
