import fs from 'fs';
import path from 'path';

const sourceRoot = path.resolve(__dirname, '../../..');
const mojibakePattern = new RegExp([
    '\\u00C3\\u0192',
    '\\u00C3[\\u0080-\\u00BF\\u0152\\u0153\\u0160\\u0161\\u0178\\u017D\\u017E\\u0192\\u02C6\\u02DC\\u2013-\\u203A]',
    '\\u00C2[\\u0080-\\u00BF\\u0152\\u0153\\u0160\\u0161\\u0178\\u017D\\u017E\\u0192\\u02C6\\u02DC\\u2013-\\u203A]',
    '\\u00E2[\\u0080-\\u00BF\\u0152\\u0153\\u0160\\u0161\\u0178\\u017D\\u017E\\u0192\\u02C6\\u02DC\\u2013-\\u203A]',
    '\\u00F0\\u0178',
    '\\u00EF\\u00BF\\u00BD',
    '\\uFFFD',
].join('|'));

function sourceFiles(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) return sourceFiles(absolute);
        return /\.(ts|tsx|json)$/.test(entry.name) ? [absolute] : [];
    });
}

describe('source text encoding', () => {
    it('does not contain common UTF-8 mojibake sequences', () => {
        const offenders = sourceFiles(sourceRoot)
            .filter((file) => mojibakePattern.test(fs.readFileSync(file, 'utf8')))
            .map((file) => path.relative(sourceRoot, file));

        expect(offenders).toEqual([]);
    });
});
