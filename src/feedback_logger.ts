// src/feedback_logger.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Log feedback entry asynchronously.
 * Each entry is a single line JSON (JSONL format)
 * @param storagePath The dedicated, writeable storage URI for the extension.
 * @param entry The feedback object to log.
 */
export async function logFeedback(storagePath: vscode.Uri, entry: Record<string, any>) {
    // Use the safe storage path provided by VS Code
    const feedbackDir = storagePath.fsPath;
    const feedbackFile = path.join(feedbackDir, 'feedback_log.jsonl');

    try {
        await fs.mkdir(feedbackDir, { recursive: true });
        await fs.appendFile(feedbackFile, JSON.stringify(entry) + '\n', 'utf-8');
    } catch (err) {
        console.error('[Filter-Syn Feedback] Failed to log:', err);
        // Don't show a warning to the user for a background task.
    }
}