# scripts/python_analyzer.py
import sys
import json
import ast
import libcst as cst

# --- Part 1: Analysis (No changes needed) ---

class AnalysisVisitor(ast.NodeVisitor):
    def __init__(self):
        self.declared = {}
        self.used = set()

    def visit_FunctionDef(self, node):
        self.declared[node.name] = {"name": node.name, "type": "function", "line": node.lineno - 1}
        self.generic_visit(node)

    def visit_ClassDef(self, node):
        self.declared[node.name] = {"name": node.name, "type": "class", "line": node.lineno - 1}
        self.generic_visit(node)

    def visit_Assign(self, node):
        for target in node.targets:
            if isinstance(target, ast.Name):
                self.declared[target.id] = {"name": target.id, "type": "variable", "line": node.lineno - 1}
        self.generic_visit(node)

    def visit_Import(self, node):
        for alias in node.names:
            name = alias.asname or alias.name
            self.declared[name] = {"name": name, "type": "import", "line": node.lineno - 1}

    def visit_ImportFrom(self, node):
        for alias in node.names:
            name = alias.asname or alias.name
            self.declared[name] = {"name": name, "type": "import", "line": node.lineno - 1}

    def visit_Name(self, node):
        if isinstance(node.ctx, ast.Load):
            self.used.add(node.id)

def analyze_code(code):
    try:
        tree = ast.parse(code)
        visitor = AnalysisVisitor()
        visitor.visit(tree)
        
        unused_items = []
        for name, item in visitor.declared.items():
            if name not in visitor.used:
                unused_items.append(item)
        
        print(json.dumps({"unusedItems": unused_items}))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

# --- Part 2: Removal (UPDATED) ---

class RemovalTransformer(cst.CSTTransformer):
    def __init__(self, names_to_remove):
        self.names_to_remove = set(names_to_remove)

    def leave_FunctionDef(self, original_node, updated_node):
        if original_node.name.value in self.names_to_remove:
            return cst.RemoveFromParent()
        return updated_node

    def leave_ClassDef(self, original_node, updated_node):
        if original_node.name.value in self.names_to_remove:
            return cst.RemoveFromParent()
        return updated_node
    
    def leave_Assign(self, original_node, updated_node):
        all_targets_unused = all(
            isinstance(target.target, cst.Name) and target.target.value in self.names_to_remove
            for target in original_node.targets
        )
        if all_targets_unused:
            return cst.RemoveFromParent()
        return updated_node

    def leave_Import(self, original_node, updated_node):
        def get_alias_name(alias):
            # --- THE FIX ---
            # Correctly access the name from an AsName object
            if alias.asname:
                return alias.asname.name.value
            return alias.name.value

        used_aliases = [
            alias for alias in updated_node.names 
            if get_alias_name(alias) not in self.names_to_remove
        ]
        
        if not used_aliases:
            return cst.RemoveFromParent()
        
        return updated_node.with_changes(names=used_aliases)

    def leave_ImportFrom(self, original_node, updated_node):
        def get_alias_name(alias):
            # --- THE FIX ---
            # Correctly access the name from an AsName object
            if alias.asname:
                return alias.asname.name.value
            return alias.name.value

        if isinstance(updated_node.names, cst.ImportStar):
            return updated_node

        used_aliases = [
            alias for alias in updated_node.names
            if get_alias_name(alias) not in self.names_to_remove
        ]

        if not used_aliases:
            return cst.RemoveFromParent()

        return updated_node.with_changes(names=used_aliases)

    def leave_SimpleStatementLine(self, original_node, updated_node):
        if not updated_node.body:
            return cst.RemoveFromParent()
        return updated_node

def remove_code(code, unused_names):
    try:
        tree = cst.parse_module(code)
        transformer = RemovalTransformer(unused_names)
        modified_tree = tree.visit(transformer)
        print(modified_tree.code)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

# --- Main Entry Point (No changes) ---

if __name__ == "__main__":
    action = sys.argv[1]
    file_path = sys.argv[2]

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if action == "analyze":
        analyze_code(content)
    elif action == "remove":
        names_to_remove_json = sys.stdin.read()
        names_to_remove = json.loads(names_to_remove_json)
        remove_code(content, names_to_remove)