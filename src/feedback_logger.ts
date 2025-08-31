import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';

const FEEDBACK_DIR = path.join(__dirname, '..', 'feedback');
const FEEDBACK_FILE = path.join(FEEDBACK_DIR, 'feedback_log.jsonl');

/**
 * Log feedback entry asynchronously.
 * Each entry is a single line JSON (JSONL format)
 */
export async function logFeedback(entry: Record<string, any>) {
    try {
        await fs.mkdir(FEEDBACK_DIR, { recursive: true });
        await fs.appendFile(FEEDBACK_FILE, JSON.stringify(entry) + '\n', 'utf-8');
    } catch (err) {
        console.error('[Filter-Syn Feedback] Failed to log:', err);
        vscode.window.showWarningMessage('Filter-Syn: Failed to log feedback.');
    }
}
