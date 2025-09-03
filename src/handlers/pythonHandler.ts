// src/handlers/pythonHandler.ts
import * as vscode from 'vscode'; // <-- Import vscode
import { spawn } from 'child_process';
import * as path from 'path';
import { LanguageHandler } from './languageHandler';
import { AnalysisResult } from '../codeAnalyzer';

export class PythonHandler implements LanguageHandler {
    private extensionPath: string;

    constructor(extensionPath: string) {
        this.extensionPath = extensionPath;
    }

    // FIX 1: Change parameter from a string to a vscode.Uri object
    async analyze(fileUri: vscode.Uri, content: string): Promise<AnalysisResult> {
        try {
            // FIX 2: Pass the safe .fsPath to the script
            const result = await this._runPythonScript(['analyze', fileUri.fsPath]);
            
            console.log("Raw output from Python script:", result); 

            return JSON.parse(result) as AnalysisResult;
        } catch (error) {
            console.error('Python analysis failed:', error);
            return { unusedItems: [] };
        }
    }

    // FIX 3: Change parameter from a string to a vscode.Uri object
    async remove(fileUri: vscode.Uri, content: string, itemsToRemove: AnalysisResult): Promise<string> {
        const unusedNames = itemsToRemove.unusedItems.map(item => item.name);
        try {
            // FIX 4: Pass the safe .fsPath to the script
            const newCode = await this._runPythonScript(['remove', fileUri.fsPath], JSON.stringify(unusedNames));
            return newCode;
        } catch (error) {
            console.error('Python removal failed:', error);
            return content;
        }
    }

    private _runPythonScript(args: string[], stdinData?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            // FIX 5: Get the Python path from VS Code settings, not a hardcoded string
            const config = vscode.workspace.getConfiguration('filter-syn');
            const pythonExecutable = config.get<string>('pythonPath') || 'python';

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