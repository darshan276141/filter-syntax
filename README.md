<<<<<<< HEAD
# filter_syn
=======
# Filter Syn

**Filter Syn** is a VS Code extension that allows you to quickly filter text or code with customizable options. It supports multiple filters, preview before applying, and undo functionality.

---

## Features

- **Filter Selected Text** – Apply filters to the currently selected text.
- **Filter Whole File** – Apply filters to the entire file.
- **Filter with Options** – Choose which filters to apply via QuickPick.
- **Undo Last Filter** – Revert the last applied filter.
- **Preview Filtered Text** – Preview changes before applying.

---

## Filters

1. **Remove Numbers** – Removes all digits (0-9) from the text.  
2. **Remove Punctuation** – Removes punctuation marks like `.,/#!$%^&*;:{}=-_()`  
3. **Convert to Lowercase** – Converts text to lowercase.

> Filters can be applied individually or combined using the Multi-Option QuickPick.

---

## Installation

1. Clone or download the repository.  
2. Run `npm install` in the project directory.  
3. Press `F5` in VS Code to launch the extension in a new Extension Development Host window.

---

## Usage

### Commands & Keybindings

| Command | Keybinding | Description |
|---------|------------|-------------|
| Filter Selected Text | `Ctrl+Alt+F` | Filters selected text in the editor |
| Filter Whole File | `Ctrl+Alt+O` | Filters entire file |
| Filter with Options | `Ctrl+Alt+O` | Choose which filters to apply |
| Undo Last Filter | `Ctrl+Alt+Z` | Reverts last filter applied |
| Preview Filtered Text | `Ctrl+Alt+P` | Shows a preview of filtered text and option to apply |

### Example Workflow

1. Select text in your editor.  
2. Press `Ctrl+Alt+O` to choose filters.  
3. Apply filters and confirm in the info popup.  
4. Use `Ctrl+Alt+P` to preview changes before applying.  
5. Use `Ctrl+Alt+Z` to undo the last filter if needed.

---

## Settings

Customize default filters in VS Code settings:

```json
"filter-syn.removeNumbers": true,
"filter-syn.removePunctuation": false,
"filter-syn.toLowercase": false
>>>>>>> 1707bd2 (Initial commit: Filter-Syn VS Code extension with AI filter backend)
