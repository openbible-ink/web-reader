import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(
    readFileSync(resolve(root, 'public/build/manifest.json'), 'utf8'),
);

const budgets = [
    ['application shell', 'resources/js/app.tsx', 60],
    ['reader UI', 'resources/js/pages/reader.tsx', 25],
    ['USFM parser', Object.keys(manifest).find((key) => key.startsWith('_parse-')), 165],
];

let failed = false;

for (const [label, key, limitKb] of budgets) {
    if (!key || !manifest[key]) {
        console.error(`Missing ${label} entry in the build manifest.`);
        failed = true;
        continue;
    }

    const asset = readFileSync(resolve(root, 'public/build', manifest[key].file));
    const gzipKb = gzipSync(asset).byteLength / 1024;
    const status = gzipKb <= limitKb ? 'PASS' : 'FAIL';
    console.log(`${status} ${label}: ${gzipKb.toFixed(1)} kB gzip (budget ${limitKb} kB)`);
    failed ||= gzipKb > limitKb;
}

if (failed) process.exitCode = 1;
