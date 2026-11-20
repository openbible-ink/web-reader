import { readFile } from 'node:fs/promises';
import { parseUsfm } from 'usfm-parser';
import { parseOeb } from 'usfm-parser/oeb';

const manifest = JSON.parse(
    await new Promise((resolve, reject) => {
        let input = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => (input += chunk));
        process.stdin.on('end', () => resolve(input));
        process.stdin.on('error', reject);
    }),
);

function plainText(nodes = []) {
    return nodes
        .map((node) => {
            if (node.type === 'text') return node.value;
            if (node.type === 'note') return '';
            return node.children ? plainText(node.children) : '';
        })
        .join('');
}

function footnoteText(note) {
    return (note.children ?? [])
        .filter((field) => field.style !== 'fr' && field.style !== 'xo')
        .map((field) => plainText(field.children))
        .join(' ')
        .replace(/\s+/gu, ' ')
        .trim();
}

function extractVerses(document) {
    const verses = [];
    const verseByReference = new Map();
    let chapter = null;
    let current = null;
    let sectionKey = null;
    let sectionTitle = null;

    const flush = () => {
        if (!current) return;
        current.text = current.text.replace(/\s+/gu, ' ').trim();
        current.footnoteText =
            current.footnoteText.replace(/\s+/gu, ' ').trim() || null;
        if (current.text) {
            const key = `${current.chapter}:${current.verse}`;
            const existing = verseByReference.get(key);
            if (existing) {
                if (!existing.text.includes(current.text))
                    existing.text += ` ${current.text}`;
                if (!existing.sectionTitle && current.sectionTitle)
                    existing.sectionTitle = current.sectionTitle;
                if (
                    current.footnoteText &&
                    !existing.footnoteText?.includes(current.footnoteText)
                ) {
                    existing.footnoteText = [
                        existing.footnoteText,
                        current.footnoteText,
                    ]
                        .filter(Boolean)
                        .join(' ');
                }
            } else {
                verseByReference.set(key, current);
                verses.push(current);
            }
        }
        current = null;
    };

    const visit = (node) => {
        if (node.type === 'chapterStart') {
            flush();
            chapter = node.number;
            sectionKey = null;
            sectionTitle = null;
            return;
        }
        if (node.type === 'block' && /^s\d*$/u.test(node.style)) {
            flush();
            sectionKey = node.id;
            sectionTitle =
                plainText(node.children).replace(/\s+/gu, ' ').trim() || null;
            return;
        }
        if (node.type === 'verseStart') {
            flush();
            const ref = node.ref.split('.');
            current = {
                chapter: chapter ?? ref.at(-2),
                verse: node.number,
                sectionKey,
                sectionTitle,
                footnoteText: '',
                text: '',
            };
            return;
        }
        if (node.type === 'text' && current) {
            current.text += node.value;
            return;
        }
        if (node.type === 'note') {
            if (current) current.footnoteText += ` ${footnoteText(node)}`;
            return;
        }
        if (node.type === 'block') {
            if (current?.text && !/\s$/u.test(current.text))
                current.text += ' ';
            node.children?.forEach(visit);
            return;
        }
        if (node.children) node.children.forEach(visit);
    };

    document.children.forEach(visit);
    flush();
    return verses;
}

const result = [];
for (const book of manifest.books) {
    const source = await readFile(book.path, 'utf8');
    const document =
        book.variantProfile === 'oeb'
            ? parseOeb(source, {
                  bookCode: book.bookCode,
                  variants: {
                      spelling: 'cth',
                      gender: 'neut',
                      versification: 'nrsv',
                      gehenna: 'gehenna',
                      ioudaioi: 'ioudaioi',
                  },
              })
            : parseUsfm(source, {
                  edition: { id: book.editionSlug, name: book.editionName },
                  bookCode: book.bookCode,
              });

    result.push({ id: book.id, verses: extractVerses(document) });
}

process.stdout.write(JSON.stringify(result));
