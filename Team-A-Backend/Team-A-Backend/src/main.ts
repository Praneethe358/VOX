import { app, BrowserWindow } from "electron";
import path from "path";
import fs from "node:fs";
import { mongoService } from "./database/mongo-client";
import { registerIPCHandlers } from "./bridge/ipc-handlers";
import { seedDatabase } from "./database/seed";
import { startExpressServer, stopExpressServer } from "./server/server";

const EXPRESS_PORT = Number(process.env.PORT) || 3000;

async function loadFrontend(win: BrowserWindow): Promise<void> {
  const distIndexPath = path.resolve(
    __dirname,
    "../../mindkraft-frontend/dist/index.html",
  );
  const devUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  if (app.isPackaged) {
    await win.loadFile(distIndexPath);
    return;
  }

  try {
    await win.loadURL(devUrl);
  } catch {
    if (fs.existsSync(distIndexPath)) {
      await win.loadFile(distIndexPath);
    } else {
      throw new Error(
        `Frontend not found. Start Vite at ${devUrl} or build dist at ${distIndexPath}`,
      );
    }
  }
}

async function bootstrap(): Promise<void> {
  // 1. Database
  await mongoService.connect();
  await seedDatabase();

  // 2. Start Express HTTP server (for multi-machine / remote frontends)
  await startExpressServer();

  // 3. Electron window (local display)
  const win = new BrowserWindow({
    kiosk: true,
    fullscreen: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      // Pass the API base URL to the renderer via additional arguments
      additionalArguments: [`--api-url=http://localhost:${EXPRESS_PORT}`],
    },
  });

  // 4. Frontend
  await loadFrontend(win);

  // 5. IPC handlers (local Electron bridge — still active for same-machine use)
  registerIPCHandlers();

  console.log(
    `[Main] Hybrid mode active — IPC (local) + Express HTTP (http://localhost:${EXPRESS_PORT})`,
  );
}

app.whenReady().then(() => {
  bootstrap().catch((err) => {
    console.error("Bootstrap failed:", err);
    app.quit();
  });
});

app.on("window-all-closed", () => {
  stopExpressServer()
    .then(() => mongoService.disconnect())
    .finally(() => app.quit());
});
