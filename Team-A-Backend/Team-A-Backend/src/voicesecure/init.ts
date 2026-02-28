import bcrypt from "bcrypt";
import { AdminModel } from "./models/admin.model";
import { AIConfigurationModel } from "./models/ai-configuration.model";

export async function initializeVoiceSecureDefaults(): Promise<void> {
  const bootstrapEmail = (process.env.VOICESECURE_SUPERADMIN_EMAIL || "admin@voicesecure.edu").toLowerCase();
  const bootstrapPassword = process.env.VOICESECURE_SUPERADMIN_PASSWORD || "ChangeMe@123";

  const existing = await AdminModel.findOne({ email: bootstrapEmail });
  if (!existing) {
    const passwordHash = await bcrypt.hash(bootstrapPassword, 12);
    await AdminModel.create({
      name: "VoiceSecure Root Admin",
      email: bootstrapEmail,
      passwordHash,
      role: "super-admin",
      mfaEnabled: true,
    });
    console.log(`[VoiceSecure] Seeded super-admin: ${bootstrapEmail}`);
  }

  await AIConfigurationModel.findOneAndUpdate(
    { singletonKey: "global" },
    {
      $setOnInsert: {
        singletonKey: "global",
        sttEngine: "whisper",
        llmModel: "llama3.2",
        grammarCorrection: true,
        autoSaveInterval: 15,
        multilingualMode: true,
        ttsSpeed: 1,
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );
}
