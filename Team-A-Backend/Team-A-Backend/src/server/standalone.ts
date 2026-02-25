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
import { mockMongoService } from "../database/mock-mongo";
import { seedDatabase } from "../database/seed";
import { startExpressServer } from "./server";

async function main(): Promise<void> {
  const useMockDb = process.env.USE_MOCK_DB === "true";
  
  if (useMockDb) {
    await mockMongoService.connect();
  } else {
    await mongoService.connect();
    await seedDatabase();
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
  await mongoService.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await mongoService.disconnect();
  process.exit(0);
});
