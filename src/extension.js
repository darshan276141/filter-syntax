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
exports.activate = activate;
exports.deactivate = deactivate;
// src/extension.ts
const vscode = __importStar(require("vscode"));
const feedback_logger_1 = require("./feedback_logger");
// Undo stack to restore changes
const undoStack = [];
// Get full document range
function getFullRange(doc) {
    return new vscode.Range(doc.lineAt(0).range.start, doc.lineAt(doc.lineCount - 1).range.end);
}
// Replace text in editor safely
async function replaceText(editor, range, text) {
    if (!editor || editor.document.isClosed) {
        vscode.window.showErrorMessage('Filter-Syn: editor is closed or not active.');
        return;
    }
    const success = await editor.edit(editBuilder => editBuilder.replace(range, text));
    if (!success)
        vscode.window.showErrorMessage('Filter-Syn: Failed to apply changes.');
}
// Save state for undo
function saveForUndo(range, text, aiSuggestion) {
    undoStack.push({ range, text, aiSuggestion });
}
// Remove selected unused code
async function removeSelectedUnusedCode(editor, selection) {
    const doc = editor.document;
    const fullText = doc.getText();
    let newText = fullText;
    const removeList = [];
    selection.unusedImports.forEach(name => removeList.push({ type: 'import', name }));
    selection.unusedFunctions.forEach(name => removeList.push({ type: 'function', name }));
    selection.unusedVariables.forEach(name => removeList.push({ type: 'variable', name }));
    selection.unusedClasses.forEach(name => removeList.push({ type: 'class', name }));
    if (removeList.length === 0) {
        vscode.window.showInformationMessage('No unused code selected, nothing to remove.');
        return;
    }
    removeList.forEach(item => {
        const regex = new RegExp(item.type === 'import'
            ? `^.*\\b${item.name}\\b.*$`
            : item.type === 'function'
                ? `function\\s+${item.name}\\s*\\([^)]*\\)\\s*{[\\s\\S]*?}`
                : item.type === 'variable'
                    ? `\\b(const|let|var)\\s+${item.name}\\b.*;?`
                    : item.type === 'class'
                        ? `class\\s+${item.name}\\s*{[\\s\\S]*?}`
                        : '', 'gm');
        newText = newText.replace(regex, '');
    });
    const range = getFullRange(doc);
    saveForUndo(range, fullText, selection);
    await replaceText(editor, range, newText);
    vscode.window.showInformationMessage('Filter-Syn: selected unused code removed.');
}
// Get active editor safely
async function getActiveEditor() {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        const docs = vscode.workspace.textDocuments.filter(d => !d.isUntitled);
        if (docs.length > 0) {
            editor = await vscode.window.showTextDocument(docs[0], { preview: false });
        }
    }
    return editor;
}
// Activate extension
function activate(context) {
    console.log('Filter-Syn extension active');
    // --- Remove Unused Code Command ---
    // src/extension.ts
    // ... (keep all your imports)
    // ... (inside the activate function)
    // COMPLETELY REPLACE your old command with this test code
    context.subscriptions.push(vscode.commands.registerCommand('filter-syn.removeUnusedCode', async () => {
        console.log("--- TEST: removeUnusedCode command was triggered ---");
        vscode.window.showInformationMessage("TEST: The command is running!");
    }));
    // --- Undo Command ---
    context.subscriptions.push(vscode.commands.registerCommand('filter-syn.undoLastFilter', async () => {
        const editor = await getActiveEditor();
        if (!editor || undoStack.length === 0)
            return vscode.window.showInformationMessage('Nothing to undo.');
        const last = undoStack.pop();
        await replaceText(editor, last.range, last.text);
        if (last.aiSuggestion) {
            (0, feedback_logger_1.logFeedback)({
                timestamp: new Date().toISOString(),
                file: editor.document.fileName,
                ai_suggestion: last.aiSuggestion,
                user_override: true,
            });
        }
        vscode.window.showInformationMessage('Filter-Syn: undo complete.');
    }));
}
// Deactivate
function deactivate() { }
//# sourceMappingURL=extension.js.map