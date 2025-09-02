// // src/codeAnalyzer.ts

// import * as fs from 'fs';
// import * as ts from 'typescript';

// export interface UnusedItem {
//     name: string;
//     type: 'import' | 'function' | 'variable' | 'class';
//     line: number;
// }

// export interface AnalysisResult {
//     unusedItems: UnusedItem[];
//     filePath?: string;
// }

// /**
//  * Analyze a TypeScript/JavaScript file to detect unused code.
//  * This function is correct and remains unchanged.
//  */
// export function analyzeFile(filePath: string): AnalysisResult {
//     if (!filePath || !fs.existsSync(filePath)) {
//         return { unusedItems: [], filePath };
//     }

//     const content = fs.readFileSync(filePath, 'utf-8');
//     if (!content.trim()) return { unusedItems: [], filePath };

//     const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

//     const declaredItems: Map<string, UnusedItem> = new Map();
//     const usedNames: Set<string> = new Set();

//     function visit(node: ts.Node) {
//         // Find all declarations
//         if (
//             (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
//             node.name
//         ) {
//             const type = ts.isFunctionDeclaration(node) ? 'function' : 'class';
//             declaredItems.set(node.name.text, { name: node.name.text, type, line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line });
//         } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
//             declaredItems.set(node.name.text, { name: node.name.text, type: 'variable', line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line });
//         } else if (ts.isImportSpecifier(node)) {
//             declaredItems.set(node.name.text, { name: node.name.text, type: 'import', line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line });
//         } else if (ts.isImportClause(node) && node.name) {
//              // Handles default imports like `import fs from 'fs'`
//             declaredItems.set(node.name.text, { name: node.name.text, type: 'import', line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line });
//         }

//         // Find all usages of identifiers
//         if (ts.isIdentifier(node)) {
//             const isDeclaration = node.parent &&
//                 (ts.isFunctionDeclaration(node.parent) || ts.isClassDeclaration(node.parent) || ts.isVariableDeclaration(node.parent) || ts.isImportSpecifier(node.parent) || ts.isImportClause(node.parent)) &&
//                 (node.parent as any).name === node;

//             if (!isDeclaration) {
//                 usedNames.add(node.text);
//             }
//         }
        
//         ts.forEachChild(node, visit);
//     }

//     visit(sourceFile);

//     // Find the difference
//     const unusedItems: UnusedItem[] = [];
//     declaredItems.forEach((item, name) => {
//         if (!usedNames.has(name)) {
//             unusedItems.push(item);
//         }
//     });

//     return { unusedItems, filePath };
// }


// /**
//  * REWRITTEN: Removes unused items by transforming the AST.
//  * This guarantees syntactically correct output.
//  */
// /**
//  * REWRITTEN and CORRECTED: Removes unused items by transforming the AST.
//  * This guarantees syntactically correct output and fixes the TypeScript error.
//  */
// export function removeUnusedItems(filePath: string, analysis: AnalysisResult): string {
//     if (!fs.existsSync(filePath) || !analysis.unusedItems.length) {
//         return fs.readFileSync(filePath, 'utf-8');
//     }

//     const code = fs.readFileSync(filePath, 'utf-8');
//     const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
//     const unusedNames = new Set(analysis.unusedItems.map(item => item.name));

//     // The Transformer: A function that visits each node in the AST
//     const transformer: ts.TransformerFactory<ts.SourceFile> = context => {
//         // CORRECTED: This outer function receives the SourceFile and MUST return a SourceFile.
//         return (sourceFile) => {
//             const visitor: ts.Visitor = (node) => {
//                 // Remove unused function or class declarations
//                 if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name && unusedNames.has(node.name.text)) {
//                     return undefined; // Returning undefined removes the node
//                 }

//                 // Handle variable statements (e.g., const a = 1, b = 2;)
//                 if (ts.isVariableStatement(node)) {
//                     const declarations = node.declarationList.declarations.filter(declaration =>
//                         ts.isIdentifier(declaration.name) && !unusedNames.has(declaration.name.text)
//                     );
//                     if (declarations.length === 0) {
//                         return undefined; // All variables in this statement are unused
//                     }
//                     // Re-create the variable statement with only the used variables
//                     return ts.factory.updateVariableStatement(node, node.modifiers, ts.factory.updateVariableDeclarationList(node.declarationList, declarations));
//                 }

//                 // Handle import declarations (e.g., import { a, b } from './mod')
//                 if (ts.isImportDeclaration(node)) {
//                     const importClause = node.importClause;
//                     if (!importClause) return node;

//                     // Check default import: import D from './mod'
//                     const isDefaultUnused = importClause.name && unusedNames.has(importClause.name.text);

//                     // Check named imports: import { A, B } from './mod'
//                     const namedBindings = importClause.namedBindings;
//                     let usedNamedBindings: ts.NamedImportBindings | undefined;
//                     if (namedBindings && ts.isNamedImports(namedBindings)) {
//                         const usedElements = namedBindings.elements.filter(el => !unusedNames.has(el.name.text));
//                         if (usedElements.length > 0) {
//                             usedNamedBindings = ts.factory.updateNamedImports(namedBindings, usedElements);
//                         }
//                     } else {
//                         usedNamedBindings = namedBindings; // Keep NamespaceImport etc.
//                     }

//                     // If both default and all named imports are gone, remove the whole line
//                     if (isDefaultUnused && !usedNamedBindings) {
//                         return undefined;
//                     }
                    
//                     // Re-create the import clause with only the used parts
//                     const newImportClause = ts.factory.updateImportClause(
//                         importClause,
//                         false, // isTypeOnly
//                         isDefaultUnused ? undefined : importClause.name,
//                         usedNamedBindings
//                     );
//                     return ts.factory.updateImportDeclaration(node, node.modifiers, newImportClause, node.moduleSpecifier, node.assertClause);
//                 }

//                 // For all other nodes, continue visiting their children
//                 return ts.visitEachChild(node, visitor, context);
//             };

//             // Start the visiting process on the sourceFile
//             return ts.visitEachChild(sourceFile, visitor, context);
//         };
//     };

//     // 1. Transform the AST by applying our transformer
//     const transformationResult = ts.transform(sourceFile, [transformer]);
//     const transformedSourceFile = transformationResult.transformed[0];

//     // 2. Generate clean code from the new, transformed AST
//     const printer = ts.createPrinter();
//     const newCode = printer.printFile(transformedSourceFile);

//     transformationResult.dispose();

//     return newCode;
// }

// src/codeAnalyzer.ts

import * as fs from 'fs';
import * as ts from 'typescript';

export interface UnusedItem {
    name: string;
    type: 'import' | 'function' | 'variable' | 'class' | 'interface'; // Added interface type
    line: number;
}

export interface AnalysisResult {
    unusedItems: UnusedItem[];
    filePath?: string;
}

/**
 * Analyze a TypeScript/JavaScript file to detect unused code.
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
        // Find all declarations
        if (
            (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
            node.name
        ) {
            let type: UnusedItem['type'] = 'function';
            if (ts.isClassDeclaration(node)) type = 'class';
            if (ts.isInterfaceDeclaration(node)) type = 'interface';
            declaredItems.set(node.name.text, { name: node.name.text, type, line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line });
        } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
            declaredItems.set(node.name.text, { name: node.name.text, type: 'variable', line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line });
        } else if (ts.isImportSpecifier(node)) {
            declaredItems.set(node.name.text, { name: node.name.text, type: 'import', line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line });
        } else if (ts.isImportClause(node) && node.name) {
            declaredItems.set(node.name.text, { name: node.name.text, type: 'import', line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line });
        }

        // Find all usages of identifiers
        if (ts.isIdentifier(node)) {
            const isDeclaration = node.parent &&
                (ts.isFunctionDeclaration(node.parent) || ts.isClassDeclaration(node.parent) || ts.isInterfaceDeclaration(node.parent) || ts.isVariableDeclaration(node.parent) || ts.isImportSpecifier(node.parent) || ts.isImportClause(node.parent)) &&
                (node.parent as any).name === node;

            if (!isDeclaration) {
                usedNames.add(node.text);
            }
        }
        
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    const unusedItems: UnusedItem[] = [];
    declaredItems.forEach((item, name) => {
        if (!usedNames.has(name)) {
            unusedItems.push(item);
        }
    });

    return { unusedItems, filePath };
}


/**
 * REWRITTEN and CORRECTED: Removes unused items by transforming the AST.
 * This version correctly handles empty import statements.
 */
export function removeUnusedItems(filePath: string, analysis: AnalysisResult): string {
    if (!fs.existsSync(filePath) || !analysis.unusedItems.length) {
        return fs.readFileSync(filePath, 'utf-8');
    }

    const code = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
    const unusedNames = new Set(analysis.unusedItems.map(item => item.name));

    const transformer: ts.TransformerFactory<ts.SourceFile> = context => {
        return (sourceFile) => {
            const visitor: ts.Visitor = (node) => {
                // Remove unused function, class, or interface declarations
                if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) && node.name && unusedNames.has(node.name.text)) {
                    return undefined; // Returning undefined removes the node
                }

                if (ts.isVariableStatement(node)) {
                    const declarations = node.declarationList.declarations.filter(declaration =>
                        ts.isIdentifier(declaration.name) && !unusedNames.has(declaration.name.text)
                    );
                    if (declarations.length === 0) {
                        return undefined;
                    }
                    return ts.factory.updateVariableStatement(node, node.modifiers, ts.factory.updateVariableDeclarationList(node.declarationList, declarations));
                }

                if (ts.isImportDeclaration(node)) {
                    const importClause = node.importClause;
                    if (!importClause) return node;

                    const isDefaultUnused = importClause.name && unusedNames.has(importClause.name.text);

                    let usedNamedBindings: ts.NamedImportBindings | undefined;
                    if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
                        const usedElements = importClause.namedBindings.elements.filter(el => !unusedNames.has(el.name.text));
                        if (usedElements.length > 0) {
                            usedNamedBindings = ts.factory.updateNamedImports(importClause.namedBindings, usedElements);
                        }
                    } else {
                        usedNamedBindings = importClause.namedBindings;
                    }

                    // --- THE FIX IS HERE ---
                    // If the default import is unused AND there are no more named imports,
                    // remove the entire import declaration.
                    if (isDefaultUnused && !usedNamedBindings) {
                        return undefined;
                    }
                    // Also remove if there was no default import to begin with and named imports are all gone.
                    if (!importClause.name && !usedNamedBindings) {
                        return undefined;
                    }
                    
                    const newImportClause = ts.factory.updateImportClause(
                        importClause, false,
                        isDefaultUnused ? undefined : importClause.name,
                        usedNamedBindings
                    );
                    return ts.factory.updateImportDeclaration(node, node.modifiers, newImportClause, node.moduleSpecifier, node.assertClause);
                }

                return ts.visitEachChild(node, visitor, context);
};

            return ts.visitEachChild(sourceFile, visitor, context);
        };
    };

    const transformationResult = ts.transform(sourceFile, [transformer]);
    const transformedSourceFile = transformationResult.transformed[0];
    const printer = ts.createPrinter();
    const newCode = printer.printFile(transformedSourceFile);
    transformationResult.dispose();

    return newCode;
}
