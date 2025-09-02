// src/handlers/pythonHandler.ts
import { spawn } from 'child_process';
import * as path from 'path'; // <-- FIX 1: Imports the 'path' module
import { LanguageHandler } from './languageHandler';
import { AnalysisResult } from '../codeAnalyzer';

export class PythonHandler implements LanguageHandler {
    // FIX 2: Defines the property to hold the extension's path
    private extensionPath: string;

    // FIX 3: Adds the constructor to accept the path from extension.ts
    constructor(extensionPath: string) {
        this.extensionPath = extensionPath;
    }

    async analyze(filePath: string, content: string): Promise<AnalysisResult> {
        try {
            const result = await this._runPythonScript(['analyze', filePath]);
            return JSON.parse(result) as AnalysisResult;
        } catch (error) {
            console.error('Python analysis failed:', error);
            return { unusedItems: [] };
        }
    }

    async remove(filePath: string, content: string, itemsToRemove: AnalysisResult): Promise<string> {
        const unusedNames = itemsToRemove.unusedItems.map(item => item.name);
        try {
            const newCode = await this._runPythonScript(['remove', filePath], JSON.stringify(unusedNames));
            return newCode;
        } catch (error) {
            console.error('Python removal failed:', error);
            return content;
        }
    }

    private _runPythonScript(args: string[], stdinData?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const pythonExecutable = '/home/priyadarshan/vscode-extensions/filter-syn/.venv/bin/python';
            
            // This line will now work correctly
            const scriptPath = path.join(this.extensionPath, 'scripts', 'python_analyzer.py');

            const pyProcess = spawn(pythonExecutable, [scriptPath, ...args]);

            let stdout = '';
            let stderr = '';

            pyProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pyProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pyProcess.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(new Error(`Python script exited with code ${code}: ${stderr}`));
                }
            });
            
            if (stdinData) {
                pyProcess.stdin.write(stdinData);
                pyProcess.stdin.end();
            }
        });
    }
}