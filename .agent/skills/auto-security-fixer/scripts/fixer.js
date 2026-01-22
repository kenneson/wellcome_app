const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// -- Configuration --
const SCANNER_SCRIPT = '.agent/skills/code-security-analysis/scripts/scan.js';
const BRANCH_PREFIX = 'chore/security-fixes';

function runCommand(command) {
    try {
        return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
    } catch (error) {
        throw new Error(`Command failed: ${command}\nError: ${error.message}`);
    }
}

function getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

function main() {
    console.log('🛡️  Auto Security Fixer Started');

    // 1. Check Git Status
    console.log('🔍 Checking git status...');
    try {
        const status = runCommand('git status --porcelain');
        if (status.length > 0) {
            console.error('❌ Error: Git working directory is dirty. Please commit or stash changes before running the fixer.');
            process.exit(1);
        }
    } catch (e) {
        console.error('❌ Error checking git status:', e.message);
        process.exit(1);
    }

    // 2. Run Scanner
    console.log('🔎 Running security scan...');
    let findings = [];
    try {
        const scanOutput = runCommand(`node ${SCANNER_SCRIPT} --json`);
        findings = JSON.parse(scanOutput);
    } catch (e) {
        console.error('❌ Error running scanner:', e.message);
        process.exit(1);
    }

    if (findings.length === 0) {
        console.log('✅ No security issues found. No action needed.');
        return;
    }

    console.log(`⚠️  Found ${findings.length} issues. Preparing to fix...`);

    // 3. Create Branch
    const branchName = `${BRANCH_PREFIX}-${getTimestamp()}`;
    console.log(`🌿 Creating branch: ${branchName}`);
    try {
        runCommand(`git checkout -b ${branchName}`);
    } catch (e) {
        console.error('❌ Error creating branch:', e.message);
        process.exit(1);
    }

    // 4. Apply Fixes
    console.log('🔧 Applying fixes...');
    let filesModified = new Set();
    let fixCount = 0;

    // Group findings by file to handle multiple edits per file efficiently
    const findingsByFile = {};
    findings.forEach(f => {
        if (!findingsByFile[f.file]) findingsByFile[f.file] = [];
        findingsByFile[f.file].push(f);
    });

    Object.keys(findingsByFile).forEach(filePath => {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            let lines = content.split('\n');
            let modified = false;

            // Sort findings by line number descending to avoid index shifting problems
            const fileFindings = findingsByFile[filePath].sort((a, b) => b.line - a.line);

            fileFindings.forEach(finding => {
                const lineIndex = finding.line - 1;
                const lineContent = lines[lineIndex];

                // Verify content matches (sanity check)
                if (!lineContent || !lineContent.includes(finding.content)) {
                    console.warn(`   ⚠️  Skipping fix at ${path.basename(filePath)}:${finding.line} (Content mismatch)`);
                    return;
                }

                // --- Fix Logic ---
                if (finding.type === 'Console Usage (Potential PII Leak)') {
                    // Remove the line
                    lines.splice(lineIndex, 1);
                    modified = true;
                    fixCount++;
                } else if (finding.content.includes('debugger;')) {
                    // Heuristic for debugger (if scanner finds it)
                    lines.splice(lineIndex, 1);
                    modified = true;
                    fixCount++;
                } else if (finding.severity === 'CRITICAL' || finding.type.includes('Dangerous')) {
                    // Initialize annotation
                    if (!lines[lineIndex - 1] || !lines[lineIndex - 1].includes('TODO: SECURITY')) {
                        lines.splice(lineIndex, 0, `// TODO: SECURITY - MANUAL REVIEW REQUIRED: ${finding.type}`);
                        modified = true;
                        fixCount++;
                    }
                }
                // (Future: HTTP -> HTTPS logic would go here)
            });

            if (modified) {
                fs.writeFileSync(filePath, lines.join('\n'));
                filesModified.add(filePath);
                console.log(`   ✅ Fixed ${fileFindings.length} issue(s) in ${path.basename(filePath)}`);
            }
        } catch (e) {
            console.error(`   ❌ Error processing file ${filePath}:`, e.message);
        }
    });

    if (filesModified.size === 0) {
        console.log('ℹ️  No automatic fixes were applied.');
        // Cleanup branch if nothing changed? User might prefer to keep it.
        // For now, staying on branch.
        return;
    }

    // 5. Commit Changes
    console.log('💾 Committing changes...');
    try {
        runCommand('git add .');
        runCommand(`git commit -m "chore: auto-fix ${fixCount} security issues (console logs, annotations)"`);
    } catch (e) {
        console.error('❌ Error committing changes:', e.message);
        process.exit(1);
    }

    console.log('\n✅ Auto-fix complete!');
    console.log(`👉 You are now on branch: ${branchName}`);
    console.log('👉 Verify the changes and push:');
    console.log(`   git push origin ${branchName}`);
}

main();
