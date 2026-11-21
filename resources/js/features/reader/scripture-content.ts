import type { BibleDocument, FlowNode, InlineNode } from 'usfm-parser';

export type ReadingItem =
    | { key: string; kind: 'heading'; style: string; content: InlineNode[] }
    | { key: string; kind: 'verse'; number: string; content: InlineNode[] };

export interface OutlineItem {
    key: string;
    slug: string;
    style: string;
    title: string;
    verseStart?: string;
    verseEnd?: string;
}

export interface ComparisonRow {
    number: string;
    primary?: Extract<ReadingItem, { kind: 'verse' }>;
    secondary?: Extract<ReadingItem, { kind: 'verse' }>;
    primaryHeadings: Extract<ReadingItem, { kind: 'heading' }>[];
    secondaryHeadings: Extract<ReadingItem, { kind: 'heading' }>[];
}

export function inlinePlainText(nodes: InlineNode[]): string {
    return nodes
        .map((node) => {
            if (node.type === 'text') return node.value;
            if (node.type === 'inline') return inlinePlainText(node.children);
            if (node.type === 'unknown') return node.value ?? '';

            return '';
        })
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
}

export function chapterNumbers(document: BibleDocument): string[] {
    return document.children
        .filter((node) => node.type === 'chapterStart')
        .map((node) => node.number);
}

function isSectionHeading(node: FlowNode): boolean {
    return (
        node.type === 'block' &&
        (node.style.startsWith('s') || node.style.startsWith('ms'))
    );
}

export function isMajorHeading(
    heading: Extract<ReadingItem, { kind: 'heading' }>,
): boolean {
    return heading.style.startsWith('ms');
}

export function readingHeadingLayoutClass(
    items: ReadingItem[],
    index: number,
    dividerClass: string,
): string {
    if (index === 0) return '';
    if (items[index - 1]?.kind === 'heading') return 'mt-3';

    return `relative mt-12 pt-7 before:pointer-events-none before:absolute before:top-0 before:right-0 before:left-[5rem] before:border-t before:content-[''] ${dividerClass}`;
}

export function chapterContent(
    document: BibleDocument,
    chapter: string,
): FlowNode[] {
    const start = document.children.findIndex(
        (node) => node.type === 'chapterStart' && node.number === chapter,
    );
    if (start === -1) return [];
    const next = document.children.findIndex(
        (node, index) => index > start && node.type === 'chapterStart',
    );
    let leadingHeadingStart = start;
    while (
        leadingHeadingStart > 0 &&
        isSectionHeading(document.children[leadingHeadingStart - 1]!)
    ) {
        leadingHeadingStart -= 1;
    }

    let contentEnd = next === -1 ? document.children.length : next;
    while (
        contentEnd > start + 1 &&
        isSectionHeading(document.children[contentEnd - 1]!)
    ) {
        contentEnd -= 1;
    }

    return [
        ...document.children.slice(leadingHeadingStart, start),
        ...document.children.slice(start + 1, contentEnd),
    ];
}

export function readingItems(nodes: FlowNode[]): ReadingItem[] {
    const items: ReadingItem[] = [];
    let verse: { key: string; number: string; content: InlineNode[] } | null =
        null;
    const flushVerse = () => {
        if (verse) items.push({ ...verse, kind: 'verse' });
        verse = null;
    };
    const consumeInline = (node: InlineNode) => {
        if (node.type === 'verseStart') {
            flushVerse();
            verse = { key: node.id, number: node.number, content: [] };
        } else if (verse) {
            verse.content.push(node);
        }
    };

    for (const node of nodes) {
        if (node.type === 'chapterStart') continue;

        if (node.type !== 'block') {
            consumeInline(node);
            continue;
        }

        if (node.style.startsWith('s') || node.style.startsWith('ms')) {
            flushVerse();
            items.push({
                key: node.id,
                kind: 'heading',
                style: node.style,
                content: node.children,
            });
            continue;
        }
        node.children.forEach(consumeInline);
    }
    flushVerse();

    return items;
}

export function focusedReadingItems(
    items: ReadingItem[],
    verseStart?: string | null,
    verseEnd?: string | null,
): ReadingItem[] {
    if (!verseStart) return items;

    const verses = items.flatMap((item) =>
        item.kind === 'verse' ? [item.number] : [],
    );
    const startIndex = verses.indexOf(verseStart);
    const requestedEndIndex = verses.indexOf(verseEnd ?? verseStart);
    if (startIndex === -1) return items;

    const endIndex = Math.max(
        startIndex,
        requestedEndIndex === -1 ? startIndex : requestedEndIndex,
    );
    const selectedVerses = new Set(verses.slice(startIndex, endIndex + 1));
    const focused: ReadingItem[] = [];
    let currentMajorHeading:
        Extract<ReadingItem, { kind: 'heading' }> | undefined;
    let currentSectionHeading:
        Extract<ReadingItem, { kind: 'heading' }> | undefined;
    let includedHeadingKeys = new Set<string>();

    items.forEach((item) => {
        if (item.kind === 'heading') {
            if (isMajorHeading(item)) {
                currentMajorHeading = item;
                currentSectionHeading = undefined;
            } else {
                currentSectionHeading = item;
            }
            includedHeadingKeys = new Set();

            return;
        }

        if (!selectedVerses.has(item.number)) return;

        const currentHeadings = [
            currentMajorHeading,
            currentSectionHeading,
        ].filter(
            (heading): heading is Extract<ReadingItem, { kind: 'heading' }> =>
                heading !== undefined,
        );
        currentHeadings.forEach((heading) => {
            if (!includedHeadingKeys.has(heading.key)) {
                focused.push(heading);
                includedHeadingKeys.add(heading.key);
            }
        });
        focused.push(item);
    });

    return focused;
}

export function chapterOutline(items: ReadingItem[]): OutlineItem[] {
    const slugs = new Map<string, number>();

    return items.flatMap((item, index) => {
        if (item.kind !== 'heading') return [];

        const title = inlinePlainText(item.content);
        const baseSlug =
            title
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || 'section';
        const occurrence = (slugs.get(baseSlug) ?? 0) + 1;
        slugs.set(baseSlug, occurrence);

        const verses: string[] = [];
        for (const following of items.slice(index + 1)) {
            if (
                following.kind === 'heading' &&
                (!isMajorHeading(item) || isMajorHeading(following))
            ) {
                break;
            }
            if (following.kind === 'heading') continue;
            verses.push(following.number);
        }

        return [
            {
                key: item.key,
                slug: occurrence === 1 ? baseSlug : `${baseSlug}-${occurrence}`,
                style: item.style,
                title,
                verseStart: verses.at(0),
                verseEnd: verses.at(-1),
            },
        ];
    });
}

export function comparisonRows(
    primaryItems: ReadingItem[],
    secondaryItems: ReadingItem[],
): ComparisonRow[] {
    const collect = (items: ReadingItem[]) => {
        const verses = new Map<
            string,
            {
                verse: Extract<ReadingItem, { kind: 'verse' }>;
                headings: Extract<ReadingItem, { kind: 'heading' }>[];
            }
        >();
        let headings: Extract<ReadingItem, { kind: 'heading' }>[] = [];

        items.forEach((item) => {
            if (item.kind === 'heading') {
                headings = [...headings, item];
                return;
            }
            verses.set(item.number, { verse: item, headings });
            headings = [];
        });

        return verses;
    };

    const primary = collect(primaryItems);
    const secondary = collect(secondaryItems);
    const numbers = [
        ...primary.keys(),
        ...[...secondary.keys()].filter((number) => !primary.has(number)),
    ];

    return numbers.map((number) => ({
        number,
        primary: primary.get(number)?.verse,
        secondary: secondary.get(number)?.verse,
        primaryHeadings: primary.get(number)?.headings ?? [],
        secondaryHeadings: secondary.get(number)?.headings ?? [],
    }));
}
