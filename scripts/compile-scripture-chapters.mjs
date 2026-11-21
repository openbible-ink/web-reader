import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { parseUsfm } from 'usfm-parser';
import { parseOeb } from 'usfm-parser/oeb';

const root = resolve(import.meta.dirname, '..');
const publicBibleRoot = resolve(root, 'public/bibles');
const outputRoot = resolve(root, 'storage/app/private/scripture/v1');
const requestedEdition = process.argv
    .find((argument) => argument.startsWith('--edition='))
    ?.slice('--edition='.length);

const editions = {
    oeb: {
        name: 'Open English Bible',
        abbreviation: 'OEB',
        language: 'en-GB',
        extensions: ['.usfm.db'],
        parse(source) {
            return parseOeb(source, {
                variants: {
                    spelling: 'cth',
                    gender: 'neut',
                    versification: 'nrsv',
                    gehenna: 'gehenna',
                    ioudaioi: 'ioudaioi',
                },
            });
        },
    },
    webp: {
        name: 'World English Bible',
        abbreviation: 'WEB',
        language: 'en-US',
        extensions: ['.usfm'],
        parse(source) {
            return parseUsfm(source, {
                edition: {
                    id: 'webp',
                    name: 'World English Bible',
                    abbreviation: 'WEB',
                    language: 'en-US',
                },
            });
        },
    },
};

function isSectionHeading(node) {
    return (
        node.type === 'block' &&
        (node.style.startsWith('s') || node.style.startsWith('ms'))
    );
}

function chapterChildren(document, chapterIndex, chapterStarts) {
    const start = chapterStarts[chapterIndex].index;
    const next =
        chapterStarts[chapterIndex + 1]?.index ?? document.children.length;
    let leadingHeadingStart = start;
    while (
        leadingHeadingStart > 0 &&
        isSectionHeading(document.children[leadingHeadingStart - 1])
    ) {
        leadingHeadingStart -= 1;
    }

    let contentEnd = next;
    while (
        contentEnd > start + 1 &&
        isSectionHeading(document.children[contentEnd - 1])
    ) {
        contentEnd -= 1;
    }

    return [
        ...document.children.slice(leadingHeadingStart, start),
        document.children[start],
        ...document.children.slice(start + 1, contentEnd),
    ];
}

function visitNodes(nodes, visitor) {
    for (const node of nodes) {
        visitor(node);
        if (Array.isArray(node.children)) visitNodes(node.children, visitor);
    }
}

function indexesFor(children) {
    const nodes = {};
    const chapters = {};
    const verses = {};
    visitNodes(children, (node) => {
        nodes[node.id] = { nodeId: node.id };
        if (node.type === 'chapterStart') {
            chapters[node.ref] = { ref: node.ref, startNodeId: node.id };
        }
        if (node.type === 'verseStart') {
            verses[node.ref] = { ref: node.ref, startNodeId: node.id };
        }
    });
    return { nodes, chapters, verses };
}

function verseCount(children) {
    let highest = 0;
    visitNodes(children, (node) => {
        if (node.type !== 'verseStart') return;
        for (const match of node.number.matchAll(/\d+/g)) {
            highest = Math.max(highest, Number(match[0]));
        }
    });
    return highest;
}

function diagnosticsFor(children, diagnostics = []) {
    const ranges = [];
    visitNodes(children, (node) => {
        if (node.source) ranges.push(node.source);
    });
    if (ranges.length === 0) return undefined;
    const start = Math.min(...ranges.map((range) => range.start.offset));
    const end = Math.max(...ranges.map((range) => range.end.offset));
    const selected = diagnostics.filter(
        (diagnostic) =>
            diagnostic.source &&
            diagnostic.source.end.offset >= start &&
            diagnostic.source.start.offset <= end,
    );
    return selected.length > 0 ? selected : undefined;
}

async function compileEdition(slug, config) {
    const sourceDirectory = resolve(publicBibleRoot, slug);
    const entries = await readdir(sourceDirectory, { withFileTypes: true });
    const files = entries
        .filter(
            (entry) =>
                entry.isFile() &&
                config.extensions.some((extension) =>
                    entry.name.endsWith(extension),
                ),
        )
        .map((entry) => entry.name)
        .sort();
    const editionManifest = {
        schema: 'open-bible-scripture-manifest',
        schemaVersion: '1.0.0',
        edition: slug,
        books: {},
    };
    await rm(resolve(outputRoot, slug), { recursive: true, force: true });

    for (const filename of files) {
        const source = await readFile(
            resolve(sourceDirectory, filename),
            'utf8',
        );
        const document = config.parse(source);
        const code = document.book.code;
        const chapterStarts = document.children.flatMap((node, index) =>
            node.type === 'chapterStart'
                ? [{ index, number: node.number }]
                : [],
        );
        const bookDirectory = resolve(outputRoot, slug, code);
        await mkdir(bookDirectory, { recursive: true });
        const chapters = {};

        for (let index = 0; index < chapterStarts.length; index += 1) {
            const chapter = chapterStarts[index].number;
            const children = chapterChildren(document, index, chapterStarts);
            const documentDiagnostics = diagnosticsFor(
                children,
                document.diagnostics,
            );
            const chapterDocument = {
                ...document,
                id: `${document.id}.chapter.${chapter}`,
                children,
                indexes: indexesFor(children),
                ...(documentDiagnostics
                    ? { diagnostics: documentDiagnostics }
                    : { diagnostics: undefined }),
            };
            const payload = {
                schema: 'open-bible-scripture-chapter',
                schemaVersion: '1.0.0',
                edition: slug,
                book: code,
                chapter,
                document: chapterDocument,
            };
            await writeFile(
                resolve(bookDirectory, `${chapter}.json.gz`),
                gzipSync(`${JSON.stringify(payload)}\n`, { level: 9 }),
            );
            chapters[chapter] = { verseCount: verseCount(children) };
        }

        editionManifest.books[code] = {
            source: basename(filename),
            chapterCount: chapterStarts.length,
            chapters,
        };
        process.stdout.write(
            `Compiled ${slug}/${code} (${chapterStarts.length} chapters)\n`,
        );
    }

    await mkdir(resolve(outputRoot, slug), { recursive: true });
    await writeFile(
        resolve(outputRoot, slug, 'manifest.json'),
        `${JSON.stringify(editionManifest, null, 2)}\n`,
    );
}

const selected = Object.entries(editions).filter(
    ([slug]) => !requestedEdition || slug === requestedEdition,
);
if (selected.length === 0) {
    throw new Error(`Unknown edition: ${requestedEdition}`);
}
for (const [slug, config] of selected) await compileEdition(slug, config);
