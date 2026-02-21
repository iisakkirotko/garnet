import { wm } from "resource:///org/gnome/shell/ui/main.js";
import Meta from "gi://Meta";
import Shell from "gi://Shell";

import type Garnet from "./extension.js";

export class KeybindManager {
  private ext: Garnet;
  private handlers: Record<string, () => any> = {
    "layout-cycle-forward": () => {
      const ws = this.ext.wm.getCurrentWorkspace();
      console.log(
        `[GARNET] - Executing layout-cycle-forward on workspace nr ${this.ext.focus.currentWorkspace}`,
      );
      ws?.cycleLayout();
    },
    "layout-cycle-backward": () => {
      const ws = this.ext.wm.getCurrentWorkspace();
      console.log(
        `[GARNET] - Executing layout-cycle-backward on workspace nr ${this.ext.focus.currentWorkspace}`,
      );
      ws?.cycleLayout(-1);
    },

    "windows-cycle-forward": () => {
      const ws = this.ext.wm.getCurrentWorkspace();
      console.log(
        `[GARNET] - Executing windows-cycle-forward on workspace nr ${this.ext.focus.currentWorkspace}`,
      );
      ws?.cycleWindowOrder();
    },
    "windows-cycle-backward": () => {
      const ws = this.ext.wm.getCurrentWorkspace();
      console.log(
        `[GARNET] - Executing windows-cycle-backward on workspace nr ${this.ext.focus.currentWorkspace}`,
      );
      ws?.cycleWindowOrder(-1);
    },

    "focus-cycle-window-forward": () => {
      console.log("[GARNET] - Executing focus-cycle-window-forward");
      this.ext.focus.nextWindow();
    },
    "focus-cycle-window-backward": () => {
      console.log("[GARNET] - Executing focus-cycle-window-backward");
      this.ext.focus.prevWindow();
    },
    "focus-cycle-workspace-forward": () => {
      console.log("[GARNET] - Executing focus-cycle-workspace-forward");
      this.ext.focus.nextWorkspace();
    },
    "focus-cycle-workspace-backward": () => {
      console.log("[GARNET] - Executing focus-cycle-workspace-backward");
      this.ext.focus.prevWorkspace();
    },
  };

  constructor(ext: Garnet) {
    this.ext = ext;
  }

  public enable(bindOverrides?: Record<string, () => any>) {
    this.handlers = {
      ...this.handlers,
      ...bindOverrides,
    };

    console.log(
      `[GARNET] - Adding keybinds based on settings`,
      this.ext.settings.gio,
    );

    for (const bind of Object.keys(this.handlers)) {
      this.addKeybind(bind);
    }
  }

  public addKeybind(command: string) {
    console.log(`[GARNET] - adding keybind for ${command}`);
    const handler = this.handlers[command];
    if (!handler) {
      console.error(`Could not determine handler for command ${command}`);
      return;
    }

    wm.addKeybinding(
      command,
      this.ext.settings.gio,
      Meta.KeyBindingFlags.NONE,
      Shell.ActionMode.ALL,
      handler,
    );
  }

  public removeKeybind(command: string) {
    wm.removeKeybinding(command);
  }

  public disable() {
    for (const bind of Object.keys(this.handlers)) {
      this.removeKeybind(bind);
    }
  }
}
