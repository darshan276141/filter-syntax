// src/extension.ts
import * as vscode from 'vscode';
import { LanguageHandler } from './handlers/languageHandler';
import { TypeScriptHandler } from './handlers/typescriptHandler';
import { PythonHandler } from './handlers/pythonHandler';
import { AnalysisResult } from './codeAnalyzer';
import { AIUnusedCodeResult } from './aiUnusedCode';
import { showAnalysisPanel } from './uiPanel';
import { logFeedback } from './feedback_logger';

const undoStack: { range: vscode.Range; text: string; aiSuggestion?: any }[] = [];

function getFullRange(doc: vscode.TextDocument) {
    return new vscode.Range(doc.lineAt(0).range.start, doc.lineAt(doc.lineCount - 1).range.end);
}

async function replaceText(editor: vscode.TextEditor, range: vscode.Range, text: string) {
    if (!editor || editor.document.isClosed) {
        vscode.window.showErrorMessage('Filter-Syn: editor is closed or not active.');
        return;
    }
    const success = await editor.edit(editBuilder => editBuilder.replace(range, text));
    if (!success) vscode.window.showErrorMessage('Filter-Syn: Failed to apply changes.');
}

function saveForUndo(range: vscode.Range, text: string, aiSuggestion?: any) {
    undoStack.push({ range, text, aiSuggestion });
}

async function getActiveEditor(): Promise<vscode.TextEditor | undefined> {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        const docs = vscode.workspace.textDocuments.filter(d => !d.isUntitled);
        if (docs.length > 0) {
            editor = await vscode.window.showTextDocument(docs[0], { preview: false });
        }
    }
    return editor;
}

// The 'context' parameter is crucial here
export function activate(context: vscode.ExtensionContext) {
    console.log('Filter-Syn extension active');

    const languageHandlers = new Map<string, LanguageHandler>();
    languageHandlers.set('typescript', new TypeScriptHandler());
    languageHandlers.set('javascript', new TypeScriptHandler());

    // --- THE FIX ---
    // Pass the extension's absolute path to the PythonHandler's constructor
    languageHandlers.set('python', new PythonHandler(context.extensionPath));

    function getHandlerForLanguage(languageId: string): LanguageHandler | undefined {
        return languageHandlers.get(languageId);
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('filter-syn.removeUnusedCode', async () => {
            try {
                const initialEditor = await getActiveEditor();
                if (!initialEditor) {
                    return vscode.window.showInformationMessage('No open editor for analysis.');
                }
                const doc = initialEditor.document;
                const fullText = doc.getText();
                const handler = getHandlerForLanguage(doc.languageId);
                if (!handler) {
                    return vscode.window.showInformationMessage(`Filter-Syn does not support '${doc.languageId}' yet.`);
                }
                vscode.window.setStatusBarMessage(`Filter-Syn: Analyzing ${doc.languageId} code…`, 2000);
                const analysisResult = await handler.analyze(doc.fileName, fullText);
                if (analysisResult.unusedItems.length === 0) {
                    return vscode.window.showInformationMessage('No unused code detected.');
                }
                const aiResult: AIUnusedCodeResult = {
                    language: doc.languageId,
                    unusedImports: analysisResult.unusedItems.filter(i => i.type === 'import').map(i => i.name),
                    unusedFunctions: analysisResult.unusedItems.filter(i => i.type === 'function').map(i => i.name),
                    unusedVariables: analysisResult.unusedItems.filter(i => i.type === 'variable').map(i => i.name),
                    unusedClasses: analysisResult.unusedItems.filter(i => i.type === 'class').map(i => i.name),
                };
                const userSelection = await showAnalysisPanel(context, aiResult);
                const currentEditor = vscode.window.visibleTextEditors.find(e => e.document.uri === doc.uri);
                if (!currentEditor) {
                    return vscode.window.showWarningMessage('The document is no longer visible. Cannot apply changes.');
                }
                const itemsToRemove: AnalysisResult = {
                    unusedItems: analysisResult.unusedItems.filter(item => 
                        (userSelection.unusedImports.includes(item.name) && item.type === 'import') ||
                        (userSelection.unusedFunctions.includes(item.name) && item.type === 'function') ||
                        (userSelection.unusedVariables.includes(item.name) && item.type === 'variable') ||
                        (userSelection.unusedClasses.includes(item.name) && item.type === 'class')
                    )
                };
                const newText = await handler.remove(doc.fileName, fullText, itemsToRemove);
                const range = getFullRange(doc);
                saveForUndo(range, fullText, aiResult);
                await replaceText(currentEditor, range, newText); 
                await vscode.commands.executeCommand('editor.action.formatDocument');
                vscode.window.showInformationMessage('Filter-Syn: Unused code removed.');
            } catch (err) {
                console.error("FILTER-SYN COMMAND FAILED:", err);
                vscode.window.showErrorMessage("Filter-Syn failed. Check the Debug Console for details.");
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('filter-syn.undoLastFilter', async () => {
            const editor = await getActiveEditor();
            if (!editor || undoStack.length === 0) {
                return vscode.window.showInformationMessage('Nothing to undo.');
            }
            const last = undoStack.pop()!;
            await replaceText(editor, last.range, last.text);
            if (last.aiSuggestion) {
                logFeedback({
                    timestamp: new Date().toISOString(),
                    file: editor.document.fileName,
                    ai_suggestion: last.aiSuggestion,
                    user_override: true,
                });
            }
            vscode.window.showInformationMessage('Filter-Syn: undo complete.');
        })
    );
}

export function deactivate() { }