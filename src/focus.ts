import type Garnet from "./extension.js";
import type { IWindow } from "./window.js";

export class FocusManager {
  private ext: Garnet;
  private _currentWindow: number | null;
  private _currentWorkspace: number;

  constructor(extention: Garnet) {
    this.ext = extention;
    // TODO: Use actual values
    this._currentWorkspace = 0;
    this._currentWindow = 0;
  }

  public nextWindow() {
    this.incrementWindowIndex(1);
    this.selectWindow(this._currentWindow);
  }

  public prevWindow() {
    this.incrementWindowIndex(-1);
    this.selectWindow(this._currentWindow);
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

  /**
   * Switch focus to another window, without doing any other actions (such as moving cursor).
   * Mainly for if focus is changed from outside of Garnet, such as through user action.
   *
   * @param window The window object
   */
  public setSelectedWindow(window: IWindow) {
    const ws = this.ext.wm.getWorkspace(this.currentWorkspace);
    if (!ws) {
      console.error(`[GARNET] - Couldn't get current workspace`);
      return;
    }
    const winIdx = ws.getWindowIndex(window);
    if (winIdx === undefined) {
      console.error(
        `Could not find window ${window.window.get_title()} in active workspace ${this.currentWorkspace}`,
      );
      return;
    }
    this._currentWindow = winIdx;
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

    const workspaceWindows = ws.windows.length;
    if (workspaceWindows < 1) {
      this._currentWindow = null;
      return this._currentWindow;
    }
    const current = this._currentWindow === null ? 0 : this._currentWindow;
    this._currentWindow =
      (workspaceWindows + current + increment) % workspaceWindows;
    return this._currentWindow;
  }

  private incrementWorkspaceIndex(increment: 1 | -1 = 1) {
    const workspaces = this.ext.wm.workspaces.length;
    if (workspaces === 1) {
      this._currentWorkspace = 1;
      return this._currentWorkspace;
    }
    this._currentWorkspace =
      (workspaces + this._currentWorkspace + increment) % workspaces;
    return this._currentWorkspace;
  }

  public get currentWorkspace(): number {
    return this._currentWorkspace;
  }

  public get currentWindow(): number | null {
    return this._currentWindow;
  }
}
