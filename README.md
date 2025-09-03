Filter-Syn: Smart Code Cleaner

Filter-Syn is a powerful VS Code extension designed to help you clean up your codebase by effortlessly identifying and filtering unused code snippets, variables, functions, and imports in your files. Keep your projects lean and maintainable with a single command.

(Pro-tip: You can use a tool like LICEcap or ScreenToGif to record a short, simple GIF of the extension in action and replace the link above.)

✨ Features

    Identify Unused Variables & Functions: Scans your active file to detect declared variables and functions that are never used.

    Clean Unused Imports: Automatically detects and removes unused import statements in languages like JavaScript, TypeScript, and Python.

    Configurable Modes: Choose whether to highlight unused code for review or remove it directly to clean up the file instantly.

    Quick & Efficient: Runs on-demand to avoid unnecessary background processing, ensuring a smooth coding experience.

    Easy to Use: Integrates directly into the VS Code Command Palette for quick access.

🚀 Installation

    Open Visual Studio Code.

    Go to the Extensions view (Ctrl+Shift+X or Cmd+Shift+X).

    Search for Filter-Syn.

    Click Install.

⚙️ How to Use

Using Filter-Syn is simple and straightforward:

    Open any file you want to clean up in VS Code.

    Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P).

    Type Filter-Syn: Filter Unused Code and press Enter.

    The extension will analyze the current file and either highlight or remove the unused code based on your configured settings.

🔧 Extension Settings

You can customize the behavior of Filter-Syn by modifying its settings in VS Code. Go to File > Preferences > Settings (Ctrl+, or Cmd+,), and search for filter-syn.

    filter-syn.mode:

        highlight (default): Marks unused code with a highlight. This is the safest option, allowing you to review before deleting.

        remove: Directly removes the unused code from the file. Use with caution and ensure your code is under version control.

    filter-syn.showNotificationOnComplete:

        true (default): Shows a small notification in the bottom-right corner when the filtering process is complete.

        false: Disables the completion notification.

⚠️ Known Issues

    Currently, the analysis is limited to the scope of a single file. It does not detect if a function exported from one file is used in another.

    Complex dynamic code or metaprogramming might result in false positives. Always review changes before committing.

Please report any bugs or suggest features on the GitHub Issues page.

📄 Release Notes

1.0.0

    Initial release of Filter-Syn.

    Core functionality to detect and filter unused variables, functions, and imports.

    Added highlight and remove modes.

🤝 Contributing

Contributions are always welcome! If you'd like to help improve Filter-Syn, please feel free to fork the repository, make your changes, and submit a pull request.


Happy Coding!