---
name: Code Security Analysis
description: Analyzes code for security risks like data leaks (console logs), hardcoded secrets, and dangerous functions.
---

# Code Security Analysis

This skill provides automated security scanning for your codebase. It helps identify potential risks before they become issues.

## Capabilities

-   **Data Leak Detection:** Finds `console.log`, `console.info`, and other logging statements that might expose sensitive data in production.
-   **Secret Detection:** Scans for potential hardcoded secrets (API keys, passwords, tokens).
-   **Dangerous Pattern Analysis:** Identifies usage of dangerous functions like `eval()` or `dangerouslySetInnerHTML`.
-   **Insecure URLs:** Checks for usage of non-secure `http://` links.

## Usage

To run the security scan, execute the `scan.js` script located in the `scripts` directory of this skill.

```bash
node .agent/skills/code-security-analysis/scripts/scan.js
```

## Configuration

The scanner is configured to check:
-   `src` directory
-   `app` directory

It ignores `node_modules`, `.git`, and other common exclude patterns.
