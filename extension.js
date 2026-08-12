const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const viewType = 'homeTab.editor';
const scheme = 'home-tab';
const homeUri = vscode.Uri.from({ scheme: scheme, path: '/Home Tab' });

const panels = new Set();

let extensionPath;
let busy = false;
let timer;

function activate(context)
{
    extensionPath = context.extensionPath;

    context.subscriptions.push(
        vscode.workspace.registerFileSystemProvider(scheme, new StubFileSystemProvider(), { isReadonly: true, isCaseSensitive: true }),
        vscode.window.registerCustomEditorProvider(viewType, new HomeEditorProvider(), { supportsMultipleEditorsPerDocument: false, webviewOptions: { retainContextWhenHidden: true } }),
        vscode.window.tabGroups.onDidChangeTabs(scheduleSync),
        vscode.window.tabGroups.onDidChangeTabGroups(scheduleSync),
        vscode.workspace.onDidChangeConfiguration(function (event)
        {
            if (event.affectsConfiguration('homeTab'))
            {
                renderAll();
                scheduleSync();
            }
        }),
        vscode.commands.registerCommand('homeTab.toggle', toggle)
    );

    scheduleSync();
}

function deactivate()
{
    if (timer)
    {
        clearTimeout(timer);
    }
}

function isEnabled()
{
    return vscode.workspace.getConfiguration('homeTab').get('enabled', true);
}

function getButtons()
{
    const raw = vscode.workspace.getConfiguration('homeTab').get('buttons', []);

    return raw.filter(function (item)
    {
        return item && typeof item.label === 'string' && typeof item.command === 'string';
    });
}

function toggle()
{
    const config = vscode.workspace.getConfiguration('homeTab');
    return config.update('enabled', !isEnabled(), vscode.ConfigurationTarget.Global);
}

function isPlaceholderTab(tab)
{
    return tab.input && tab.input.viewType === viewType;
}

function allTabs()
{
    const result = [];

    for (const group of vscode.window.tabGroups.all)
    {
        for (const tab of group.tabs)
        {
            result.push(tab);
        }
    }

    return result;
}

function realTabCount()
{
    return allTabs().filter(function (tab)
    {
        return !isPlaceholderTab(tab);
    }).length;
}

function placeholderTabs()
{
    return allTabs().filter(isPlaceholderTab);
}

function scheduleSync()
{
    if (timer)
    {
        clearTimeout(timer);
    }

    timer = setTimeout(function ()
    {
        timer = undefined;
        sync();
    }, 50);
}

async function sync()
{
    if (busy)
    {
        return;
    }

    busy = true;

    try
    {
        const existing = placeholderTabs();

        if (isEnabled() && realTabCount() === 0)
        {
            if (existing.length > 1)
            {
                await vscode.window.tabGroups.close(existing.slice(1), true);
            }
            else if (existing.length === 0)
            {
                await vscode.commands.executeCommand('vscode.openWith', homeUri, viewType, { preview: false, preserveFocus: true, viewColumn: vscode.ViewColumn.One });
            }
        }
        else if (existing.length > 0)
        {
            await vscode.window.tabGroups.close(existing, true);
        }
    }
    finally
    {
        busy = false;
    }
}

class StubFileSystemProvider
{
    constructor()
    {
        this.emitter = new vscode.EventEmitter();
        this.onDidChangeFile = this.emitter.event;
    }

    watch()
    {
        return new vscode.Disposable(function () { });
    }

    stat()
    {
        return { type: vscode.FileType.File, ctime: 0, mtime: 0, size: 0 };
    }

    readDirectory()
    {
        return [];
    }

    readFile()
    {
        return new Uint8Array();
    }

    createDirectory()
    {
    }

    writeFile()
    {
    }

    delete()
    {
    }

    rename()
    {
    }
}

class HomeEditorProvider
{
    openCustomDocument(uri)
    {
        return {
            uri: uri,
            dispose: function () { }
        };
    }

    resolveCustomEditor(document, panel)
    {
        panels.add(panel);

        panel.webview.options = { enableScripts: true };
        panel.webview.html = buildHtml(getButtons());

        panel.onDidDispose(function ()
        {
            panels.delete(panel);
            scheduleSync();
        });

        panel.webview.onDidReceiveMessage(function (message)
        {
            const buttons = getButtons();
            const index = message ? message.index : undefined;

            if (typeof index !== 'number' || index < 0 || index >= buttons.length)
            {
                return;
            }

            const button = buttons[index];
            const args = Array.isArray(button.args) ? button.args : [];
            vscode.commands.executeCommand.apply(vscode.commands, [button.command].concat(args));
        });
    }
}

function renderAll()
{
    const buttons = getButtons();

    for (const panel of panels)
    {
        panel.webview.html = buildHtml(buttons);
    }
}

function displayKey(button)
{
    const key = typeof button.key === 'string' ? button.key : '';
    return process.platform === 'darwin' ? key.replace(/ctrl/gi, 'cmd') : key;
}

function escapeHtml(value)
{
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function createNonce()
{
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let index = 0; index < 32; index++)
    {
        result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }

    return result;
}

function buildHtml(buttons)
{
    const nonce = createNonce();

    const rows = buttons.map(function (button, index)
    {
        const key = displayKey(button);
        const hint = key ? '<span class="key">' + escapeHtml(key) + '</span>' : '';
        return '<button class="action" data-index="' + index + '"><span>' + escapeHtml(button.label) + '</span>' + hint + '</button>';
    }).join('\n');

    const template = fs.readFileSync(path.join(extensionPath, 'media', 'home.html'), 'utf8');

    return template.split('{{NONCE}}').join(nonce).split('{{BUTTONS}}').join(rows);
}

module.exports = { activate, deactivate };
