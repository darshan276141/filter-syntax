Filter-Syn: AI-Powered Code Cleaner

Filter-Syn is a powerful VS Code extension designed to help you clean up your codebase by effortlessly identifying and filtering unused code. It analyzes your JavaScript, TypeScript, and Python files to find unused imports, functions, variables, and classes, helping you keep your projects lean, readable, and maintainable.
Key Features

    Multi-Language Support: Analyzes JavaScript, TypeScript, and Python files.

    Comprehensive Analysis: Detects unused imports, functions, variables, and classes.

    Interactive UI Panel: Reviews all detected items in a clear UI panel and lets you choose which ones to remove.

    Safe Undo: Made a mistake? A simple command lets you undo the last cleaning operation.

    AI-Powered (Future): Built with a foundation to integrate AI suggestions for more complex refactoring tasks.

Installation

    Open Visual Studio Code.

    Go to the Extensions view (Ctrl+Shift+X).

    Search for Filter-Syn.

    Click "Install".

How to Use

    Open a JavaScript, TypeScript, or Python file in the editor.

    Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P).

    Type Filter-Syn: Remove Unused Code and press Enter.

    An analysis panel will open beside your editor. Uncheck any items you wish to keep.

    Click the "Apply Selected" button to remove the checked items from your code.

Configuration

For the Python analysis to work correctly, the extension needs to know where your Python executable is located.

Important for Python Users:
If the extension has trouble analyzing Python files, you may need to set the path to your Python interpreter:

    Open VS Code Settings (Ctrl + ,).

    Search for filter-syn.pythonPath.

    Enter the absolute path to your desired Python executable.

Your Python environment must also have the libcst library installed. The extension will show a helpful error message if it's missing. You can install it by running pip install libcst in your terminal.
Available Commands

    Filter-Syn: Remove Unused Code

        This command analyzes the active file and opens the selection panel for you to choose which code to remove.

    Filter-Syn: Undo Last Filter

        This command reverts the last "Remove Unused Code" operation you performed.

Contributing

Contributions are welcome! If you have ideas for new features, find a bug, or want to improve the code, please feel free to open an issue or submit a pull request on the GitHub repository.
License

This project is licensed under the MIT License.