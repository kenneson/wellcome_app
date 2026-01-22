---
name: Auto Security Fixer
description: Automates the process of finding and fixing security issues. Runs the scanner, branches, fixes issues (like console logs), and commits.
---

# Auto Security Fixer

This skill automates the security remediation workflow.

## Capabilities

1.  **Scans Code:** Uses the `code-security-analysis` scanner to find issues.
2.  **Safety Check:** Ensures the git status is clean before starting.
3.  **Auto-Branch:** Creates a new branch named `chore/security-fixes-<timestamp>`.
4.  **Auto-Fix:**
    -   Removes `console.log`, `console.info`, etc.
    -   Removes `debugger;` statements.
    -   Adds `// TODO: SECURITY` annotations to dangerous functions (`eval`, `dangerouslySetInnerHTML`).
    -   (Future) Upgrades `http://` to `https://`.
5.  **Auto-Commit:** Commits the changes with a descriptive message.

## Usage

To run the auto-fixer:

```bash
node .agent/skills/auto-security-fixer/scripts/fixer.js
```

## Workflow

1.  **Analyze**: It runs the security scanner in JSON mode.
2.  **Branch**: If issues are found, it creates a dedicated branch.
3.  **Repair**: It iterates through files and removes/annotates risky lines.
4.  **Commit**: It saves the work to git.
5.  **Report**: It outputs the next steps (git push).
