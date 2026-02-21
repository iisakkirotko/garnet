import type Garnet from "./extension.js";
import type { IWindow } from "./window.js";

export class FocusManager {
  private ext: Garnet;
  private currentWindow: number | null;
  private _currentWorkspace: number;

  constructor(extention: Garnet) {
    this.ext = extention;
    // TODO: Use actual values
    this._currentWorkspace = 0;
    this.currentWindow = 0;
  }

  public nextWindow() {
    this.incrementWindowIndex(1);
    this.selectWindow(this.currentWindow);
  }

  public prevWindow() {
    this.incrementWindowIndex(-1);
    this.selectWindow(this.currentWindow);
  }

  public selectWindow(idx: number | null) {
    if (idx === null) {
      return;
    }
    const ws = this.ext.wm.getWorkspace(this._currentWorkspace);
    if (!ws) {
      console.warn("[GARNET] - No workspace to select a window from.");
      return;
    }
    console.log(`[GARNET] - Cycling focus to window nr ${idx}`);
    const window = ws.getWindow(idx);
    if (!window) {
      console.error(
        `Tried to select a non-existent window ${idx} on workspace ${this._currentWorkspace}`,
      );
      return;
    }
    window.activate();
    this.moveCursor(window);
  }

  public nextWorkspace() {
    this.incrementWorkspaceIndex(1);
    console.log(
      `[GARNET] - Cycling focus forward to workspace nr ${this._currentWorkspace}`,
    );
    const ws = this.ext.wm.getWorkspace(this._currentWorkspace);
    if (!ws) {
      console.warn("[GARNET] - No workspace to select a window from.");
      return;
    }
    ws.activate();
    this.moveCursor(ws.activeWindow);
  }

  public prevWorkspace() {
    this.incrementWorkspaceIndex(-1);
    console.log(
      `[GARNET] - Cycling focus backward to workspace nr ${this._currentWorkspace}`,
    );
    const ws = this.ext.wm.getWorkspace(this._currentWorkspace);
    if (!ws) {
      console.warn("[GARNET] - No workspace to select a window from.");
      return;
    }
    ws.activate();
    this.moveCursor(ws.activeWindow);
  }

  private moveCursor(window: IWindow | undefined) {
    console.log(
      `[GARNET] - Preparing to move cursor with focus to ${window?.window.get_title()}`,
    );
    if (!window || !this.ext.settings.cursorFollowsFocus) {
      return;
    }

    const bounds = window.getRect();
    let x = bounds.x;
    let y = bounds.y;
    x += bounds.width / 2;
    y += bounds.height / 2;

    console.log(`[GARNET] - Will move focus to coordinates (x: ${x}, y: ${y})`);

    global.stage
      .get_context()
      .get_backend()
      .get_default_seat()
      .warp_pointer(x, y);
  }

  private incrementWindowIndex(increment: 1 | -1 = 1) {
    const ws = this.ext.wm.getWorkspace(this._currentWorkspace);
    if (!ws) {
      console.warn("[GARNET] - No workspace to select a window from.");
      return;
    }

    const workspaceWindows = ws.windows;
    if (workspaceWindows.length < 1) {
      this.currentWindow = null;
      return this.currentWindow;
    }
    const current = this.currentWindow || 1;
    this.currentWindow = (workspaceWindows.length % current) + increment;
    return this.currentWindow;
  }

  private incrementWorkspaceIndex(increment: 1 | -1 = 1) {
    const workspaces = this.ext.wm.workspaces;
    if (workspaces.length === 1) {
      this._currentWorkspace = 1;
      return this._currentWorkspace;
    }
    this._currentWorkspace =
      (workspaces.length % this._currentWorkspace) + increment;
    return this._currentWorkspace;
  }

  public get currentWorkspace(): number {
    return this._currentWorkspace;
  }
}
