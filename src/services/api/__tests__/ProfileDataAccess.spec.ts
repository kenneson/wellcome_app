import fs from 'fs';
import path from 'path';

function sourceFiles(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) return sourceFiles(target);
        if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith('.spec.ts')) return [];
        return [target];
    });
}

describe('profile data access boundary', () => {
    it('does not access the profiles table directly from the mobile client', () => {
        const sourceRoot = path.resolve(__dirname, '../../..');
        const offenders = sourceFiles(sourceRoot)
            .filter((file) => /\.from\(\s*['"]profiles['"]\s*\)/.test(fs.readFileSync(file, 'utf8')))
            .map((file) => path.relative(sourceRoot, file));

        expect(offenders).toEqual([]);
    });
});
