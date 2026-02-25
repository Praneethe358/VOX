import http from "http";
import { createExpressApp } from "./express-app";

const PORT = Number(process.env.PORT) || 3000;

let httpServer: http.Server | null = null;

/**
 * Start the Express HTTP server.
 * Safe to call multiple times — returns existing server if already running.
 */
export function startExpressServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (httpServer) {
      resolve();
      return;
    }
    const app = createExpressApp();
    httpServer = http.createServer(app);
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`[Express] HTTP server listening on http://0.0.0.0:${PORT}`);
      resolve();
    });
    httpServer.on("error", (err) => reject(err));
  });
}

/**
 * Gracefully shut down the Express HTTP server.
 */
export function stopExpressServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!httpServer) {
      resolve();
      return;
    }
    httpServer.close(() => {
      console.log("[Express] HTTP server stopped");
      httpServer = null;
      resolve();
    });
  });
}
