import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { auditBibleDocument } from 'usfm-parser';
import { parseOeb } from 'usfm-parser/oeb';

const args = new Set(process.argv.slice(2));
const sourceDirectory = resolve(
    process.env.OEB_AUDIT_SOURCE ?? 'public/bibles/oeb',
);
const baselinePath = resolve('resources/bible/oeb-integrity-baseline.json');
const files = readdirSync(sourceDirectory)
    .filter((name) => name.endsWith('.usfm.db'))
    .sort();
const findings = [];

for (const file of files) {
    const source = readFileSync(resolve(sourceDirectory, file), 'utf8');
    const document = parseOeb(source, { documentId: `oeb:${file}` });
    for (const finding of auditBibleDocument(document).findings) {
        findings.push({
            file,
            ...finding,
            ...(finding.source ? { line: finding.source.start.line } : {}),
            source: undefined,
        });
    }
}

const normalized = findings
    .map(({ source: _source, ...finding }) => finding)
    .sort((left, right) => left.fingerprint.localeCompare(right.fingerprint));

if (args.has('--write-baseline')) {
    writeFileSync(
        baselinePath,
        `${JSON.stringify({ schemaVersion: 1, source: 'Open English Bible', files, findings: normalized }, null, 2)}\n`,
    );
    console.log(
        `Recorded ${normalized.length} known integrity findings in ${baselinePath}.`,
    );
    process.exit(0);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const expected = new Map(
    baseline.findings.map((finding) => [finding.fingerprint, finding]),
);
const actual = new Map(
    normalized.map((finding) => [finding.fingerprint, finding]),
);
const introduced = normalized.filter(
    (finding) => !expected.has(finding.fingerprint),
);
const resolved = baseline.findings.filter(
    (finding) => !actual.has(finding.fingerprint),
);
const expectedFiles = new Set(baseline.files ?? []);
const actualFiles = new Set(files);
const missingFiles = [...expectedFiles].filter(
    (file) => !actualFiles.has(file),
);
const unexpectedFiles = [...actualFiles].filter(
    (file) => !expectedFiles.has(file),
);
const counts = normalized.reduce((result, finding) => {
    result[finding.code] = (result[finding.code] ?? 0) + 1;
    return result;
}, {});

const report = {
    files: files.length,
    findings: normalized.length,
    errors: normalized.filter((finding) => finding.severity === 'error').length,
    warnings: normalized.filter((finding) => finding.severity === 'warning')
        .length,
    counts,
    introduced,
    resolved,
    missingFiles,
    unexpectedFiles,
};

if (args.has('--json')) console.log(JSON.stringify(report));
else {
    console.log(
        `Scripture integrity: ${report.files} books, ${report.errors} known errors, ${report.warnings} known warnings.`,
    );
    for (const finding of introduced)
        console.error(
            `NEW ${finding.file}:${finding.line ?? '?'} ${finding.code} — ${finding.message}`,
        );
    for (const finding of resolved)
        console.error(
            `RESOLVED ${finding.file}:${finding.line ?? '?'} ${finding.code} — ${finding.message}`,
        );
    for (const file of missingFiles) console.error(`MISSING BOOK FILE ${file}`);
    for (const file of unexpectedFiles)
        console.error(`UNEXPECTED BOOK FILE ${file}`);
}

if (
    introduced.length > 0 ||
    resolved.length > 0 ||
    missingFiles.length > 0 ||
    unexpectedFiles.length > 0
) {
    console.error(
        'The OEB integrity baseline changed. Review the source change, then deliberately refresh the baseline if it is correct.',
    );
    process.exit(1);
}
