// extension.ts
import * as vscode from 'vscode';
import fetch from 'node-fetch';
import AbortControllerPkg from 'abort-controller';

const AbortController = (AbortControllerPkg as any).default || AbortControllerPkg;

type AIResult = {
    removeNumbers: boolean;
    removePunctuation: boolean;
    toLowercase: boolean;
    confidences?: Record<string, number>;
    model_version?: string;
};

const LANG_COMMENTS: Record<string, { line: string[]; blockStart?: string; blockEnd?: string }> = {
    py: { line: ['#'] },
    python: { line: ['#'] },
    js: { line: ['//'], blockStart: '/*', blockEnd: '*/' },
    javascript: { line: ['//'], blockStart: '/*', blockEnd: '*/' },
    ts: { line: ['//'], blockStart: '/*', blockEnd: '*/' },
    typescript: { line: ['//'], blockStart: '/*', blockEnd: '*/' },
    html: { line: [], blockStart: '<!--', blockEnd: '-->' },
    css: { line: [], blockStart: '/*', blockEnd: '*/' },
    json: { line: [] },
    md: { line: [] },
};

function getConfig<T = any>(key: string, def?: T): T {
    return vscode.workspace.getConfiguration('filter-syn').get<T>(key, def as T);
}

/** Rough feature extractor */
function extractFeatures(text: string, languageId: string) {
    const lines = text.split(/\r?\n/);
    const lineCount = Math.max(1, lines.length);
    const tokens = text.match(/\b[\w$]+\b/g) ?? [];
    const keywordCount = tokens.length;

    const cm = LANG_COMMENTS[languageId] || LANG_COMMENTS[languageId?.split('-')[0]] || { line: [] };
    let commentLines = 0;
    let inBlock = false;

    for (const raw of lines) {
        const l = raw.trim();
        if (cm.blockStart && cm.blockEnd) {
            if (l.includes(cm.blockStart)) inBlock = true;
            if (inBlock) commentLines++;
            if (l.includes(cm.blockEnd)) inBlock = false;
        }
        if (cm.line?.some(sym => l.startsWith(sym))) commentLines++;
    }
    const commentRatio = Math.min(1, commentLines / lineCount);

    // Very rough unused import heuristic
    let unusedImports = 0;
    try {
        if (['py', 'python'].includes(languageId)) {
            const importNames = (text.match(/^\s*(?:from\s+([\w.]+)\s+import\s+([\w*,\s]+)|import\s+([\w.]+))/gm) || [])
                .map(s => s.replace(/\s+/g, ' '));
            let used = 0;
            for (const imp of importNames) {
                const names = imp.includes(' import ')
                    ? imp.split(' import ')[1].split(',').map(s => s.trim().split(' as ')[0])
                    : [imp.replace(/^\s*import\s+/, '').trim().split(' as ')[0]];
                for (const n of names) {
                    if (!n || n === '*') continue;
                    const re = new RegExp(`\\b${n}\\b`);
                    if (re.test(text)) used++;
                }
            }
            unusedImports = Math.max(0, importNames.length - used);
        } else if (['js', 'javascript', 'ts', 'typescript'].includes(languageId)) {
            const imports = text.match(/^\s*import\s+.*?from\s+['"][^'"]+['"];?/gm) || [];
            let used = 0;
            for (const imp of imports) {
                const names = (imp.match(/\{([^}]+)\}/)?.[1] || '')
                    .split(',')
                    .map(s => s.trim().split(' as ')[0])
                    .filter(Boolean);
                for (const n of names) {
                    const re = new RegExp(`\\b${n}\\b`);
                    if (re.test(text)) used++;
                }
            }
            unusedImports = Math.max(0, imports.length - used);
        }
    } catch {
        unusedImports = 0;
    }

    // Normalize VS Code languageId to our model’s expected file_type
    let file_type = languageId;
    if (languageId === 'python') file_type = 'py';
    if (languageId === 'javascript') file_type = 'js';
    if (languageId === 'typescript') file_type = 'ts';

    return { keyword_count: keywordCount, line_count: lineCount, comment_ratio: commentRatio, unused_imports: unusedImports, file_type };
}

/** Debounce wrapper (per-document) */
const pendingTimers = new Map<string, NodeJS.Timeout>();
function debounce<T extends (...args: any[]) => void>(key: string, fn: T, wait = 300) {
    return (...args: Parameters<T>) => {
        if (pendingTimers.has(key)) clearTimeout(pendingTimers.get(key)!);
        const t = setTimeout(() => fn(...args), wait);
        pendingTimers.set(key, t);
    };
}

/** Apply filters */
function applyFilters(text: string, opts: { removeNumbers?: boolean; removePunctuation?: boolean; toLowercase?: boolean }) {
    if (opts.removeNumbers) text = text.replace(/[0-9]/g, '');
    if (opts.removePunctuation) text = text.replace(/[.,/#!$%^&*;:{}=\-_`~()[\]<>]/g, '');
    if (opts.toLowercase) text = text.toLowerCase();
    return text;
}

/** Call AI backend */
async function getAISuggestion(payload: any, minConfidence: number): Promise<AIResult | null> {
    const url = getConfig<string>('aiServerUrl', 'http://127.0.0.1:5001/v1/predict');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getConfig<number>('aiRequestTimeoutMs', 3000));
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instance: payload, min_confidence: minConfidence }),
            signal: controller.signal as any,
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as AIResult;
        return data;
    } catch (e) {
        clearTimeout(timeout);
        console.error('[Filter-Syn AI] request failed:', e);
        return null;
    }
}

/** Replace text in editor */
async function replaceText(editor: vscode.TextEditor, range: vscode.Range, text: string) {
    const success = await editor.edit(editBuilder => editBuilder.replace(range, text));
    if (!success) vscode.window.showErrorMessage('Filter-Syn: Failed to apply changes.');
}

/** Helpers */
function getFullRange(doc: vscode.TextDocument) {
    return new vscode.Range(doc.lineAt(0).range.start, doc.lineAt(Math.max(0, doc.lineCount - 1)).range.end);
}
const undoStack: { range: vscode.Range; text: string }[] = [];
function saveForUndo(range: vscode.Range, text: string) { undoStack.push({ range, text }); }

/** Activate */
export function activate(context: vscode.ExtensionContext) {
    console.log('Filter-Syn extension active');

    context.subscriptions.push(vscode.commands.registerCommand('filter-syn.aiFilterSuggestion', async () => {
        if (!getConfig<boolean>('enableAI', true)) {
            vscode.window.showInformationMessage('Filter-Syn AI is disabled in settings.');
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) return vscode.window.showInformationMessage('No active editor.');
        const selection = editor.selection;
        const text = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);
        const range = selection.isEmpty ? getFullRange(editor.document) : selection;

        const features = extractFeatures(text, editor.document.languageId);
        const minConf = getConfig<number>('aiMinConfidence', 0.6);

        vscode.window.setStatusBarMessage('Filter-Syn: fetching AI suggestion…', 1500);
        const ai = await getAISuggestion(features, minConf);

        if (!ai) {
            vscode.window.showWarningMessage('Filter-Syn AI: no suggestion (request failed).');
            return;
        }

        // Merge with user settings: AI can only enable what user permits
        const cfg = vscode.workspace.getConfiguration('filter-syn');
        const allowed = {
            removeNumbers: cfg.get<boolean>('removeNumbers', true),
            removePunctuation: cfg.get<boolean>('removePunctuation', false),
            toLowercase: cfg.get<boolean>('toLowercase', false),
        };

        const finalOpts = {
            removeNumbers: ai.removeNumbers && allowed.removeNumbers,
            removePunctuation: ai.removePunctuation && allowed.removePunctuation,
            toLowercase: ai.toLowercase && allowed.toLowercase,
        };

        if (!finalOpts.removeNumbers && !finalOpts.removePunctuation && !finalOpts.toLowercase) {
            vscode.window.showInformationMessage('Filter-Syn AI: no filters suggested above confidence threshold.');
            return;
        }

        saveForUndo(range, text);
        const filtered = applyFilters(text, finalOpts);
        await replaceText(editor, range, filtered);

        const confs = ai.confidences ? ` (conf: num=${ai.confidences.removeNumbers}, punct=${ai.confidences.removePunctuation}, lower=${ai.confidences.toLowercase})` : '';
        vscode.window.showInformationMessage(`Filter-Syn AI applied.${confs}`);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('filter-syn.undoLastFilter', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || undoStack.length === 0) return vscode.window.showInformationMessage('Nothing to undo.');
        const last = undoStack.pop()!;
        await replaceText(editor, last.range, last.text);
        vscode.window.showInformationMessage('Filter-Syn: undo complete.');
    }));
}

export function deactivate() {}
