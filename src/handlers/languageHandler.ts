// src/handlers/languageHandler.ts
import * as vscode from 'vscode'; // <-- 1. Import vscode
import { AnalysisResult } from '../codeAnalyzer';

export interface LanguageHandler {
    // 2. Change 'filePath: string' to 'fileUri: vscode.Uri'
    analyze(fileUri: vscode.Uri, content: string): Promise<AnalysisResult>;

    // 3. Do the same for the 'remove' method
    remove(fileUri: vscode.Uri, content: string, itemsToRemove: AnalysisResult): Promise<string>;
}