import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { LayoutManager } from "./layout.js";
import { Settings } from "./settings.js";
import { WindowManager } from "./window.js";
import { KeybindManager } from "./keybinds.js";
import { FocusManager } from "./focus.js";

export default class Garnet extends Extension {
  settings: Settings = new Settings(this.getSettings());

  layouts: LayoutManager = new LayoutManager();
  wm: WindowManager = new WindowManager(this);
  focus: FocusManager = new FocusManager(this);
  keybinds: KeybindManager = new KeybindManager(this);

  override enable() {
    console.log("Enabling Garnet");
    this.keybinds.enable();
    this.wm.enable();
  }

  override disable() {
    console.log("Disabling Garnet");
    this.keybinds.disable();
    this.wm.disable();
  }
}
