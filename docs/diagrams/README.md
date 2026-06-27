# Software Engineering Diagrams

This folder contains editable Mermaid diagrams for the GyanPath MCA Study Helper project.

## Diagram List

- [Context Diagram / User-Based Diagram](./context-diagram.md) - Shows the main users, web application, database, static assets, YouTube metadata and Resend verification delivery.
- [DFD Level-0](./dfd-level-0.md) - Shows the system as a single process with external actors and major data stores.
- [DFD Level-1](./dfd-level-1.md) - Breaks the system into authentication, catalog, question bank, progress, content, analytics and admin processes.
- [UML Use Case Diagram](./uml-use-case.md) - Shows the implemented use cases available to students, editors and administrators.
- [UML Class Diagram](./uml-class-diagram.md) - Summarizes the main database-backed domain classes and relationships from the Prisma schema.
- [UML Sequence Diagram](./uml-sequence-diagram.md) - Shows registration, Resend email verification, login, question-bank browsing and progress-saving flows.

## How to Preview Mermaid Diagrams in VS Code

1. Open any diagram Markdown file from `docs/diagrams/`.
2. Press `Ctrl+Shift+V` to open Markdown Preview.
3. If Mermaid does not render automatically, install a Mermaid preview extension.
4. Keep the Mermaid code blocks editable in Markdown so the diagrams remain Git-friendly.

## Recommended VS Code Extensions

- Markdown Preview Mermaid Support
- Mermaid Markdown Syntax Highlighting
- Markdown All in One

## Notes

- These diagrams describe the implemented codebase, not every planned feature listed in the project README.
- Features that are present only as future plans or frontend placeholders are mentioned in assumptions where relevant.
- Mermaid syntax was kept simple so the diagrams can be edited easily for MCA/IGNOU documentation.
