import Gio from "gi://Gio";
import type { LayoutType } from "./layout.js";

const CURSOR_FOLLOW = "cursor-follows-focus";

export class Settings {
  public cursorFollowsFocus: boolean = true;
  public defaultLayout: LayoutType = 0;
  private _gio: Gio.Settings;

  constructor(gsettings: Gio.Settings) {
    this._gio = gsettings;
    this.cursorFollowsFocus = gsettings.get_boolean(CURSOR_FOLLOW);
  }

  public get gio() {
    return this._gio;
  }
}
