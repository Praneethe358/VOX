import { Schema, model, Document, Types } from "mongoose";

export interface AIConfigurationDocument extends Document {
  singletonKey: "global";
  sttEngine: "vosk" | "whisper";
  llmModel: string;
  grammarCorrection: boolean;
  autoSaveInterval: number;
  multilingualMode: boolean;
  ttsSpeed: number;
  updatedBy?: Types.ObjectId;
  updatedAt: Date;
}

const aiConfigurationSchema = new Schema<AIConfigurationDocument>(
  {
    singletonKey: { type: String, enum: ["global"], default: "global", unique: true, required: true },
    sttEngine: { type: String, enum: ["vosk", "whisper"], default: "whisper", required: true },
    llmModel: { type: String, required: true, default: "llama3.2", maxlength: 80 },
    grammarCorrection: { type: Boolean, default: true },
    autoSaveInterval: { type: Number, required: true, default: 15, min: 5, max: 300 },
    multilingualMode: { type: Boolean, default: true },
    ttsSpeed: { type: Number, required: true, default: 1, min: 0.5, max: 2.5 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    updatedAt: { type: Date, default: () => new Date(), required: true },
  },
  { timestamps: false, versionKey: false },
);

export const AIConfigurationModel = model<AIConfigurationDocument>("AIConfiguration", aiConfigurationSchema);
