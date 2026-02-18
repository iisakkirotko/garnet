import Adw from "gi://Adw";

import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class GarnetPreferences extends ExtensionPreferences {
  /**
   * Fill the preferences window with preferences.
   *
   * If this method is overridden, `getPreferencesWidget()` will NOT be called.
   *
   * @param {Adw.PreferencesWindow} window - the preferences window
   */
  override async fillPreferencesWindow(window: Adw.PreferencesWindow) {
    // Create a preferences page, with a single group
    const page = new Adw.PreferencesPage({
      title: _("General"),
      icon_name: "dialog-information-symbolic",
    });
    window.add(page);

    const group = new Adw.PreferencesGroup({
      title: _("Keybinds"),
      description: _("Configure the controls"),
    });
    page.add(group);
  }
}
