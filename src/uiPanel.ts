// src/uiPanel.ts
import * as vscode from 'vscode';
import { AIUnusedCodeResult } from './aiUnusedCode';

// Icons for each type
const ICONS: Record<keyof Omit<AIUnusedCodeResult, 'language'>, string> = {
    unusedImports: '📦',
    unusedFunctions: '🔧',
    unusedVariables: '📝',
    unusedClasses: '🏛️',
};

// Show analysis panel
export function showAnalysisPanel(
    context: vscode.ExtensionContext,
    result: AIUnusedCodeResult
): Promise<AIUnusedCodeResult> {
    return new Promise((resolve) => {
        const panel = vscode.window.createWebviewPanel(
            'filterSynUnusedCode',
            'Filter-Syn: Unused Code Analysis',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        // Generate HTML content
        let html = `<html>
        <head>
            <style>
                body { font-family: sans-serif; padding: 10px; }
                h2 { margin-top: 1em; }
                ul { list-style: none; padding: 0; }
                li { margin: 5px 0; }
                input[type="checkbox"] { margin-right: 8px; }
                button {
                    margin-top: 15px;
                    padding: 8px 15px;
                    background-color: #007acc;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                button:hover { background-color: #005a9e; }
            </style>
        </head>
        <body>
            <h1>Filter-Syn: Select Unused Items to Remove</h1>
            <p>Language detected: ${result.language}</p>`;

        const types: (keyof Omit<AIUnusedCodeResult, 'language'>)[] = [
            'unusedImports',
            'unusedFunctions',
            'unusedVariables',
            'unusedClasses',
        ];

        types.forEach((type) => {
            const items = result[type] as string[];
            if (items.length > 0) {
                html += `<h2>${ICONS[type]} ${type.replace('unused', '')}</h2><ul>`;
                items.forEach((item: string) => {
                    html += `<li>
                        <input type="checkbox" id="${type}_${item}" checked>
                        <label for="${type}_${item}">${item}</label>
                    </li>`;
                });
                html += `</ul>`;
            }
        });

        html += `<button onclick="applySelection()">Apply Selected</button>
            <script>
                const vscode = acquireVsCodeApi();
                function applySelection() {
                    const selections = {};
                    ${types
                        .map(
                            (type) => `
                        selections['${type}'] = Array.from(document.querySelectorAll('input[id^="${type}_"]'))
                            .filter(i => i.checked)
                            .map(i => i.id.replace('${type}_', ''));
                    `
                        )
                        .join('\n')}
                    vscode.postMessage({ command: 'apply', selections });
                }
            </script>
        </body>
        </html>`;

        panel.webview.html = html;

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            (msg) => {
                if (msg.command === 'apply') {
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

        // Fallback if user closes the panel
        panel.onDidDispose(
            () =>
                resolve({
                    unusedImports: result.unusedImports,
                    unusedFunctions: result.unusedFunctions,
                    unusedVariables: result.unusedVariables,
                    unusedClasses: result.unusedClasses,
                    language: result.language,
                }),
            null,
            context.subscriptions
        );
    });
}
