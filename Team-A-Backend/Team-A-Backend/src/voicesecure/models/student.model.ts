import { Schema, model, Document } from "mongoose";

export interface StudentDocument extends Document {
  registerNumber: string;
  fullName: string;
  email: string;
  department: string;
  year: number;
  languagePreference: string;
  faceEmbedding: number[];
  faceRegisteredAt?: Date;
  faceAuthEnabled: boolean;
  isActive: boolean;
}

const studentSchema = new Schema<StudentDocument>(
  {
    registerNumber: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 180 },
    department: { type: String, required: true, trim: true, maxlength: 80 },
    year: { type: Number, required: true, min: 1, max: 8 },
    languagePreference: { type: String, required: true, default: "en", maxlength: 20 },
    faceEmbedding: {
      type: [Number],
      default: [],
      validate: {
        validator: (v: number[]) => Array.isArray(v) && v.length <= 2048,
        message: "faceEmbedding exceeds max allowed length",
      },
    },
    faceRegisteredAt: { type: Date },
    faceAuthEnabled: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);
studentSchema.index({ department: 1, year: 1 });

export const StudentModel = model<StudentDocument>("Student", studentSchema);
