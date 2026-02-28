import { Schema, model, Document, Types } from "mongoose";

export interface ActivityLogDocument extends Document {
  examSessionId: Types.ObjectId;
  eventType: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

const activityLogSchema = new Schema<ActivityLogDocument>(
  {
    examSessionId: { type: Schema.Types.ObjectId, ref: "ExamSession", required: true, index: true },
    eventType: { type: String, required: true, trim: true, maxlength: 120 },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, required: true, default: () => new Date(), index: true },
  },
  { timestamps: true, versionKey: false },
);
activityLogSchema.index({ eventType: 1, timestamp: -1 });

export const ActivityLogModel = model<ActivityLogDocument>("ActivityLog", activityLogSchema);
