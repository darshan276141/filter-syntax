// src/languageHandler.ts
import { AnalysisResult } from '../codeAnalyzer';

export interface LanguageHandler {
    /** Analyzes code to find unused items. */
    analyze(filePath: string, content: string): Promise<AnalysisResult>;

    /** Removes the specified unused items from the code. */
    remove(filePath: string, content: string, itemsToRemove: AnalysisResult): Promise<string>;
}