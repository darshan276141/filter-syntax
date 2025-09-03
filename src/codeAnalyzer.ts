import * as fs from 'fs';
// FIX 1: All necessary functions and types from the 'typescript' library are now listed here.
import {
    createSourceFile,
    createPrinter,
    ScriptTarget,
    forEachChild,
    isFunctionDeclaration,
    isClassDeclaration,
    isInterfaceDeclaration,
    isVariableDeclaration,
    isIdentifier,
    isImportSpecifier,
    isImportClause,
    isVariableStatement,
    isImportDeclaration,
    isNamedImports,
    transform,
    visitEachChild,
    factory,
    Node,
    SourceFile,
    TransformerFactory,
    Visitor,
    NamedImportBindings
} from 'typescript';

export interface UnusedItem {
    name: string;
    type: 'import' | 'function' | 'variable' | 'class' | 'interface';
    line: number;
}

export interface AnalysisResult {
    unusedItems: UnusedItem[];
    filePath?: string;
}

export function analyzeFile(filePath: string): AnalysisResult {
    if (!filePath || !fs.existsSync(filePath)) {
        return { unusedItems: [], filePath };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.trim()) return { unusedItems: [], filePath };

    // FIX 2: The 'ts.' prefix is removed from all calls, like this one.
    const sourceFile = createSourceFile(filePath, content, ScriptTarget.Latest, true);

    const declaredItems: Map<string, UnusedItem> = new Map();
    const usedNames: Set<string> = new Set();

    function visit(node: Node) {
        if (
            (isFunctionDeclaration(node) || isClassDeclaration(node) || isInterfaceDeclaration(node)) &&
            node.name
        ) {
            let type: UnusedItem['type'] = 'function';
            if (isClassDeclaration(node)) type = 'class';
            if (isInterfaceDeclaration(node)) type = 'interface';
            declaredItems.set(node.name.text, { name: node.name.text, type, line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line });
        } else if (isVariableDeclaration(node) && isIdentifier(node.name)) {
            declaredItems.set(node.name.text, { name: node.name.text, type: 'variable', line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line });
        } else if (isImportSpecifier(node)) {
            declaredItems.set(node.name.text, { name: node.name.text, type: 'import', line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line });
        } else if (isImportClause(node) && node.name) {
            declaredItems.set(node.name.text, { name: node.name.text, type: 'import', line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart()).line });
        }

        if (isIdentifier(node)) {
            const isDeclaration = node.parent &&
                (isFunctionDeclaration(node.parent) || isClassDeclaration(node.parent) || isInterfaceDeclaration(node.parent) || isVariableDeclaration(node.parent) || isImportSpecifier(node.parent) || isImportClause(node.parent)) &&
                (node.parent as any).name === node;

            if (!isDeclaration) {
                usedNames.add(node.text);
            }
        }
        
        forEachChild(node, visit);
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

export function removeUnusedItems(filePath: string, analysis: AnalysisResult): string {
    if (!fs.existsSync(filePath) || !analysis.unusedItems.length) {
        return fs.readFileSync(filePath, 'utf-8');
    }

    const code = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = createSourceFile(filePath, code, ScriptTarget.Latest, true);
    const unusedNames = new Set(analysis.unusedItems.map(item => item.name));

    const transformer: TransformerFactory<SourceFile> = context => {
        return (sourceFile) => {
            const visitor: Visitor = (node) => {
                if ((isFunctionDeclaration(node) || isClassDeclaration(node) || isInterfaceDeclaration(node)) && node.name && unusedNames.has(node.name.text)) {
                    return undefined;
                }

                if (isVariableStatement(node)) {
                    const declarations = node.declarationList.declarations.filter(declaration =>
                        isIdentifier(declaration.name) && !unusedNames.has(declaration.name.text)
                    );
                    if (declarations.length === 0) {
                        return undefined;
                    }
                    return factory.updateVariableStatement(node, node.modifiers, factory.updateVariableDeclarationList(node.declarationList, declarations));
                }

                if (isImportDeclaration(node)) {
                    const importClause = node.importClause;
                    if (!importClause) return node;

                    const isDefaultUnused = importClause.name && unusedNames.has(importClause.name.text);

                    let usedNamedBindings: NamedImportBindings | undefined;
                    if (importClause.namedBindings && isNamedImports(importClause.namedBindings)) {
                        const usedElements = importClause.namedBindings.elements.filter(el => !unusedNames.has(el.name.text));
                        if (usedElements.length > 0) {
                            usedNamedBindings = factory.updateNamedImports(importClause.namedBindings, usedElements);
                        }
                    } else {
                        usedNamedBindings = importClause.namedBindings;
                    }

                    if ((isDefaultUnused && !usedNamedBindings) || (!importClause.name && !usedNamedBindings)) {
                        return undefined;
                    }
                    
                    const newImportClause = factory.updateImportClause(
                        importClause, false,
                        isDefaultUnused ? undefined : importClause.name,
                        usedNamedBindings
                    );
                    return factory.updateImportDeclaration(node, node.modifiers, newImportClause, node.moduleSpecifier, node.assertClause);
                }

                return visitEachChild(node, visitor, context);
            };

            return visitEachChild(sourceFile, visitor, context);
        };
    };

    const transformationResult = transform(sourceFile, [transformer]);
    const transformedSourceFile = transformationResult.transformed[0];
    const printer = createPrinter();
    const newCode = printer.printFile(transformedSourceFile);
    transformationResult.dispose();

    return newCode;
}