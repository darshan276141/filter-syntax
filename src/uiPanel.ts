// src/uiPanel.ts
import * as vscode from 'vscode';
import { AIUnusedCodeResult } from './aiUnusedCode';

const ICONS: Record<keyof Omit<AIUnusedCodeResult, 'language'>, string> = {
    unusedImports: '📦',
    unusedFunctions: '🔧',
    unusedVariables: '📝',
    unusedClasses: '🏛️',
};

// FIX 1: Change the function's return type to allow for null
export function showAnalysisPanel(
    context: vscode.ExtensionContext,
    result: AIUnusedCodeResult
): Promise<AIUnusedCodeResult | null> {
    return new Promise((resolve) => {
        const panel = vscode.window.createWebviewPanel(
            'filterSynUnusedCode',
            'Filter-Syn: Unused Code Analysis',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        // FIX 2: Add a flag to prevent resolving the promise twice
        let resolved = false;

        // Generate HTML content (updated script)
        panel.webview.html = getWebviewContent(result);

        panel.webview.onDidReceiveMessage(
            (msg) => {
                if (msg.command === 'applyChanges') {
                    resolved = true;
                    const selections: AIUnusedCodeResult = {
                        unusedImports: msg.selections.unusedImports || [],
                        unusedFunctions: msg.selections.unusedFunctions || [],
                        unusedVariables: msg.selections.unusedVariables || [],
                        unusedClasses: msg.selections.unusedClasses || [],
                        language: result.language,
                    };
                    resolve(selections);
                    panel.dispose();
                }
            },
            undefined,
            context.subscriptions
        );

        panel.onDidDispose(
            () => {
                // FIX 3: If the panel is closed without applying, resolve with null
                if (!resolved) {
                    resolve(null);
                }
            },
            null,
            context.subscriptions
        );
    });
}

function getWebviewContent(result: AIUnusedCodeResult): string {
    const types: (keyof Omit<AIUnusedCodeResult, 'language'>)[] = [
        'unusedImports', 'unusedFunctions', 'unusedVariables', 'unusedClasses'
    ];
    
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Filter-Syn Analysis</title>
        <style>
            body { font-family: sans-serif; padding: 10px; }
            h2 { margin-top: 1em; }
            ul { list-style: none; padding: 0; }
            li { margin: 5px 0; }
            input[type="checkbox"] { margin-right: 8px; }
            button { margin-top: 15px; padding: 8px 15px; background-color: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background-color: #005a9e; }
        </style>
    </head>
    <body>
        <h1>Filter-Syn: Select Unused Items to Remove</h1>
        <p>Language detected: ${result.language}</p>`;

    types.forEach((type) => {
        const items = result[type] as string[];
        if (items.length > 0) {
            html += `<h2>${ICONS[type]} ${type.replace('unused', '')}</h2><ul>`;
            items.forEach((item: string) => {
                html += `<li><input type="checkbox" id="${type}_${item}" checked><label for="${type}_${item}">${item}</label></li>`;
            });
            html += `</ul>`;
        }
    });

    html += `<button id="apply-button">Apply Selected</button>
        <script>
            // FIX 4: The webview script is updated for clarity and correctness
            const vscode = acquireVsCodeApi();
            document.getElementById('apply-button').addEventListener('click', () => {
                const selections = {};
                const types = ['unusedImports', 'unusedFunctions', 'unusedVariables', 'unusedClasses'];
                types.forEach(type => {
                    selections[type] = Array.from(document.querySelectorAll(\`input[id^="\${type}_"]\`))
                        .filter(i => i.checked)
                        .map(i => i.id.replace(type + '_', ''));
                });
                vscode.postMessage({ command: 'applyChanges', selections });
            });
        </script>
    </body>
    </html>`;

    return html;
}