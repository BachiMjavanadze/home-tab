# Home Tab

VS Code hides the editor title bar when no file is open, so any icon on that bar disappears exactly when you might need it. Home Tab keeps one placeholder tab open so the bar never vanishes, and fills that tab with clickable buttons.

The placeholder opens when the last editor closes, and closes itself when any file opens.

## Settings

### homeTab.enabled

Turns the placeholder on or off. Default `true`. The same value is flipped by the command `Home Tab: Toggle`.

Closing the placeholder by hand does not remove it — it reopens immediately, because that is its whole job. Use this setting to actually get rid of it.

```json
{
    "homeTab.enabled": false
}
```

### homeTab.buttons

The buttons drawn on the placeholder page. Each entry needs `label` and `command`; `args` and `key` are optional.

- `label` — text on the button
- `command` — VS Code command id run on click
- `args` — arguments passed to that command
- `key` — grey hint text on the right of the button, display only

The default set mirrors the shortcuts VS Code normally prints on an empty editor:

```json
{
    "homeTab.buttons": [
        { "label": "Open Chat", "command": "workbench.action.chat.open", "key": "ctrl+alt+i" },
        { "label": "Show All Commands", "command": "workbench.action.showCommands", "key": "ctrl+shift+p" },
        { "label": "Toggle Terminal", "command": "workbench.action.terminal.toggleTerminal", "key": "ctrl+`" }
    ]
}
```

Replace it with anything you reach for often:

```json
{
    "homeTab.buttons": [
        { "label": "Open Folder", "command": "workbench.action.files.openFolder" },
        { "label": "Recent Projects", "command": "workbench.action.openRecent", "key": "ctrl+r" },
        { "label": "New File", "command": "workbench.action.files.newUntitledFile", "key": "ctrl+n" },
        { "label": "Clone Repository", "command": "git.clone" },
        { "label": "Extensions", "command": "workbench.view.extensions", "key": "ctrl+shift+x" },
        { "label": "Settings", "command": "workbench.action.openSettings", "key": "ctrl+," }
    ]
}
```

`args` lets one button carry a fixed payload, so you can open a specific file or run a specific task:

```json
{
    "homeTab.buttons": [
        { "label": "Open Notes", "command": "vscode.open", "args": ["file:///home/bachi/notes.md"] },
        { "label": "Build", "command": "workbench.action.tasks.runTask", "args": ["build"] },
        { "label": "Start Dev Server", "command": "workbench.action.terminal.sendSequence", "args": [{ "text": "npm run dev\n" }] }
    ]
}
```

Any command id from the command palette works, including ones contributed by other extensions. Open the palette, find the command, then take its id from Keyboard Shortcuts with `Copy Command ID`.

`key` is text only. VS Code exposes no API for reading the real binding of a command, so rebinding a shortcut does not update the hint — edit it here by hand.

## Limitation

The placeholder renders HTML, which makes it a webview rather than a text editor. Title bar icons whose `when` clause requires `editorTextFocus` therefore do not appear on it. Icons gated on the file resource, and icons from extensions using their own context keys, work normally.
