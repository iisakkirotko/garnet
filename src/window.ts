import Meta from "gi://Meta";
import type Mtk from "@girs/mtk-17";
import type GObject from "gi://GObject";

import type Garnet from "./extension.js";
import { LayoutType, type Layout } from "./layout.js";
import { DenseStore } from "./storage.js";
import { wm } from "resource:///org/gnome/shell/ui/main.js";

export class WindowManager {
  private ext: Garnet;

  public workspaces: DenseStore<IWorkspace> = new DenseStore();

  constructor(extension: Garnet) {
    this.ext = extension;
  }

  public enable() {
    const workspaceManager = global.get_workspace_manager();
    const nWorkspaces = workspaceManager.n_workspaces;
    console.log(`Enabling WindowManager with ${nWorkspaces} workspaces`);

    for (let i = 0; i <= nWorkspaces - 1; i++) {
      this.addWorkspace(i, workspaceManager);
    }

    this.connectWorkspaceListeners();
  }

  public disable() {
    for (const ws of this.workspaces) {
      ws.close();
    }
  }

  public getLayout(id: LayoutType) {
    return this.ext.layouts.get(id);
  }

  public addWorkspace(
    i: number,
    workspaceManager?: Meta.WorkspaceManager,
  ): Workspace | undefined {
    if (!workspaceManager) {
      workspaceManager = global.get_workspace_manager();
    }
    console.log(`Initializing workspace ${i}`);
    const metaWs = workspaceManager.get_workspace_by_index(i);
    if (metaWs === null) {
      console.warn(`Gnome workspace nr ${i} is null. Skipping.`);
      return;
    }
    const ws = new Workspace(this.ext, metaWs);
    this.workspaces.push(ws);
    return ws;
  }

  public getWorkspace(id: number): IWorkspace | undefined {
    if (this.workspaces.length === 0) {
      console.warn(`Tried to get a workspace when none are registered.`);
      return;
    }
    const workspace = this.workspaces.at(id);
    if (workspace === undefined) {
      throw new Error(
        `Tried to get invalid workspace ${id} from ${this.workspaces.length} total.`,
      );
    }
    if (workspace === null) {
      throw new Error(`Tried to get closed workspace ${id}.`);
    }
    return workspace;
  }

  public getWorkspaceByObj(obj: Meta.Workspace) {
    return this.workspaces.find((ws) => ws.is(obj));
  }

  public getCurrentWorkspace() {
    const activeWorkspace = global.workspace_manager.get_active_workspace();
    console.log(
      `[GARNET] - Active workspace should be nr ${activeWorkspace.index()}`,
    );
    const res = this.workspaces.find((ws) => ws.active);
    console.log(`Found active workspace to be ${res}`);
    return res;
  }

  public connectWorkspaceListeners() {
    global.workspace_manager.connect("workspace-added", (source, idx) =>
      this.bindWorkspace(source, idx),
    );
    global.workspace_manager.connect("workspace-removed", (source, idx) => {
      this.removeWorkspace(source, idx);
    });
    global.display.connect("window-created", (source, arg0) =>
      this.bindWindow(source, arg0),
    );
  }

  public bindWindow(source: Meta.Display, win: Meta.Window) {
    console.log(`Created window ${win.get_title()}!`);
  }

  public bindWorkspace(source: Meta.WorkspaceManager, idx: number) {
    this.addWorkspace(idx, source);
  }

  public removeWorkspace(source: Meta.WorkspaceManager, idx: number) {
    const metaWs = source.get_workspace_by_index(idx);
    if (metaWs === null) {
      console.warn(
        `Trying to remove Workspace with (global) index ${idx}, but it couldn't be found.`,
      );
      return;
    }
    const ws = this.getWorkspaceByObj(metaWs);
    if (ws === undefined) {
      console.warn(
        `Trying to remove Workspace with global index ${idx}, but the matching internal workspace couldn't be found.`,
      );
      return;
    }
    ws.close();
    this.workspaces.remove(ws);
  }
}

export interface IWindow {
  readonly active: boolean;
  readonly position: [number, number];
  readonly height: number;
  readonly width: number;
  readonly window: Meta.Window;
  readonly handlers: number[];

  move: (x: number, y: number) => void;
  resize: (width: number, height: number) => void;
  moveResize: (x: number, y: number, width: number, height: number) => void;

  activate: () => void;
  close: () => void;
  getRect: () => Mtk.Rectangle;

  is: (window: Meta.Window) => boolean;
  registerHandler<K extends keyof Meta.Window.SignalSignatures>(
    event: K,
    cb: GObject.SignalCallback<Meta.Window, Meta.Window.SignalSignatures[K]>,
  ): void;
}

class Window implements IWindow {
  private ext: Garnet;
  private _window: Meta.Window;
  private _position: [number, number];
  private _width: number;
  private _height: number;
  private _handlers: number[] = [];

  constructor(ext: Garnet, window: Meta.Window) {
    this.ext = ext;
    this._window = window;

    const rect = this.getRect();
    this._position = [rect.x, rect.y];
    this._height = rect.height;
    this._width = rect.width;

    this.connectListeners();
  }

  public activate() {
    this._window.focus(global.get_current_time());
  }

  public close() {
    this.handlers.map((handler) => {
      this._window.disconnect(handler);
    });
  }

  public getRect() {
    return this._window.get_frame_rect();
  }

  public is(window: Meta.Window): boolean {
    return this._window === window;
  }

  public registerHandler<K extends keyof Meta.Window.SignalSignatures>(
    event: K,
    cb: GObject.SignalCallback<Meta.Window, Meta.Window.SignalSignatures[K]>,
  ): void {
    const handler = this._window.connect<K>(event, cb);
    this._handlers.push(handler);
  }

  public move(x: number, y: number) {
    if (!this._window.allows_move) {
      console.error(
        `Attempted to move a window ${this._window.get_id()} that doesn't allow the operation.`,
      );
      return;
    }
    this._window.move_frame(true, x, y);
  }

  public resize(width: number, height: number) {
    if (!this._window.allows_resize) {
      console.error(
        `Attempted to resize a window ${this._window.get_id()} that doesn't allow the operation.`,
      );
      return;
    }
    const [x, y] = this._position;
    this._window.move_resize_frame(true, x, y, width, height);
  }

  public moveResize(x: number, y: number, width: number, height: number) {
    if (
      !this._window.isAlive ||
      !this._window.allows_move ||
      !this._window.allows_resize
    ) {
      console.error(
        `[GARNET] - Attempted to move & resize a window that doesn't allow (at least) one of the operations.`,
      );
      return;
    }
    // Looks like `move_resize_frame` manages to resize (but not move!) some windows.
    // In my testing saw it with xTerm (so maybe X11 windows?)
    // Apparently this happens with gVim too:
    // https://github.com/gTile/gTile/issues/336#issuecomment-1803025082
    this._window.move_frame(true, x, y);
    this._window.move_resize_frame(true, x, y, width, height);
  }

  public get window() {
    return this._window;
  }

  public get active() {
    return this._window.has_focus();
  }

  public get position() {
    return this._position;
  }

  public get width() {
    return this._width;
  }

  public get height() {
    return this._height;
  }

  public get handlers() {
    return this._handlers;
  }

  private connectListeners() {}
}

export interface IWorkspace {
  windows: IWindow[];

  readonly active: boolean;
  readonly activeWindow: IWindow | undefined;
  readonly layout: LayoutType;

  is: (obj: Meta.Workspace) => boolean;

  close: () => void;
  activate: () => void;
  changeLayout: (layout: LayoutType) => void;
  drawWindows: () => void;
  cycleWindowOrder: (direction?: 1 | -1) => void;
  cycleLayout: (direction?: 1 | -1) => void;

  addWindow: (window: Meta.Window) => void;
  getWindow: (idx: number) => IWindow | undefined;
}

export class Workspace implements IWorkspace {
  private ext: Garnet;
  private workspace: Meta.Workspace;
  private _layout: LayoutType;
  private handlers: number[] = [];

  public windows: IWindow[] = [];

  constructor(ext: Garnet, workspace: Meta.Workspace) {
    this.ext = ext;
    this.workspace = workspace;
    this._layout = this.ext.settings.defaultLayout;

    const windows = workspace.list_windows();
    console.log(`Creating workspace with ${windows.length} windows`);

    if (windows.length > 0) {
      for (let i = 0; i <= windows.length; i++) {
        console.log(`Creating window ${i}`);
        const win = windows.at(i);
        if (win === undefined) {
          console.error(
            `[GARNET] - Window ${i} of ${windows.length} is undefined. Skipping.`,
          );
          continue;
        }
        this.addWindow(win);
      }
    }
    this.connectListeners();
  }

  public close() {
    for (const win of this.windows) {
      win.close();
    }
    for (const idx of this.handlers) {
      this.workspace.disconnect(idx);
    }
  }

  public activate() {
    const win = this.activeWindow?.window;

    if (this.ext.settings.cursorFollowsFocus && win) {
      this.workspace.activate_with_focus(win, global.get_current_time());
    }
    this.workspace.activate(global.get_current_time());
  }

  public changeLayout(layout: LayoutType) {
    const layoutObj = this.ext.layouts.get(layout);
    console.log(`[GARNET] - Setting layout of workspace to ${layoutObj.name}`);
    this._layout = layout;
    this.drawWindows();
  }

  /**
   * @param direction Defines which way to cycle the windows, 1 cycles the current first window to the back, while -1 cycles the current last window to the front.
   */
  public cycleWindowOrder(direction: 1 | -1 = 1) {
    const windows = this.windows;

    if (direction === 1) {
      const firstWindow = windows.shift();
      if (!firstWindow) {
        console.warn(`Tried to cycle an empty window array. No-op.`);
        return;
      }
      this.windows = [...windows, firstWindow];
    } else if (direction === -1) {
      const lastWindow = windows.pop();
      if (!lastWindow) {
        console.warn(`Tried to cycle an empty window array. No-op.`);
        return;
      }
      this.windows = [lastWindow, ...windows];
    }
    this.drawWindows();
  }

  public cycleLayout(direction: 1 | -1 = 1) {
    const ws = this.ext.wm.getCurrentWorkspace();
    if (!ws) {
      console.warn("Could not get current workspace while cycling layout.");
      return;
    }
    const layoutOptions = Object.values(LayoutType).filter(
      (v) => typeof v === "number",
    );
    const numLayouts = layoutOptions.length;
    this._layout = (this._layout + direction + numLayouts) % numLayouts;
    ws.changeLayout(this._layout);
  }

  public drawWindows() {
    console.log(
      `[GARNET] - Drawing ${this.windows.length} windows on workspace`,
    );
    if (this.windows.length === 0) {
      return;
    }

    const layout = this.ext.layouts.get(this._layout);
    console.log(`[GARNET] - Drawing with layout ${layout.name}`);
    let maxWindows: number | undefined = undefined;
    if (
      layout.windows.every((win) => win.height !== null) &&
      layout.windows.every((win) => win.width !== null)
    ) {
      maxWindows = layout.windows.length;
    }

    let renderWindows = this.windows.slice(0, maxWindows);

    const [columnSize, rowSize] = this.getLayoutUnits(layout, renderWindows);

    console.log(
      `[GARNET] - Drawing windows with column size ${columnSize}px, and row size ${rowSize}px`,
    );

    // We iterate through the windows, starting at the top-left of the work area, proceeding to the right column by column
    const workArea = this.getScreenRect();
    let cursorPos: { x: number; y: number } = { x: workArea.x, y: workArea.y };

    let maxRows = layout.rows;
    if (maxRows === null) {
      // If both are null, layout is invalid.
      maxRows = Math.ceil(workArea.height - workArea.y);
    }

    for (let i = 0; i < renderWindows.length; i++) {
      const window = renderWindows.at(i)!;
      const colWidth = layout.windows.at(i)?.width || 1;
      let rowHeight = layout.windows.at(i)?.height || 1;

      if (i === renderWindows.length) {
        // For the last window, take up all remaining vertical workspaces
        rowHeight = maxRows - cursorPos.y;
      }

      const windowWidth = colWidth * columnSize;
      const windowHeight = rowHeight * rowSize;

      console.log(`[GARNET] - Drawing window ${i + 1}/${renderWindows.length}`);
      console.log(`     x: ${cursorPos.x}`);
      console.log(`     y: ${cursorPos.y}`);
      console.log(`     width: ${windowWidth}`);
      console.log(`     height: ${windowHeight}`);

      window.moveResize(cursorPos.x, cursorPos.y, windowWidth, windowHeight);

      cursorPos.y += windowHeight;
      if (cursorPos.y >= maxRows) {
        cursorPos.y = workArea.y;
        cursorPos.x += windowWidth;
      }
    }
  }

  public get active() {
    const active = this.workspace.active;
    console.log(
      `[GARNET] - Checking whether workspace nr ${this.workspace.index()} is active: ${active}`,
    );
    return active;
  }

  public get activeWindow() {
    return this.windows.find((win) => win.active);
  }

  public get layout() {
    return this._layout;
  }

  public addWindow(window: Meta.Window): void {
    this.windows.push(new Window(this.ext, window));
    this.drawWindows();
  }

  public removeWindow(window: IWindow): void {
    window.close();
    this.windows = this.windows.filter((win) => {
      return win === window;
    });
    this.drawWindows();
  }

  public getWindow(idx: number) {
    return this.windows.at(idx);
  }

  public getWindowByObj(window: Meta.Window): IWindow | undefined {
    return this.windows.find((win) => win.is(window));
  }

  private getScreenRect(): Mtk.Rectangle {
    const monitor = global.display.get_current_monitor();
    return this.workspace.get_work_area_for_monitor(monitor);
  }

  private getLayoutUnits(layout: Layout, windows: IWindow[]): [number, number] {
    const columns = layout.columns;
    const rows = layout.rows;
    const { width: screenWidth, height: screenHeight } = this.getScreenRect();

    if (columns && rows) {
      return [screenWidth / columns, screenHeight / rows];
    }
    const missing = columns === null ? "width" : "height";
    const counted = this.ext.layouts.calcFill(missing, layout, windows.length);

    if (columns === null && rows !== null) {
      return [screenWidth / counted, screenHeight / rows];
    } else if (columns !== null && rows === null) {
      return [screenWidth / columns, screenHeight / counted];
    }
    throw new Error(
      `Computing layout units finished with invalid state for layout ${this._layout} with ${windows.length} windows.`,
    );
  }

  public is(obj: Meta.Workspace) {
    return this.workspace === obj;
  }

  public connectListeners() {
    this.connectWindowAddListener();
    this.connectWindowRemoveListener();
  }

  private connectWindowAddListener() {
    const handler = this.workspace.connect("window-added", (source, arg0) => {
      console.log(`Adding window ${arg0.get_title()} to workspace.`);
      this.addWindow(arg0);
      this.drawWindows();
    });
    this.handlers.push(handler);
  }

  private connectWindowRemoveListener() {
    const handler = this.workspace.connect("window-removed", (source, arg0) => {
      const win = this.getWindowByObj(arg0);
      console.log(`Removing window ${arg0.get_title()} from workspace.`);
      if (win === undefined) {
        console.warn(
          `Trying to remove a window that is closing, but it couldn't be found in this workspace`,
        );
        return;
      }
      this.removeWindow(win);
      this.drawWindows();
    });
    this.handlers.push(handler);
  }
}
