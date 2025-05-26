---
description: refactor-file
---

# Objective: Refactor the specified source code file, if it currently exceeds 300 lines, by splitting it into smaller, modular files based on functional or feature-based separation.

Target File: [Placeholder for the specific file path, e.g., `src/game/logic/gameLogic.js`]

Instructions:

1.  **Analyze the Target File:**
    *   Thoroughly examine the logical structure of `[Placeholder for Target File]`.
    *   Identify distinct functional blocks, groups of related functions, components, classes, handlers, or utilities within this single file.

2.  **Plan the Split:**
    *   Based on the analysis, determine how `[Placeholder for Target File]` can be best modularized.
    *   Outline the new files that will be created from its contents. Consider these categories for separation:
        *   Independent functions or clearly defined functional groups.
        *   Self-contained UI components (if applicable).
        *   Logic specific to a particular feature.
        *   Reusable service or utility modules.
        *   API routes or handlers (if applicable).
    *   For each proposed new file, define its primary responsibility.

3.  **Execute the Split for `[Placeholder for Target File]`:**
    *   Create the new, smaller files as planned.
    *   Carefully move the identified code segments from `[Placeholder for Target File]` into their respective new files.
    *   Update `[Placeholder for Target File]` to remove the moved code, potentially leaving it as a smaller orchestrator file or an empty shell if all its content is modularized.

4.  **Establish Import/Export Integrity:**
    *   Ensure all necessary functions, classes, or variables are correctly `export`ed from the new modular files.
    *   Update `[Placeholder for Target File]` (if it still contains logic or orchestrates the new modules) and any *other files that directly depended on the original content of `[Placeholder for Target File]`* to use `import` statements for the newly created modules.
    *   Verify that all import paths are correct relative to the new file structure.

5.  **Maintain Code Standards:**
    *   In each new file created, adhere to existing project naming conventions.
    *   Ensure the code in the new files remains readable and well-organized.
    *   Add a short comment at the top of each new file clearly explaining its role and primary responsibility (e.g., `/** @file userAuthenticationUtils.js - Utility functions for user authentication */`).

6.  **Verify Functionality:**
    *   After restructuring, confirm that all original functionality previously contained within or dependent on `[Placeholder for Target File]` remains fully functional.
    *   If unit tests exist for the original file, update them or create new ones for the modularized parts to ensure test coverage is maintained or improved. The code must remain testable.

7.  **Output the Refactoring Summary:**
    *   Provide a summary of the changes made specifically to `[Placeholder for Target File]`.
    *   List the new files created from `[Placeholder for Target File]` and their paths.
    *   Briefly describe the primary content moved to each new file.

Note: The primary goal is to modularize `[Placeholder for Target File]`. Do not remove or rename core functionality during this refactoring. The overall application behavior that relied on this file must be preserved.