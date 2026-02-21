# garnet

## Install

Use make to install the extensions:

```bash
make install
```

And then enable the extension:

```bash
gnome-extensions enable garnet@rtko.eu
```

Or do the equivalent through the Gnome extensions application.

## Development

Run the install command from above, and then develop in a windowed gnome session:

```bash
dbus-run-session -- gnome-shell --devkit
```

Potentially you'll need to install additional dependencies for this, see https://gjs.guide/extensions/development/creating.html#wayland-sessions.
