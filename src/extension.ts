import * as vscode from 'vscode';
import fetch from 'node-fetch';

/** Apply filters based on user + AI */
function applyFilters(text: string, options?: string[]): string {
    const config = vscode.workspace.getConfiguration("filter-syn");
    const removeNumbers = options?.includes('Remove Numbers') ?? config.get("filter-syn.removeNumbers");
    const removePunctuation = options?.includes('Remove Punctuation') ?? config.get("filter-syn.removePunctuation");
    const toLowercase = options?.includes('Convert to Lowercase') ?? config.get("filter-syn.toLowercase");

    if (removeNumbers) text = text.replace(/[0-9]/g, '');
    if (removePunctuation) text = text.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
    if (toLowercase) text = text.toLowerCase();
    return text;
}

/** Call AI backend for suggestion */
async function getAISuggestion(text: string, fileType: string): Promise<{removeNumbers: boolean, removePunctuation: boolean, toLowercase: boolean}> {
    // Compute features
    const lines = text.split('\n');
    const lineCount = lines.length;
    const keywordCount = text.split(/\s+/).length;
    const commentLines = lines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('#') || l.trim().startsWith('/*'));
    const commentRatio = commentLines.length / Math.max(lineCount, 1);
    const unusedImports = 0; // placeholder

    try {
        const response = await fetch('http://127.0.0.1:5001/predict', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ keyword_count: keywordCount, line_count: lineCount, comment_ratio: commentRatio, unused_imports: unusedImports, file_type: fileType })
        });
        const data = await response.json();
        return {
            removeNumbers: data.removeNumbers === 1,
            removePunctuation: data.removePunctuation === 1,
            toLowercase: data.toLowercase === 1
        };
    } catch (err) {
        console.error('AI suggestion error:', err);
        return {removeNumbers: false, removePunctuation: false, toLowercase: false};
    }
}

/** Replace text in editor */
async function replaceText(editor: vscode.TextEditor, range: vscode.Range, text: string) {
    const success = await editor.edit(editBuilder => editBuilder.replace(range, text));
    if (!success) vscode.window.showErrorMessage('Failed to apply changes.');
}

/** Get full document range */
function getFullRange(doc: vscode.TextDocument): vscode.Range {
    return new vscode.Range(doc.lineAt(0).range.start, doc.lineAt(doc.lineCount - 1).range.end);
}

/** Undo stack */
const undoStack: {range: vscode.Range, text: string}[] = [];
function saveForUndo(range: vscode.Range, text: string) { undoStack.push({range, text}); }

/** Get active editor */
function getActiveEditor(): vscode.TextEditor | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) vscode.window.showInformationMessage('No active editor.');
    return editor;
}

/** Activate extension */
export function activate(context: vscode.ExtensionContext) {
    console.log('Filter-Syn extension is active!');

    context.subscriptions.push(vscode.commands.registerCommand('filter-syn.aiFilterSuggestion', async () => {
        const editor = getActiveEditor(); if (!editor) return;
        const selection = editor.selection;
        const text = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);
        const range = selection.isEmpty ? getFullRange(editor.document) : selection;
        const fileType = editor.document.languageId;

        vscode.window.showInformationMessage('Fetching AI suggestion...');
        const aiResult = await getAISuggestion(text, fileType);

        // Merge AI suggestion with user config
        const config = vscode.workspace.getConfiguration("filter-syn");
        const options: string[] = [];
        if (aiResult.removeNumbers && config.get("filter-syn.removeNumbers")) options.push("Remove Numbers");
        if (aiResult.removePunctuation && config.get("filter-syn.removePunctuation")) options.push("Remove Punctuation");
        if (aiResult.toLowercase && config.get("filter-syn.toLowercase")) options.push("Convert to Lowercase");

        if (options.length > 0) {
            saveForUndo(range, text);
            const filtered = applyFilters(text, options);
            await replaceText(editor, range, filtered);
            vscode.window.showInformationMessage('AI suggested filter applied!');
        } else {
            vscode.window.showInformationMessage('AI did not suggest applying any filter.');
        }
    }));

    // Other commands (filterText, filterWholeFile, filterWithOptions, undoLastFilter, previewFilter)
    // remain unchanged
}

/** Deactivate */
export function deactivate() {}
