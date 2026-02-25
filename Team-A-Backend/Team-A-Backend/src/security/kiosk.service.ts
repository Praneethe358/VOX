import { BrowserWindow } from "electron";

export class KioskService {
  static lockWindow(win: BrowserWindow): void {
    win.setKiosk(true);
    win.setFullScreen(true);
    win.setMenuBarVisibility(false);
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  }

  static async checkProctoring(): Promise<boolean> {
    return true;
  }
}
