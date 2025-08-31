"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeFile = analyzeFile;
exports.removeUnusedItems = removeUnusedItems;
const fs = __importStar(require("fs"));
const ts = __importStar(require("typescript"));
/**
 * Analyze a TypeScript/JavaScript file to detect unused code.
 * This uses TypeScript AST to reliably detect declarations and usage.
 */
function analyzeFile(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
        return { unusedItems: [], filePath };
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.trim())
        return { unusedItems: [], filePath };
    // Create a TypeScript source file
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    const declaredItems = [];
    const usedNames = new Set();
    // Walk through AST to record declarations
    function visit(node) {
        switch (node.kind) {
            case ts.SyntaxKind.ImportDeclaration:
                const importClause = node.importClause;
                if (importClause && importClause.namedBindings) {
                    if (ts.isNamedImports(importClause.namedBindings)) {
                        importClause.namedBindings.elements.forEach(e => {
                            declaredItems.push({ name: e.name.getText(), type: 'import', line: sourceFile.getLineAndCharacterOfPosition(e.getStart()).line });
                        });
                    }
                }
                break;
            case ts.SyntaxKind.FunctionDeclaration:
                const fn = node;
                if (fn.name)
                    declaredItems.push({ name: fn.name.getText(), type: 'function', line: sourceFile.getLineAndCharacterOfPosition(fn.name.getStart()).line });
                break;
            case ts.SyntaxKind.VariableDeclaration:
                const varDecl = node;
                if (varDecl.name && ts.isIdentifier(varDecl.name)) {
                    declaredItems.push({ name: varDecl.name.getText(), type: 'variable', line: sourceFile.getLineAndCharacterOfPosition(varDecl.name.getStart()).line });
                }
                break;
            case ts.SyntaxKind.ClassDeclaration:
                const cls = node;
                if (cls.name)
                    declaredItems.push({ name: cls.name.getText(), type: 'class', line: sourceFile.getLineAndCharacterOfPosition(cls.name.getStart()).line });
                break;
            case ts.SyntaxKind.Identifier:
                const id = node;
                usedNames.add(id.getText());
                break;
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    // Filter unused items (declared but never used)
    const unusedItems = declaredItems.filter(item => !usedNames.has(item.name));
    return { unusedItems, filePath };
}
/**
 * Generate a cleaned version of the file content with unused items removed.
 * Ensures code structure remains valid.
 */
function removeUnusedItems(filePath, analysis) {
    if (!fs.existsSync(filePath) || !analysis.unusedItems.length)
        return fs.readFileSync(filePath, 'utf-8');
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    // Sort by line descending to safely remove lines
    const linesToRemove = analysis.unusedItems
        .map(i => i.line)
        .sort((a, b) => b - a);
    const removedSet = new Set();
    for (const lineIdx of linesToRemove) {
        if (!removedSet.has(lineIdx)) {
            lines[lineIdx] = ''; // blank line instead of deleting to avoid breaking line numbers
            removedSet.add(lineIdx);
        }
    }
    return lines.join('\n');
}
//# sourceMappingURL=codeAnalyzer.js.map