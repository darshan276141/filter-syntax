// src/codeAnalyzer.ts

import * as fs from 'fs';
import * as ts from 'typescript';

export interface UnusedItem {
    name: string;
    type: 'import' | 'function' | 'variable' | 'class';
    line: number;
}

export interface AnalysisResult {
    unusedItems: UnusedItem[];
    filePath?: string;
}

/**
 * Analyze a TypeScript/JavaScript file to detect unused code.
 * This is the corrected version of the function.
 */
export function analyzeFile(filePath: string): AnalysisResult {
    if (!filePath || !fs.existsSync(filePath)) {
        return { unusedItems: [], filePath };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.trim()) return { unusedItems: [], filePath };

    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    const declaredItems: Map<string, UnusedItem> = new Map();
    const usedNames: Set<string> = new Set();

    function visit(node: ts.Node) {
        // --- Step 1: Find all declarations ---
        if (
            (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
            node.name
        ) {
            const type = ts.isFunctionDeclaration(node) ? 'function' : 'class';
            declaredItems.set(node.name.text, { name: node.name.text, type, line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line });
        } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
            declaredItems.set(node.name.text, { name: node.name.text, type: 'variable', line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line });
        } else if (ts.isImportSpecifier(node)) {
            declaredItems.set(node.name.text, { name: node.name.text, type: 'import', line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line });
        } else if (ts.isImportClause(node) && node.name) {
             // Handles default imports like `import fs from 'fs'`
            declaredItems.set(node.name.text, { name: node.name.text, type: 'import', line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line });
        }

        // --- Step 2: Find all USAGES of identifiers ---
        // A "usage" is an identifier that is NOT the name of a declaration.
        if (ts.isIdentifier(node)) {
            const isDeclaration = node.parent &&
                (ts.isFunctionDeclaration(node.parent) || ts.isClassDeclaration(node.parent) || ts.isVariableDeclaration(node.parent) || ts.isImportSpecifier(node.parent) || ts.isImportClause(node.parent)) &&
                (node.parent as any).name === node;

            if (!isDeclaration) {
                usedNames.add(node.text);
            }
        }
        
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    // --- Step 3: Find the difference ---
    const unusedItems: UnusedItem[] = [];
    declaredItems.forEach((item, name) => {
        if (!usedNames.has(name)) {
            unusedItems.push(item);
        }
    });

    return { unusedItems, filePath };
}


// The 'removeUnusedItems' function can remain the same
export function removeUnusedItems(filePath: string, analysis: AnalysisResult): string {
    if (!fs.existsSync(filePath) || !analysis.unusedItems.length) {
        return fs.readFileSync(filePath, 'utf-8');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    const linesToRemove = analysis.unusedItems
        .map(i => i.line)
        .sort((a, b) => b - a);

    const removedSet = new Set<number>();

    for (const lineIdx of linesToRemove) {
        if (!removedSet.has(lineIdx)) {
            // Add 1 to line number for 1-based indexing used by editors
            const editorLine = lineIdx;
            if (editorLine < lines.length) {
                lines[editorLine] = ''; 
                removedSet.add(lineIdx);
            }
        }
    }

    return lines.filter(line => line !== null).join('\n');
}