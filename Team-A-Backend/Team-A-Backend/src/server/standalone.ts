/**
 * standalone.ts
 * Runs ONLY the Express HTTP server without Electron.
 * Use this when you want to expose the API to multiple student machines
 * without launching a GUI window.
 *
 * Usage:
 *   npm run build
 *   node dist/server/standalone.js
 *
 * Or via npm:
 *   npm run server
 */

import "dotenv/config";
import { mongoService } from "../database/mongo-client";
import { seedDatabase } from "../database/seed";
import { startExpressServer } from "./server";
import { connectAtlas, disconnectAtlas } from "../voicesecure/core/db/mongoose";
import { initializeVoiceSecureDefaults } from "../voicesecure/init";
import { ttsService } from "../services/tts.service";
import { speechService } from "../services/speech.service";

async function main(): Promise<void> {
  // persistent database mode only
  await mongoService.connect();
  await connectAtlas();
  await initializeVoiceSecureDefaults();
  await seedDatabase();

  // check external binaries for speech/tts so problems surface early
  try {
    await ttsService.checkBinExists();
  } catch {
    // checkBinExists never throws, just logs, but guard anyway
  }
  try {
    await speechService.checkBins();
  } catch {
    // same as above
  }

  await startExpressServer();
  console.log("[Standalone] MindKraft Express server is running (no Electron)");
}

main().catch((err) => {
  console.error("[Standalone] Startup failed:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n[Standalone] Shutting down...");
  await disconnectAtlas();
  await mongoService.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectAtlas();
  await mongoService.disconnect();
  process.exit(0);
});
