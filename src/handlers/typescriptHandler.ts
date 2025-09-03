// src/handlers/typescriptHandler.ts
import * as vscode from 'vscode'; // <-- Import the vscode API
import { LanguageHandler } from './languageHandler';
import { analyzeFile, removeUnusedItems, AnalysisResult } from '../codeAnalyzer';

export class TypeScriptHandler implements LanguageHandler {
    // Change the parameter from a string to a vscode.Uri object
    async analyze(fileUri: vscode.Uri, content: string): Promise<AnalysisResult> {
        // When you call the next function, convert the Uri to a file path
        // safely using .fsPath
        return Promise.resolve(analyzeFile(fileUri.fsPath));
    }

    // Change the parameter from a string to a vscode.Uri object
    async remove(fileUri: vscode.Uri, content: string, itemsToRemove: AnalysisResult): Promise<string> {
        // Convert the Uri to a file path safely using .fsPath
        return Promise.resolve(removeUnusedItems(fileUri.fsPath, itemsToRemove));
    }
}