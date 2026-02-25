/**
 * standalone-mock.ts
 * Runs the Express HTTP server with in-memory mock database (no MongoDB required)
 * Perfect for development and testing without MongoDB installation
 *
 * Usage:
 *   npm run build
 *   node dist/server/standalone-mock.js
 *
 * Or via npm:
 *   npm run server:mock
 */

import "dotenv/config";
import { mockMongoService } from "../database/mock-mongo";
import { startExpressServer } from "./server";

// Make mock service available globally
let globalMockService = mockMongoService;
export { globalMockService as mongoService };

async function main(): Promise<void> {
  await mockMongoService.connect();
  await startExpressServer();
  console.log("[Standalone-Mock] MindKraft Express server is running with mock database");
  console.log("[Standalone-Mock] Default admin credentials: username='admin', password='admin123'");
}

main().catch((err) => {
  console.error("[Standalone-Mock] Startup failed:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n[Standalone-Mock] Shutting down...");
  await mockMongoService.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await mockMongoService.disconnect();
  process.exit(0);
});
