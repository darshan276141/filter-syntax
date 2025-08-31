"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.showAnalysisPanel = showAnalysisPanel;
// src/uiPanel.ts
const vscode = __importStar(require("vscode"));
// Icons for each type
const ICONS = {
    unusedImports: '📦',
    unusedFunctions: '🔧',
    unusedVariables: '📝',
    unusedClasses: '🏛️',
};
// Show analysis panel
function showAnalysisPanel(context, result) {
    return new Promise((resolve) => {
        const panel = vscode.window.createWebviewPanel('filterSynUnusedCode', 'Filter-Syn: Unused Code Analysis', vscode.ViewColumn.One, { enableScripts: true });
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
        const types = [
            'unusedImports',
            'unusedFunctions',
            'unusedVariables',
            'unusedClasses',
        ];
        types.forEach((type) => {
            const items = result[type];
            if (items.length > 0) {
                html += `<h2>${ICONS[type]} ${type.replace('unused', '')}</h2><ul>`;
                items.forEach((item) => {
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
            .map((type) => `
                        selections['${type}'] = Array.from(document.querySelectorAll('input[id^="${type}_"]'))
                            .filter(i => i.checked)
                            .map(i => i.id.replace('${type}_', ''));
                    `)
            .join('\n')}
                    vscode.postMessage({ command: 'apply', selections });
                }
            </script>
        </body>
        </html>`;
        panel.webview.html = html;
        // Handle messages from the webview
        panel.webview.onDidReceiveMessage((msg) => {
            if (msg.command === 'apply') {
                const selections = {
                    unusedImports: msg.selections.unusedImports || [],
                    unusedFunctions: msg.selections.unusedFunctions || [],
                    unusedVariables: msg.selections.unusedVariables || [],
                    unusedClasses: msg.selections.unusedClasses || [],
                    language: result.language,
                };
                resolve(selections);
                panel.dispose();
            }
        }, undefined, context.subscriptions);
        // Fallback if user closes the panel
        panel.onDidDispose(() => resolve({
            unusedImports: result.unusedImports,
            unusedFunctions: result.unusedFunctions,
            unusedVariables: result.unusedVariables,
            unusedClasses: result.unusedClasses,
            language: result.language,
        }), null, context.subscriptions);
    });
}
//# sourceMappingURL=uiPanel.js.map