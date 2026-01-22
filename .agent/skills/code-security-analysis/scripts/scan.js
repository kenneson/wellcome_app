const fs = require('fs');
const path = require('path');

const CONFIG = {
    dirsToScan: ['src', 'app'],
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    ignoreDirs: ['node_modules', '.git', 'dist', 'build', '.agent'],
    patterns: [
        {
            name: 'Console Usage (Potential PII Leak)',
            regex: /console\.(log|info|warn|error|debug|trace)\s*\(/g,
            severity: 'WARNING'
        },
        {
            name: 'Dangerous Function: eval()',
            regex: /\beval\s*\(/g,
            severity: 'CRITICAL'
        },
        {
            name: 'Dangerous: dangerouslySetInnerHTML',
            regex: /dangerouslySetInnerHTML/g,
            severity: 'HIGH'
        },
        {
            name: 'Potential Hardcoded Secret',
            regex: /(api_key|apikey|secret|password|passwd|token|auth_token)\s*[:=]\s*['"`][a-zA-Z0-9_\-\.]{8,}['"`]/gi,
            severity: 'HIGH'
        },
        {
            name: 'Insecure URL (http://)',
            regex: /http:\/\/[^\s"']+/g,
            severity: 'MEDIUM'
        },
        {
            name: 'Weak Randomness',
            regex: /Math\.random\(\)/g,
            severity: 'LOW'
        }
    ]
};

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const findings = [];
    const lines = content.split('\n');

    CONFIG.patterns.forEach(pattern => {
        let match;
        // Reset lastIndex for global regex
        pattern.regex.lastIndex = 0;

        // Use a loop to find multiple matches in the file content
        // Note: For simple regexes without global flag, this loop runs once. 
        // We added 'g' flag to patterns in CONFIG where applicable.
        while ((match = pattern.regex.exec(content)) !== null) {
            const index = match.index;
            // Calculate line number from index
            const lineNumber = content.substring(0, index).split('\n').length;
            const lineContent = lines[lineNumber - 1].trim();

            findings.push({
                file: filePath,
                line: lineNumber,
                type: pattern.name,
                severity: pattern.severity,
                content: lineContent
            });
        }
    });

    return findings;
}

function scanDirectory(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;

    const items = fs.readdirSync(dir);

    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!CONFIG.ignoreDirs.includes(item)) {
                results = results.concat(scanDirectory(fullPath));
            }
        } else {
            const ext = path.extname(item);
            if (CONFIG.extensions.includes(ext)) {
                results = results.concat(scanFile(fullPath));
            }
        }
    });

    return results;
}

function main() {
    const args = process.argv.slice(2);
    const jsonOutput = args.includes('--json');

    if (!jsonOutput) console.log('Starting Security Scan...');
    let allFindings = [];

    CONFIG.dirsToScan.forEach(dir => {
        const fullPath = path.resolve(process.cwd(), dir);
        if (fs.existsSync(fullPath)) {
            allFindings = allFindings.concat(scanDirectory(fullPath));
        } else if (!jsonOutput) {
            console.log(`Directory not found (skipping): ${dir}`);
        }
    });

    if (jsonOutput) {
        console.log(JSON.stringify(allFindings, null, 2));
        return;
    }

    if (allFindings.length === 0) {
        console.log('\n✅ No security issues found!');
        return;
    }

    console.log(`\nFound ${allFindings.length} potential issues:\n`);

    // Group by severity
    const critical = allFindings.filter(f => f.severity === 'CRITICAL');
    const high = allFindings.filter(f => f.severity === 'HIGH');
    const warning = allFindings.filter(f => f.severity === 'WARNING');
    const others = allFindings.filter(f => !['CRITICAL', 'HIGH', 'WARNING'].includes(f.severity));

    const printFindings = (list, emoji) => {
        list.forEach(f => {
            console.log(`${emoji} [${f.severity}] ${f.type}`);
            console.log(`   File: ${path.relative(process.cwd(), f.file)}:${f.line}`);
            console.log(`   Code: ${f.content}`);
            console.log('');
        });
    };

    if (critical.length > 0) printFindings(critical, '🔴');
    if (high.length > 0) printFindings(high, '🟠');
    if (warning.length > 0) printFindings(warning, '🟡');
    if (others.length > 0) printFindings(others, '🔵');

    console.log('Scan Complete.');
}

main();
