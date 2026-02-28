import { Schema, model, Document } from "mongoose";

export type AdminRole = "super-admin" | "exam-admin";

export interface AdminDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  mfaEnabled: boolean;
}

const adminSchema = new Schema<AdminDocument>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 180 },
    passwordHash: { type: String, required: true, minlength: 40 },
    role: { type: String, enum: ["super-admin", "exam-admin"], required: true, default: "exam-admin" },
    mfaEnabled: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

export const AdminModel = model<AdminDocument>("Admin", adminSchema);
