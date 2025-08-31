// src/aiUnusedCode.ts
import path from 'path';

export interface AIUnusedCodeResult {
    language: string;
    unusedImports: string[];
    unusedFunctions: string[];
    unusedVariables: string[];
    unusedClasses: string[];
}

interface ServerPrediction {
    removeNumbers: boolean;
    removePunctuation: boolean;
    toLowercase: boolean;
    confidences: Record<string, number>;
    model_version: string;
}

const SERVER_URL = 'http://127.0.0.1:5001/v1/predict';

/**
 * Call FastAPI server to get AI-based suggestions for unused code.
 * For now, we mainly detect unused imports/functions/variables/classes
 */
export async function getUnusedCodeAI(
    code: string,
    fileName: string
): Promise<AIUnusedCodeResult> {
    // Dynamic import for node-fetch
    const fetch = (await import('node-fetch')).default;

    const ext = path.extname(fileName).toLowerCase();
    let result: AIUnusedCodeResult = {
        language: ext,
        unusedImports: [],
        unusedFunctions: [],
        unusedVariables: [],
        unusedClasses: [],
    };

    try {
        // Prepare features for AI model
        const keywordCount = (code.match(/\b\w+\b/g) || []).length;
        const lineCount = code.split('\n').length;
        const commentRatio =
            ((code.match(/(#|\/\/|\/\*|\*\/)/g) || []).length / Math.max(lineCount, 1)) || 0;

        const unusedImports = (code.match(/import\s+[\w{},*\s]+\s+from\s+['"][^'"]+['"]/g) || []).length;

        // Call FastAPI
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instance: {
                    file_type: ext.replace('.', ''),
                    keyword_count: keywordCount,
                    line_count: lineCount,
                    comment_ratio: parseFloat(commentRatio.toFixed(3)),
                    unused_imports: unusedImports,
                },
            }),
        });

        // Type assertion for response
        const data: ServerPrediction = await response.json() as ServerPrediction;

        // Use AI suggestions to detect unused code
        if (data.removeNumbers) {
            result.unusedVariables = code
                .match(/\b(const|let|var)\s+\w+\b/g)
                ?.map((v) => v.split(' ')[1]) || [];
        }
        if (data.removePunctuation) {
            result.unusedFunctions = code
                .match(/function\s+(\w+)\s*\(/g)
                ?.map((f) => f.replace(/function\s+/, '').replace('(', '')) || [];
        }
        if (data.toLowercase) {
            result.unusedClasses = code
                .match(/class\s+(\w+)/g)
                ?.map((c) => c.replace(/class\s+/, '')) || [];
        }

        // Treat all imports as removable if any unused imports detected
        result.unusedImports = (code.match(/import\s+[\w{},*\s]+\s+from\s+['"][^'"]+['"]/g) || []).map(
            (imp) => {
                const m = imp.match(/import\s+([\w{},*\s]+)\s+from/);
                if (m) return m[1].replace(/[{}*\s]/g, '');
                return '';
            }
        );
    } catch (err) {
        console.error('Filter-Syn AI server error:', err);
    }

    return result;
}
