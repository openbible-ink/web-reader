import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Bookmark,
    BookOpen,
    Highlighter,
    List,
    Maximize2,
    Minimize2,
    MoreHorizontal,
    NotebookPen,
    Pencil,
    Plus,
    Save,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import {
    Fragment,
    type CSSProperties,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    cachedScriptureSource,
    loadScriptureSource,
} from '@/lib/scripture-source-cache';
import type {
    BibleDocument,
    FlowNode,
    InlineNode,
    NoteFieldNode,
} from 'usfm-parser';
import { parseUsfm } from 'usfm-parser';
import { parseOeb, type OebVariantOptions } from 'usfm-parser/oeb';
import { toast } from 'sonner';
import NoteEditor from '@/components/note-editor';
import CustomSelect from '@/components/custom-select';

interface ScriptureArtwork {
    id: string;
    imageUrl: string;
    title?: string;
    altText: string;
    caption?: string;
    approach: 'historical' | 'symbolic' | 'narrative' | 'artistic';
    attribution?: string;
    license?: string;
    focalPoint?: { x?: number; y?: number };
    reference: {
        book: string;
        chapter?: string | null;
        verseStart?: string | null;
        verseEnd?: string | null;
    };
    role: 'hero' | 'inline' | 'background' | 'gallery';
}

function FilledHighlighter({ className = '' }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4Z" />
            <path d="m8.25 13.05-5.5 5.5V21h8.5l2.55-2.55Z" />
        </svg>
    );
}

interface ReaderProps {
    edition: {
        slug: string;
        name: string;
        abbreviation: string;
        language: string;
        licence?: string | null;
        attribution?: string | null;
        sourceFormat: string;
        variantProfile?: string | null;
    };
    book: {
        id: string;
        code: string;
        name: string;
        longName?: string | null;
        sourceUrl: string;
        chapterCount: number;
    };
    chapter: string;
    availableEditions: Array<{
        slug: string;
        name: string;
        abbreviation: string;
        bookCode: string;
    }>;
    artworks?: ScriptureArtwork[];
    bookmarks?: ChapterBookmark[];
    focusedBookmark?: ChapterBookmark | null;
    highlights?: ScriptureHighlight[];
    notes?: ScriptureNote[];
    focusedNoteId?: string | null;
    focusedNoteExpanded?: boolean;
}

interface ChapterBookmark {
    id: string;
    title?: string | null;
    verseStart?: string | null;
    verseEnd?: string | null;
}

type HighlightColor = 'yellow' | 'green' | 'blue' | 'rose';

interface HighlightSegment {
    verse: string;
    startOffset: number;
    endOffset: number;
    exactText: string;
    prefix?: string | null;
    suffix?: string | null;
}

interface ScriptureHighlight {
    id: string;
    color: HighlightColor;
    selectedText: string;
    segments: HighlightSegment[];
}

type NoteAnchorType = 'verse' | 'range' | 'section' | 'selection';

interface ScriptureNote {
    id: string;
    title: string;
    bodyMarkdown: string;
    anchorType: NoteAnchorType;
    selectedText?: string | null;
    sectionKey?: string | null;
    sectionTitle?: string | null;
    verseStart?: string | null;
    verseEnd?: string | null;
    segments: HighlightSegment[];
}

interface NoteAnchor {
    type: NoteAnchorType;
    verseStart?: string;
    verseEnd?: string;
    sectionKey?: string;
    sectionTitle?: string;
    selectedText?: string;
    segments?: HighlightSegment[];
}

interface PendingHighlight {
    selectedText: string;
    segments: HighlightSegment[];
    position: { top: number; left: number };
}

interface SelectionNotePreview {
    note: ScriptureNote;
    position: { top: number; left: number };
}

type ReadingItem =
    | { key: string; kind: 'heading'; content: InlineNode[] }
    | { key: string; kind: 'verse'; number: string; content: InlineNode[] };

interface OutlineItem {
    key: string;
    title: string;
    verseStart?: string;
    verseEnd?: string;
}

interface TypographyPreferences {
    fontSize: 'small' | 'medium' | 'large';
    lineSpacing: 'compact' | 'comfortable' | 'relaxed';
    theme: 'light' | 'dark' | 'sepia';
}

function notePreview(markdown: string): string {
    return markdown
        .replace(/[#>*_`[\]()!-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function NoteMarker({
    notes,
    onClick,
    variant = 'verse',
}: {
    notes: ScriptureNote[];
    onClick: () => void;
    variant?: 'verse' | 'section';
}) {
    const isSection = variant === 'section';

    return (
        <span className="group/note relative flex justify-end pt-0.5 font-sans">
            <button
                type="button"
                onClick={onClick}
                aria-label={
                    notes.length
                        ? `Open ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`
                        : 'Add note'
                }
                className={`relative inline-grid size-8 cursor-pointer place-items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--reader-accent)] ${notes.length ? (isSection ? 'text-black opacity-100' : 'text-[var(--reader-accent)] opacity-100') : 'text-stone-400 opacity-0 group-focus-within/verse:opacity-100 group-hover/verse:opacity-100 hover:text-[var(--reader-accent)] focus:opacity-100'}`}
            >
                <NotebookPen
                    className={`size-4 ${notes.length ? (isSection ? 'fill-stone-500/35' : 'fill-current/15') : ''}`}
                />
                {notes.length > 1 && (
                    <span
                        className={`absolute -top-1 -right-1 grid size-4 place-items-center rounded-full text-[0.62rem] font-bold text-white tabular-nums ${isSection ? 'bg-stone-950' : 'bg-[var(--reader-accent)]'}`}
                    >
                        {notes.length}
                    </span>
                )}
            </button>
            {notes.length > 0 && (
                <span
                    role="tooltip"
                    className="pointer-events-none absolute top-8 right-0 z-40 hidden w-72 rounded-xl border border-stone-200 bg-[#fffdf9] p-4 text-left text-stone-800 shadow-xl group-focus-within/note:block group-hover/note:block"
                >
                    {notes.slice(0, 3).map((note) => (
                        <span
                            key={note.id}
                            className="block border-b border-dotted border-stone-300 py-2 last:border-0"
                        >
                            <span className="block text-xs font-semibold">
                                {note.title}
                            </span>
                            <span className="mt-1 line-clamp-3 block font-serif text-sm leading-5 text-stone-600">
                                {notePreview(note.bodyMarkdown)}
                            </span>
                        </span>
                    ))}
                </span>
            )}
        </span>
    );
}

const highlightColors: Array<{
    value: HighlightColor;
    label: string;
    className: string;
}> = [
    { value: 'yellow', label: 'Golden yellow', className: 'bg-[#e8c968]' },
    { value: 'green', label: 'Sage green', className: 'bg-[#9fbd92]' },
    { value: 'blue', label: 'Soft blue', className: 'bg-[#91b8cb]' },
    { value: 'rose', label: 'Dusty rose', className: 'bg-[#d8a0a0]' },
];

function textOffset(
    root: HTMLElement,
    boundaryNode: Node,
    boundaryOffset: number,
): number {
    const range = window.document.createRange();
    range.selectNodeContents(root);
    range.setEnd(boundaryNode, boundaryOffset);
    return range.toString().length;
}

function captureHighlightSelection(
    article: HTMLElement,
): PendingHighlight | undefined {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        return undefined;
    }

    const range = selection.getRangeAt(0);
    if (!article.contains(range.commonAncestorContainer)) return undefined;

    const segments = Array.from(
        article.querySelectorAll<HTMLElement>('[data-verse-number]'),
    ).flatMap((verseElement) => {
        if (!range.intersectsNode(verseElement)) return [];

        const text = verseElement.textContent ?? '';
        const startsHere = verseElement.contains(range.startContainer);
        const endsHere = verseElement.contains(range.endContainer);
        const startOffset = startsHere
            ? textOffset(verseElement, range.startContainer, range.startOffset)
            : 0;
        const endOffset = endsHere
            ? textOffset(verseElement, range.endContainer, range.endOffset)
            : text.length;
        if (endOffset <= startOffset) return [];

        const exactText = text.slice(startOffset, endOffset);
        if (!exactText.trim()) return [];

        return [
            {
                verse: verseElement.dataset.verseNumber!,
                startOffset,
                endOffset,
                exactText,
                prefix: text.slice(Math.max(0, startOffset - 32), startOffset),
                suffix: text.slice(endOffset, endOffset + 32),
            },
        ];
    });

    if (!segments.length) return undefined;
    const rect = range.getBoundingClientRect();

    return {
        selectedText: selection.toString().trim(),
        segments,
        position: {
            top: rect.bottom + 10,
            left: rect.left + rect.width / 2,
        },
    };
}

function pointAtTextOffset(root: HTMLElement, requestedOffset: number) {
    const walker = window.document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let remaining = requestedOffset;
    let node = walker.nextNode();

    while (node) {
        const length = node.textContent?.length ?? 0;
        if (remaining <= length) return { node, offset: remaining };
        remaining -= length;
        node = walker.nextNode();
    }

    return { node: root, offset: root.childNodes.length };
}

function rangeForHighlightSegment(
    verseElement: HTMLElement,
    segment: HighlightSegment,
): Range | undefined {
    const text = verseElement.textContent ?? '';
    let startOffset = segment.startOffset;
    let endOffset = segment.endOffset;

    if (text.slice(startOffset, endOffset) !== segment.exactText) {
        const matches: number[] = [];
        let match = text.indexOf(segment.exactText);
        while (match !== -1) {
            matches.push(match);
            match = text.indexOf(segment.exactText, match + 1);
        }
        const anchored = matches.find((index) => {
            const prefixMatches = segment.prefix
                ? text.slice(
                      Math.max(0, index - segment.prefix.length),
                      index,
                  ) === segment.prefix
                : true;
            const suffixMatches = segment.suffix
                ? text.slice(
                      index + segment.exactText.length,
                      index + segment.exactText.length + segment.suffix.length,
                  ) === segment.suffix
                : true;
            return prefixMatches && suffixMatches;
        });
        const fallback = anchored ?? matches.at(0);
        if (fallback === undefined) return undefined;
        startOffset = fallback;
        endOffset = fallback + segment.exactText.length;
    }

    const start = pointAtTextOffset(verseElement, startOffset);
    const end = pointAtTextOffset(verseElement, endOffset);
    const range = window.document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    return range;
}

const newTestamentBooks = [
    'Matthew',
    'Mark',
    'Luke',
    'John',
    'Acts',
    'Romans',
    '1 Corinthians',
    '2 Corinthians',
    'Galatians',
    'Ephesians',
    'Philippians',
    'Colossians',
    '1 Thessalonians',
    '2 Thessalonians',
    '1 Timothy',
    '2 Timothy',
    'Titus',
    'Philemon',
    'Hebrews',
    'James',
    '1 Peter',
    '2 Peter',
    '1 John',
    '2 John',
    '3 John',
    'Jude',
    'Revelation',
];
const defaultPreferences: OebVariantOptions = {
    spelling: 'cth',
    gender: 'neut',
    versification: 'nrsv',
    gehenna: 'gehenna',
    ioudaioi: 'ioudaioi',
};
const defaultTypography: TypographyPreferences = {
    fontSize: 'medium',
    lineSpacing: 'comfortable',
    theme: 'light',
};
const typographyPreferencesKey = 'bible-reader:typography';
const documentCache = new Map<string, BibleDocument>();
const maximumCachedDocuments = 32;

function rememberDocument(key: string, document: BibleDocument): BibleDocument {
    documentCache.delete(key);
    documentCache.set(key, document);

    const oldestKey = documentCache.keys().next().value;
    if (documentCache.size > maximumCachedDocuments && oldestKey) {
        documentCache.delete(oldestKey);
    }

    return document;
}

function preferencesKey(editionSlug: string): string {
    return `bible-reader:${editionSlug}:preferences`;
}

function savedPreferences(editionSlug: string): OebVariantOptions {
    if (typeof window === 'undefined') return defaultPreferences;
    try {
        const saved = window.localStorage.getItem(preferencesKey(editionSlug));
        return saved
            ? { ...defaultPreferences, ...JSON.parse(saved) }
            : defaultPreferences;
    } catch {
        return defaultPreferences;
    }
}

function savedTypography(): TypographyPreferences {
    if (typeof window === 'undefined') return defaultTypography;
    try {
        const saved = window.localStorage.getItem(typographyPreferencesKey);
        return saved
            ? { ...defaultTypography, ...JSON.parse(saved) }
            : defaultTypography;
    } catch {
        return defaultTypography;
    }
}

function noteText(fields: NoteFieldNode[]): string {
    return fields
        .flatMap((field) => field.children)
        .filter((node) => node.type === 'text')
        .map((node) => node.value)
        .join(' ');
}

function renderInline(node: InlineNode): ReactNode {
    switch (node.type) {
        case 'text':
            return node.value;
        case 'verseStart':
            return null;
        case 'inline': {
            const content = node.children.map((child) => (
                <Fragment key={child.id}>{renderInline(child)}</Fragment>
            ));
            if (node.style === 'nd')
                return (
                    <span className="font-semibold uppercase">{content}</span>
                );
            if (node.style === 'em' || node.style === 'qs')
                return <em>{content}</em>;
            return <span>{content}</span>;
        }
        case 'note':
            return (
                <button
                    type="button"
                    title={noteText(node.children)}
                    aria-label={`Footnote: ${noteText(node.children)}`}
                    className="mx-0.5 cursor-pointer rounded-sm align-super font-sans text-[0.48em] font-semibold text-[var(--reader-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--reader-accent)]"
                >
                    {node.caller === '+' ? '†' : (node.caller ?? '†')}
                </button>
            );
        case 'unknown':
            return node.value ?? null;
    }
}

function renderInlineSequence(nodes: InlineNode[]): ReactNode {
    return nodes.map((node, index) => {
        const previous = nodes[index - 1];
        const needsSpace =
            index > 0 &&
            previous?.type === 'text' &&
            node.type === 'text' &&
            !/\s$/.test(previous.value) &&
            !/^[\s,.;:!?)]/.test(node.value);

        return (
            <Fragment key={node.id}>
                {needsSpace && ' '}
                {renderInline(node)}
            </Fragment>
        );
    });
}

function inlinePlainText(nodes: InlineNode[]): string {
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

function chapterNumbers(document: BibleDocument): string[] {
    return document.children
        .filter((node) => node.type === 'chapterStart')
        .map((node) => node.number);
}

function chapterContent(document: BibleDocument, chapter: string): FlowNode[] {
    const start = document.children.findIndex(
        (node) => node.type === 'chapterStart' && node.number === chapter,
    );
    if (start === -1) return [];
    const next = document.children.findIndex(
        (node, index) => index > start && node.type === 'chapterStart',
    );
    return document.children.slice(start + 1, next === -1 ? undefined : next);
}

function readingItems(nodes: FlowNode[]): ReadingItem[] {
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
                content: node.children,
            });
            continue;
        }
        node.children.forEach(consumeInline);
    }
    flushVerse();
    return items;
}

function focusedReadingItems(
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
    let currentHeadings: Extract<ReadingItem, { kind: 'heading' }>[] = [];
    let includedHeadingKeys = new Set<string>();

    items.forEach((item) => {
        if (item.kind === 'heading') {
            currentHeadings = [item];
            includedHeadingKeys = new Set();
            return;
        }

        if (!selectedVerses.has(item.number)) return;

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

function chapterOutline(items: ReadingItem[]): OutlineItem[] {
    return items.flatMap((item, index) => {
        if (item.kind !== 'heading') return [];

        const verses: string[] = [];
        for (const following of items.slice(index + 1)) {
            if (following.kind === 'heading') break;
            verses.push(following.number);
        }

        return [
            {
                key: item.key,
                title: inlinePlainText(item.content),
                verseStart: verses.at(0),
                verseEnd: verses.at(-1),
            },
        ];
    });
}

interface PreferenceSelectProps {
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
}

function PreferenceSelect({
    label,
    value,
    options,
    onChange,
}: PreferenceSelectProps) {
    return (
        <div className="grid gap-1.5 text-xs tracking-wide text-stone-500 uppercase">
            <span>{label}</span>
            <CustomSelect
                label={label}
                value={value}
                onChange={onChange}
                options={options}
                triggerClassName="rounded-lg text-sm tracking-normal normal-case"
            />
        </div>
    );
}

function TypographyChoice<Value extends string>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: Value;
    options: Array<{ value: Value; label: string }>;
    onChange: (value: Value) => void;
}) {
    return (
        <fieldset>
            <legend className="mb-2 text-xs font-semibold tracking-[0.16em] text-stone-500 uppercase">
                {label}
            </legend>
            <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-stone-100 p-1">
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={value === option.value}
                        onClick={() => onChange(option.value)}
                        className={`cursor-pointer rounded-lg px-2 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#a95624] ${value === option.value ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-600 hover:bg-white/60 hover:text-stone-950'}`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </fieldset>
    );
}

function DashboardIcon({
    className = '',
    strokeWidth = 1.6,
}: {
    className?: string;
    strokeWidth?: number;
}) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <rect x="3" y="3" width="8" height="5" rx="1.6" />
            <rect x="13" y="3" width="8" height="10" rx="1.6" />
            <rect x="3" y="10" width="8" height="11" rx="1.6" />
            <rect x="13" y="15" width="8" height="6" rx="1.6" />
        </svg>
    );
}

function Brand() {
    return (
        <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-md text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a95624]"
        >
            <img
                src="/images/brand/open-bible-mark-dark-128.png"
                alt=""
                aria-hidden="true"
                className="size-8 object-contain"
                width="32"
                height="32"
            />
            <span className="font-serif text-[1.08rem] font-semibold">
                Open Bible
            </span>
        </Link>
    );
}

function Library({
    activeBook,
    close,
}: {
    activeBook: string;
    close?: () => void;
}) {
    const navItems = [
        { icon: DashboardIcon, label: 'Dashboard', href: '/dashboard' },
        { icon: BookOpen, label: 'Read' },
        { icon: NotebookPen, label: 'Notes', href: '/notes' },
        { icon: Highlighter, label: 'Highlights', href: '/highlights' },
        { icon: Bookmark, label: 'Bookmarks', href: '/bookmarks' },
    ] as const;
    return (
        <div className="flex h-full flex-col bg-[#faf8f3]">
            <div className="flex items-center justify-between px-8 pt-7 pb-8">
                <Brand />
                {close && (
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Close library"
                    >
                        <X className="size-5" />
                    </button>
                )}
            </div>
            <nav className="px-5 font-serif text-[0.98rem] text-stone-700">
                {navItems.map(({ icon: Icon, label, ...item }) => {
                    const className = `mb-1 flex w-full cursor-pointer items-center gap-4 rounded-r-xl border-l-2 px-5 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a95624] ${label === 'Read' ? 'border-[#b85f28] bg-[#f2ece3] text-[#94491e]' : 'border-transparent'}`;
                    const content = (
                        <>
                            <Icon className="size-5" strokeWidth={1.6} />
                            {label}
                        </>
                    );

                    return 'href' in item ? (
                        <Link
                            key={label}
                            href={item.href}
                            className={className}
                        >
                            {content}
                        </Link>
                    ) : (
                        <button key={label} type="button" className={className}>
                            {content}
                        </button>
                    );
                })}
            </nav>
            <div className="mx-10 my-5 border-t border-stone-200" />
            <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-10">
                <p className="mb-3 text-[0.63rem] font-semibold tracking-[0.26em] text-stone-500 uppercase">
                    New Testament
                </p>
                <div className="font-serif text-[0.93rem] leading-[1.9] text-stone-600">
                    {newTestamentBooks.map((book) => (
                        <button
                            type="button"
                            key={book}
                            className={`block w-full rounded-lg px-1 text-left ${book === activeBook ? 'font-semibold text-stone-950' : 'hover:text-stone-950'}`}
                        >
                            {book}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function Reader({
    edition,
    book,
    chapter,
    availableEditions: _availableEditions,
    artworks = [],
    bookmarks = [],
    focusedBookmark,
    highlights = [],
    notes = [],
    focusedNoteId,
    focusedNoteExpanded = false,
}: ReaderProps) {
    const { auth } = usePage().props;
    const [loadedSource, setLoadedSource] = useState<{
        url: string;
        source: string;
    }>(() => ({
        url: book.sourceUrl,
        source: cachedScriptureSource(book.sourceUrl) ?? '',
    }));
    const [loadError, setLoadError] = useState<string>();
    const [preferences, setPreferences] = useState<OebVariantOptions>(() =>
        savedPreferences(edition.slug),
    );
    const [typography, setTypography] =
        useState<TypographyPreferences>(savedTypography);
    const [editionPreferencesOpen, setEditionPreferencesOpen] = useState(false);
    const [typographyOpen, setTypographyOpen] = useState(false);
    const [outlineOpen, setOutlineOpen] = useState(false);
    const [bookmarkOpen, setBookmarkOpen] = useState(false);
    const [bookmarkMode, setBookmarkMode] = useState<
        'create' | 'edit' | 'list'
    >('create');
    const [editingBookmark, setEditingBookmark] = useState<ChapterBookmark>();
    const [bookmarkTitle, setBookmarkTitle] = useState('');
    const [bookmarkVerseStart, setBookmarkVerseStart] = useState('');
    const [bookmarkVerseEnd, setBookmarkVerseEnd] = useState('');
    const [bookmarkProcessing, setBookmarkProcessing] = useState(false);
    const [bookmarkError, setBookmarkError] = useState<string>();
    const [highlightOpen, setHighlightOpen] = useState(false);
    const [pendingHighlight, setPendingHighlight] =
        useState<PendingHighlight>();
    const [highlightProcessing, setHighlightProcessing] = useState(false);
    const [selectionNotePreview, setSelectionNotePreview] =
        useState<SelectionNotePreview>();
    const [noteOpen, setNoteOpen] = useState(false);
    const [noteClosing, setNoteClosing] = useState(false);
    const [noteExpanded, setNoteExpanded] = useState(false);
    const [noteReferenceOpen, setNoteReferenceOpen] = useState(false);
    const [noteMode, setNoteMode] = useState<'create' | 'edit' | 'list'>(
        'create',
    );
    const [noteList, setNoteList] = useState<ScriptureNote[]>([]);
    const [noteListAnchor, setNoteListAnchor] = useState<NoteAnchor>();
    const [editingNote, setEditingNote] = useState<ScriptureNote>();
    const [noteAnchor, setNoteAnchor] = useState<NoteAnchor>({ type: 'verse' });
    const [noteOriginVerse, setNoteOriginVerse] = useState<string>();
    const [noteTitle, setNoteTitle] = useState('');
    const [noteTitleAutomatic, setNoteTitleAutomatic] = useState(true);
    const [noteBody, setNoteBody] = useState('');
    const [noteProcessing, setNoteProcessing] = useState(false);
    const [noteError, setNoteError] = useState<string>();
    const editionPreferencesRef = useRef<HTMLDivElement>(null);
    const typographyRef = useRef<HTMLDivElement>(null);
    const outlineRef = useRef<HTMLDivElement>(null);
    const bookmarkRef = useRef<HTMLDivElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);
    const heroArtworkRef = useRef<HTMLDivElement>(null);
    const heroTextRef = useRef<HTMLDivElement>(null);
    const readerArticleRef = useRef<HTMLElement>(null);
    const closeNoteDrawer = useCallback(() => {
        if (noteClosing) return;
        const duration = window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 0
            : 280;
        setNoteClosing(true);
        window.setTimeout(() => {
            setNoteOpen(false);
            setNoteClosing(false);
            setNoteExpanded(false);
            setNoteReferenceOpen(false);
        }, duration);
    }, [noteClosing]);
    const beginEditNote = useCallback(
        (note: ScriptureNote, expanded = false) => {
            const originVerse = note.verseStart ?? note.segments[0]?.verse;
            setEditingNote(note);
            setNoteOriginVerse(originVerse);
            setNoteAnchor({
                type: note.anchorType,
                verseStart: note.verseStart ?? note.segments[0]?.verse,
                verseEnd: note.verseEnd ?? note.segments.at(-1)?.verse,
                sectionKey: note.sectionKey ?? undefined,
                sectionTitle: note.sectionTitle ?? undefined,
                selectedText: note.selectedText ?? undefined,
                segments: note.segments,
            });
            setNoteTitle(note.title);
            setNoteTitleAutomatic(false);
            setNoteBody(note.bodyMarkdown);
            setNoteError(undefined);
            setNoteMode('edit');
            setNoteExpanded(expanded);
            setNoteReferenceOpen(false);
            setNoteOpen(true);
        },
        [],
    );

    useEffect(() => {
        let active = true;
        setLoadError(undefined);
        loadScriptureSource(book.sourceUrl)
            .then((source) => {
                if (active) setLoadedSource({ url: book.sourceUrl, source });
            })
            .catch((error: unknown) => {
                if (!active) return;
                setLoadError(
                    error instanceof Error
                        ? error.message.replace('Scripture', book.name)
                        : `Unable to load ${book.name}`,
                );
            });
        return () => {
            active = false;
        };
    }, [book.name, book.sourceUrl]);

    useEffect(() => {
        window.localStorage.setItem(
            preferencesKey(edition.slug),
            JSON.stringify(preferences),
        );
    }, [edition.slug, preferences]);

    useEffect(() => {
        window.localStorage.setItem(
            typographyPreferencesKey,
            JSON.stringify(typography),
        );
    }, [typography]);

    useEffect(() => {
        if (
            !editionPreferencesOpen &&
            !typographyOpen &&
            !outlineOpen &&
            !bookmarkOpen &&
            !highlightOpen &&
            !noteOpen
        )
            return;

        const dismissOnEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (noteReferenceOpen) {
                setNoteReferenceOpen(false);
                return;
            }
            if (noteExpanded) {
                setNoteExpanded(false);
                return;
            }
            setEditionPreferencesOpen(false);
            setTypographyOpen(false);
            setOutlineOpen(false);
            setBookmarkOpen(false);
            setHighlightOpen(false);
            closeNoteDrawer();
        };
        const dismissOnOutsidePointer = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;

            if (
                editionPreferencesOpen &&
                !editionPreferencesRef.current?.contains(target)
            ) {
                setEditionPreferencesOpen(false);
            }
            if (typographyOpen && !typographyRef.current?.contains(target)) {
                setTypographyOpen(false);
            }
            if (outlineOpen && !outlineRef.current?.contains(target)) {
                setOutlineOpen(false);
            }
            if (bookmarkOpen && !bookmarkRef.current?.contains(target)) {
                setBookmarkOpen(false);
            }
            if (highlightOpen && !highlightRef.current?.contains(target)) {
                setHighlightOpen(false);
            }
        };

        window.document.addEventListener('keydown', dismissOnEscape);
        window.document.addEventListener(
            'pointerdown',
            dismissOnOutsidePointer,
        );
        return () => {
            window.document.removeEventListener('keydown', dismissOnEscape);
            window.document.removeEventListener(
                'pointerdown',
                dismissOnOutsidePointer,
            );
        };
    }, [
        bookmarkOpen,
        closeNoteDrawer,
        editionPreferencesOpen,
        highlightOpen,
        noteOpen,
        noteExpanded,
        noteReferenceOpen,
        outlineOpen,
        typographyOpen,
    ]);

    useEffect(() => {
        const updateSelection = () => {
            const article = readerArticleRef.current;
            if (!article) return;
            setPendingHighlight(captureHighlightSelection(article));
        };

        window.document.addEventListener('mouseup', updateSelection);
        window.document.addEventListener('touchend', updateSelection);
        return () => {
            window.document.removeEventListener('mouseup', updateSelection);
            window.document.removeEventListener('touchend', updateSelection);
        };
    }, []);

    const source =
        loadedSource.url === book.sourceUrl && loadedSource.source
            ? loadedSource.source
            : undefined;
    const document = useMemo(() => {
        if (!source) return undefined;

        const cacheKey = JSON.stringify({
            sourceUrl: book.sourceUrl,
            bookCode: book.code,
            edition: edition.slug,
            variantProfile: edition.variantProfile,
            preferences:
                edition.variantProfile === 'oeb' ? preferences : undefined,
        });
        const cached = documentCache.get(cacheKey);
        if (cached) return rememberDocument(cacheKey, cached);

        const parsed =
            edition.variantProfile === 'oeb'
                ? parseOeb(source, { variants: preferences })
                : parseUsfm(source, {
                      edition: {
                          id: edition.slug,
                          name: edition.name,
                          abbreviation: edition.abbreviation,
                          language: edition.language,
                      },
                      bookCode: book.code,
                  });

        return rememberDocument(cacheKey, parsed);
    }, [book, edition, source, preferences]);
    const chapters = useMemo(
        () => (document ? chapterNumbers(document) : []),
        [document],
    );
    const fullContent = useMemo(
        () => (document ? readingItems(chapterContent(document, chapter)) : []),
        [document, chapter],
    );
    const content = useMemo(
        () =>
            focusedReadingItems(
                fullContent,
                focusedBookmark?.verseStart,
                focusedBookmark?.verseEnd,
            ),
        [focusedBookmark, fullContent],
    );
    const outline = useMemo(() => chapterOutline(content), [content]);
    const verseNumbers = useMemo(
        () =>
            fullContent.flatMap((item) =>
                item.kind === 'verse' ? [item.number] : [],
            ),
        [fullContent],
    );
    useEffect(() => {
        const registry = (
            CSS as unknown as {
                highlights?: {
                    set: (name: string, highlight: unknown) => void;
                    delete: (name: string) => void;
                };
            }
        ).highlights;
        const HighlightConstructor = (
            window as unknown as {
                Highlight?: new (...ranges: Range[]) => unknown;
            }
        ).Highlight;
        if (!registry || !HighlightConstructor) return;

        const noteSelectionName = 'open-bible-note-selection';
        const names = [
            ...highlightColors.map(({ value }) => `open-bible-${value}`),
            noteSelectionName,
        ];
        names.forEach((name) => registry.delete(name));

        const ranges = new Map<HighlightColor, Range[]>();
        highlightColors.forEach(({ value }) => ranges.set(value, []));
        highlights.forEach((highlight) => {
            highlight.segments.forEach((segment) => {
                const verseElement =
                    readerArticleRef.current?.querySelector<HTMLElement>(
                        `[data-verse-number="${CSS.escape(segment.verse)}"]`,
                    );
                if (!verseElement) return;
                const range = rangeForHighlightSegment(verseElement, segment);
                if (range) ranges.get(highlight.color)?.push(range);
            });
        });

        ranges.forEach((colorRanges, color) => {
            if (colorRanges.length) {
                registry.set(
                    `open-bible-${color}`,
                    new HighlightConstructor(...colorRanges),
                );
            }
        });

        const noteRanges = notes.flatMap((note) => {
            if (note.anchorType !== 'selection') return [];
            return note.segments.flatMap((segment) => {
                const verseElement =
                    readerArticleRef.current?.querySelector<HTMLElement>(
                        `[data-verse-number="${CSS.escape(segment.verse)}"]`,
                    );
                if (!verseElement) return [];
                const range = rangeForHighlightSegment(verseElement, segment);
                return range ? [range] : [];
            });
        });
        if (noteRanges.length) {
            registry.set(
                noteSelectionName,
                new HighlightConstructor(...noteRanges),
            );
        }

        return () => names.forEach((name) => registry.delete(name));
    }, [content, highlights, notes]);

    useEffect(() => {
        const article = readerArticleRef.current;
        const selectionNotes = notes.filter(
            (note) => note.anchorType === 'selection',
        );
        if (!article || selectionNotes.length === 0) {
            setSelectionNotePreview(undefined);
            return;
        }

        const notesAtPoint = (
            clientX: number,
            clientY: number,
            target: EventTarget | null,
        ) => {
            const verseElement =
                target instanceof Element
                    ? target.closest<HTMLElement>('[data-verse-number]')
                    : null;
            if (!verseElement || !article.contains(verseElement)) {
                return [];
            }

            const documentWithCaret = window.document as Document & {
                caretPositionFromPoint?: (
                    x: number,
                    y: number,
                ) => { offsetNode: Node; offset: number } | null;
                caretRangeFromPoint?: (x: number, y: number) => Range | null;
            };
            const caretPosition = documentWithCaret.caretPositionFromPoint?.(
                clientX,
                clientY,
            );
            const fallbackRange = caretPosition
                ? null
                : documentWithCaret.caretRangeFromPoint?.(clientX, clientY);
            const node =
                caretPosition?.offsetNode ?? fallbackRange?.startContainer;
            const nodeOffset =
                caretPosition?.offset ?? fallbackRange?.startOffset;
            if (
                !node ||
                nodeOffset === undefined ||
                !verseElement.contains(node)
            ) {
                return [];
            }

            const offset = textOffset(verseElement, node, nodeOffset);
            const verse = verseElement.dataset.verseNumber;
            return selectionNotes.filter((candidate) =>
                candidate.segments.some(
                    (segment) =>
                        segment.verse === verse &&
                        offset >= segment.startOffset &&
                        offset <= segment.endOffset,
                ),
            );
        };
        const noteAtPoint = (event: PointerEvent) => {
            const note = notesAtPoint(
                event.clientX,
                event.clientY,
                event.target,
            )[0];
            if (!note) {
                setSelectionNotePreview(undefined);
                return;
            }

            setSelectionNotePreview({
                note,
                position: {
                    top:
                        event.clientY > window.innerHeight - 180
                            ? event.clientY - 150
                            : event.clientY + 16,
                    left: Math.max(
                        12,
                        Math.min(event.clientX + 16, window.innerWidth - 332),
                    ),
                },
            });
        };
        const openNoteAtPoint = (event: MouseEvent) => {
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) return;

            const anchored = notesAtPoint(
                event.clientX,
                event.clientY,
                event.target,
            );
            if (anchored.length === 0) return;

            event.preventDefault();
            setSelectionNotePreview(undefined);
            const first = anchored[0];
            setNoteList(anchored);
            setNoteListAnchor({
                type: 'selection',
                selectedText: first.selectedText ?? undefined,
                segments: first.segments,
                verseStart: first.verseStart ?? first.segments[0]?.verse,
                verseEnd: first.verseEnd ?? first.segments.at(-1)?.verse,
            });
            setNoteMode('list');
            setNoteExpanded(false);
            setNoteReferenceOpen(false);
            setNoteOpen(true);
        };
        const clearPreview = () => setSelectionNotePreview(undefined);

        article.addEventListener('pointermove', noteAtPoint);
        article.addEventListener('click', openNoteAtPoint);
        article.addEventListener('pointerleave', clearPreview);
        return () => {
            article.removeEventListener('pointermove', noteAtPoint);
            article.removeEventListener('click', openNoteAtPoint);
            article.removeEventListener('pointerleave', clearPreview);
        };
    }, [content, notes]);
    useEffect(() => {
        if (noteOpen) setSelectionNotePreview(undefined);
    }, [noteOpen]);
    const chapterIndex = chapters.indexOf(chapter);
    const chapterArtwork = useMemo(
        () =>
            artworks.find((item) => item.reference.chapter === chapter) ??
            artworks.find((item) => item.reference.chapter == null),
        [artworks, chapter],
    );
    const imagePosition = chapterArtwork
        ? `${chapterArtwork.focalPoint?.x ?? 50}% ${chapterArtwork.focalPoint?.y ?? 50}%`
        : undefined;
    useEffect(() => {
        const artwork = heroArtworkRef.current;
        const text = heroTextRef.current;
        if (!artwork && !text) return;

        const reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        );
        let animationFrame: number | undefined;

        const update = () => {
            animationFrame = undefined;
            if (reducedMotion.matches) {
                if (artwork) artwork.style.transform = '';
                if (text) text.style.transform = '';
                return;
            }

            const banner = (artwork ?? text)?.parentElement;
            if (!banner) return;
            const distance = Math.min(
                Math.max(0, -banner.getBoundingClientRect().top),
                banner.offsetHeight * 1.25,
            );
            if (artwork) {
                artwork.style.transform = `translate3d(0, ${distance * 0.52}px, 0)`;
            }
            if (text) {
                text.style.transform = `translate3d(0, ${distance * 0.24}px, 0)`;
            }
        };

        const scheduleUpdate = () => {
            if (animationFrame !== undefined) return;
            animationFrame = window.requestAnimationFrame(update);
        };

        scheduleUpdate();
        window.addEventListener('scroll', scheduleUpdate, { passive: true });
        window.addEventListener('resize', scheduleUpdate);
        reducedMotion.addEventListener('change', scheduleUpdate);

        return () => {
            window.removeEventListener('scroll', scheduleUpdate);
            window.removeEventListener('resize', scheduleUpdate);
            reducedMotion.removeEventListener('change', scheduleUpdate);
            if (animationFrame !== undefined) {
                window.cancelAnimationFrame(animationFrame);
            }
        };
    }, [chapterArtwork]);
    const updatePreference = <Key extends keyof OebVariantOptions>(
        key: Key,
        value: OebVariantOptions[Key],
    ) => setPreferences((current) => ({ ...current, [key]: value }));
    const updateTypography = <Key extends keyof TypographyPreferences>(
        key: Key,
        value: TypographyPreferences[Key],
    ) => setTypography((current) => ({ ...current, [key]: value }));
    const changeChapter = (nextChapter: string) => {
        router.visit(`/read/${edition.slug}/${book.code}/${nextChapter}`, {
            preserveScroll: false,
        });
    };
    const navigateToSection = (key: string) => {
        setOutlineOpen(false);
        window.requestAnimationFrame(() => {
            window.document
                .getElementById(`section-${key}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };
    const bookmarkReference = (bookmark: ChapterBookmark) => {
        if (!bookmark.verseStart) return `${book.name} ${chapter}`;
        const verses =
            bookmark.verseStart === bookmark.verseEnd
                ? bookmark.verseStart
                : `${bookmark.verseStart}–${bookmark.verseEnd}`;
        return `${book.name} ${chapter}:${verses}`;
    };
    const currentSection = () => {
        const visible = outline.filter((section) => {
            const element = window.document.getElementById(
                `section-${section.key}`,
            );
            return element && element.getBoundingClientRect().top <= 190;
        });
        return visible.at(-1) ?? outline.at(0);
    };
    const beginCreateBookmark = () => {
        const section = currentSection();
        setEditingBookmark(undefined);
        setBookmarkTitle(section?.title ?? '');
        setBookmarkVerseStart(section?.verseStart ?? '');
        setBookmarkVerseEnd(section?.verseEnd ?? section?.verseStart ?? '');
        setBookmarkError(undefined);
        setBookmarkMode('create');
        setBookmarkOpen(true);
    };
    const beginEditBookmark = (bookmark: ChapterBookmark) => {
        setEditingBookmark(bookmark);
        setBookmarkTitle(bookmark.title ?? '');
        setBookmarkVerseStart(bookmark.verseStart ?? '');
        setBookmarkVerseEnd(bookmark.verseEnd ?? bookmark.verseStart ?? '');
        setBookmarkError(undefined);
        setBookmarkMode('edit');
        setBookmarkOpen(true);
    };
    const openBookmarks = () => {
        if (!auth.user) {
            router.visit('/login');
            return;
        }
        setEditionPreferencesOpen(false);
        setTypographyOpen(false);
        setOutlineOpen(false);
        setHighlightOpen(false);
        if (bookmarks.length === 0) beginCreateBookmark();
        else if (bookmarks.length === 1) beginEditBookmark(bookmarks[0]!);
        else {
            setBookmarkMode('list');
            setBookmarkOpen(true);
        }
    };
    const saveBookmark = () => {
        const data = {
            bible_book_id: book.id,
            chapter,
            verse_start: bookmarkVerseStart || null,
            verse_end: bookmarkVerseStart
                ? bookmarkVerseEnd || bookmarkVerseStart
                : null,
            title: bookmarkTitle || null,
        };
        const options = {
            preserveScroll: true,
            onStart: () => {
                setBookmarkProcessing(true);
                setBookmarkError(undefined);
            },
            onError: (errors: Record<string, string>) =>
                setBookmarkError(Object.values(errors)[0]),
            onSuccess: () => setBookmarkOpen(false),
            onFinish: () => setBookmarkProcessing(false),
        };

        if (bookmarkMode === 'edit' && editingBookmark) {
            router.patch(`/bookmarks/${editingBookmark.id}`, data, options);
        } else {
            router.post('/bookmarks', data, options);
        }
    };
    const removeBookmark = (bookmark: ChapterBookmark) => {
        if (
            !window.confirm(
                `Remove “${bookmark.title || bookmarkReference(bookmark)}”?`,
            )
        )
            return;
        router.delete(`/bookmarks/${bookmark.id}`, {
            preserveScroll: true,
            onSuccess: () => setBookmarkOpen(false),
        });
    };
    const saveHighlight = (color: HighlightColor) => {
        if (!pendingHighlight || highlightProcessing) return;
        if (!auth.user) {
            router.visit('/login');
            return;
        }

        const existingIds = new Set(highlights.map(({ id }) => id));
        router.post(
            '/highlights',
            {
                bible_book_id: book.id,
                chapter,
                color,
                selected_text: pendingHighlight.selectedText,
                segments: pendingHighlight.segments.map((segment) => ({
                    verse: segment.verse,
                    start_offset: segment.startOffset,
                    end_offset: segment.endOffset,
                    exact_text: segment.exactText,
                    prefix: segment.prefix,
                    suffix: segment.suffix,
                })),
            },
            {
                preserveScroll: true,
                onStart: () => setHighlightProcessing(true),
                onSuccess: (page) => {
                    const nextHighlights = (page.props.highlights ??
                        []) as ScriptureHighlight[];
                    const created = nextHighlights.find(
                        ({ id }) => !existingIds.has(id),
                    );
                    setPendingHighlight(undefined);
                    setHighlightOpen(false);
                    window.getSelection()?.removeAllRanges();
                    toast.success('Highlight saved', {
                        action: created
                            ? {
                                  label: 'Undo',
                                  onClick: () =>
                                      router.delete(
                                          `/highlights/${created.id}`,
                                          { preserveScroll: true },
                                      ),
                              }
                            : undefined,
                    });
                },
                onError: () => toast.error('Unable to save highlight'),
                onFinish: () => setHighlightProcessing(false),
            },
        );
    };
    const updateHighlightColor = (
        highlight: ScriptureHighlight,
        color: HighlightColor,
    ) => {
        router.patch(
            `/highlights/${highlight.id}`,
            { color },
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Highlight colour updated'),
            },
        );
    };
    const removeHighlight = (highlight: ScriptureHighlight) => {
        router.delete(`/highlights/${highlight.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Highlight removed'),
        });
    };
    const openHighlights = () => {
        if (!auth.user) {
            router.visit('/login');
            return;
        }
        setEditionPreferencesOpen(false);
        setTypographyOpen(false);
        setOutlineOpen(false);
        setBookmarkOpen(false);
        setHighlightOpen((open) => !open);
    };

    const sectionForVerse = (verse: string) => {
        const number = Number.parseInt(verse, 10);
        return outline.find((item) => {
            const start = Number.parseInt(item.verseStart ?? '', 10);
            const end = Number.parseInt(
                item.verseEnd ?? item.verseStart ?? '',
                10,
            );
            return Number.isFinite(number) && number >= start && number <= end;
        });
    };
    const notesForVerse = (verse: string) =>
        notes.filter((note) => {
            if (
                note.anchorType === 'section' ||
                note.anchorType === 'selection'
            )
                return false;
            if (!note.verseStart) return false;
            const value = Number.parseInt(verse, 10);
            const start = Number.parseInt(note.verseStart, 10);
            const end = Number.parseInt(note.verseEnd ?? note.verseStart, 10);
            return value >= start && value <= end;
        });
    const notesForSection = (
        heading: Extract<ReadingItem, { kind: 'heading' }>,
    ) => {
        const title = inlinePlainText(heading.content);
        return notes.filter(
            (note) =>
                note.anchorType === 'section' &&
                (note.sectionKey === heading.key ||
                    (!note.sectionKey && note.sectionTitle === title)),
        );
    };
    const beginCreateNote = (anchor: NoteAnchor) => {
        if (!auth.user) {
            router.visit('/login');
            return;
        }
        const section = anchor.verseStart
            ? sectionForVerse(anchor.verseStart)
            : undefined;
        const resolvedAnchor =
            anchor.type === 'section' && section
                ? {
                      ...anchor,
                      sectionKey: section.key,
                      sectionTitle: section.title,
                      verseStart: section.verseStart,
                      verseEnd: section.verseEnd,
                  }
                : anchor;
        setEditingNote(undefined);
        setNoteOriginVerse(anchor.verseStart);
        setNoteAnchor(resolvedAnchor);
        setNoteTitle(
            anchor.type === 'selection'
                ? (section?.title ?? 'Passage note')
                : anchor.type === 'section'
                  ? (section?.title ?? 'Section note')
                  : `${book.name} ${chapter}:${anchor.verseStart}`,
        );
        setNoteTitleAutomatic(true);
        setNoteBody('');
        setNoteError(undefined);
        setNoteMode('create');
        setNoteExpanded(false);
        setNoteReferenceOpen(false);
        setNoteOpen(true);
        setPendingHighlight(undefined);
        window.getSelection()?.removeAllRanges();
    };
    const openNotesAt = (verse: string) => {
        if (!auth.user) {
            router.visit('/login');
            return;
        }
        const anchored = notesForVerse(verse);
        if (anchored.length === 0) {
            setNoteList([]);
            setNoteListAnchor(undefined);
            beginCreateNote({
                type: 'verse',
                verseStart: verse,
                verseEnd: verse,
            });
        } else {
            setNoteList(anchored);
            setNoteListAnchor({
                type: 'verse',
                verseStart: verse,
                verseEnd: verse,
            });
            setNoteMode('list');
            setNoteExpanded(false);
            setNoteReferenceOpen(false);
            setNoteOpen(true);
        }
    };
    const openNotesForSection = (
        heading: Extract<ReadingItem, { kind: 'heading' }>,
    ) => {
        if (!auth.user) {
            router.visit('/login');
            return;
        }
        const section = outline.find((item) => item.key === heading.key);
        if (!section?.verseStart) return;

        const anchor: NoteAnchor = {
            type: 'section',
            verseStart: section.verseStart,
            verseEnd: section.verseEnd,
            sectionKey: section.key,
            sectionTitle: section.title,
        };
        const anchored = notesForSection(heading);
        if (anchored.length === 0) {
            setNoteList([]);
            setNoteListAnchor(undefined);
            beginCreateNote(anchor);
            return;
        }

        setNoteList(anchored);
        setNoteListAnchor(anchor);
        setNoteMode('list');
        setNoteExpanded(false);
        setNoteReferenceOpen(false);
        setNoteOpen(true);
    };
    const updateNoteAnchorType = (type: NoteAnchorType) => {
        if (type === 'selection' || !noteOriginVerse) return;
        const section = sectionForVerse(noteOriginVerse);
        const nextAnchor: NoteAnchor =
            type === 'section' && section
                ? {
                      type,
                      verseStart: section.verseStart,
                      verseEnd: section.verseEnd,
                      sectionKey: section.key,
                      sectionTitle: section.title,
                  }
                : type === 'range'
                  ? {
                        type,
                        verseStart: noteOriginVerse,
                        verseEnd: noteOriginVerse,
                    }
                  : {
                        type: 'verse',
                        verseStart: noteOriginVerse,
                        verseEnd: noteOriginVerse,
                    };
        setNoteAnchor(nextAnchor);
        if (noteTitleAutomatic) {
            setNoteTitle(
                type === 'section' && section
                    ? section.title
                    : `${book.name} ${chapter}:${noteOriginVerse}`,
            );
        }
    };
    const updateNoteRange = (edge: 'start' | 'end', value: string) => {
        const start =
            edge === 'start' ? value : (noteAnchor.verseStart ?? value);
        const end = edge === 'end' ? value : (noteAnchor.verseEnd ?? value);
        const startIndex = verseNumbers.indexOf(start);
        const endIndex = verseNumbers.indexOf(end);
        const normalizedEnd = endIndex < startIndex ? start : end;
        setNoteAnchor({
            type: 'range',
            verseStart: start,
            verseEnd: normalizedEnd,
        });
        if (noteTitleAutomatic) {
            setNoteTitle(
                `${book.name} ${chapter}:${start}${normalizedEnd !== start ? `–${normalizedEnd}` : ''}`,
            );
        }
    };
    const saveNote = () => {
        if (!noteTitle.trim() || !noteBody.trim()) {
            setNoteError('Add a title and some note text before saving.');
            return;
        }
        const data = {
            bible_book_id: book.id,
            chapter,
            anchor_type: noteAnchor.type,
            title: noteTitle.trim(),
            body_markdown: noteBody,
            selected_text: noteAnchor.selectedText ?? null,
            section_key: noteAnchor.sectionKey ?? null,
            section_title: noteAnchor.sectionTitle ?? null,
            verse_start:
                noteAnchor.verseStart ??
                noteAnchor.segments?.[0]?.verse ??
                null,
            verse_end:
                noteAnchor.verseEnd ??
                noteAnchor.segments?.at(-1)?.verse ??
                null,
            segments: (noteAnchor.segments ?? []).map((segment) => ({
                verse: segment.verse,
                start_offset: segment.startOffset,
                end_offset: segment.endOffset,
                exact_text: segment.exactText,
                prefix: segment.prefix,
                suffix: segment.suffix,
            })),
        };
        const options = {
            preserveScroll: true,
            onStart: () => {
                setNoteProcessing(true);
                setNoteError(undefined);
            },
            onError: (errors: Record<string, string>) =>
                setNoteError(Object.values(errors)[0]),
            onSuccess: () => {
                closeNoteDrawer();
                toast.success(
                    noteMode === 'edit' ? 'Note updated' : 'Note saved',
                );
            },
            onFinish: () => setNoteProcessing(false),
        };
        if (noteMode === 'edit' && editingNote)
            router.patch(`/notes/${editingNote.id}`, data, options);
        else router.post('/notes', data, options);
    };
    const removeNote = (note: ScriptureNote) => {
        if (!window.confirm(`Delete “${note.title}”?`)) return;
        router.delete(`/notes/${note.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                closeNoteDrawer();
                toast.success('Note removed');
            },
        });
    };

    useEffect(() => {
        if (!focusedNoteId) return;
        const note = notes.find(({ id }) => id === focusedNoteId);
        if (note) beginEditNote(note, focusedNoteExpanded);
        // Open only when arriving via a focused note URL.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusedNoteExpanded, focusedNoteId]);

    const longNamePrefix = book.longName?.endsWith(book.name)
        ? book.longName.slice(0, -book.name.length).trim()
        : book.longName;
    const readerSurface =
        typography.theme === 'dark'
            ? 'bg-[#211f1b] text-[#eee8dd]'
            : typography.theme === 'sepia'
              ? 'bg-[#f3e8d3] text-[#332b22]'
              : 'bg-[#fffdf9] text-[#25221e]';
    const readerHeaderSurface =
        typography.theme === 'dark'
            ? 'border-stone-700 bg-[#211f1b]/95'
            : typography.theme === 'sepia'
              ? 'border-[#d8c8aa] bg-[#f3e8d3]/95'
              : 'border-stone-200 bg-[#fffdf9]/95';
    const readerControl = `cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--reader-accent)] ${typography.theme === 'dark' ? 'hover:bg-white/12' : 'hover:bg-black/6'}`;
    const readerBorderedControl = `${readerControl} ${typography.theme === 'dark' ? 'border-stone-600' : 'border-stone-300'}`;
    const readerMutedText =
        typography.theme === 'dark' ? 'text-stone-400' : 'text-stone-500';
    const readerDivider =
        typography.theme === 'dark'
            ? 'border-stone-700'
            : typography.theme === 'sepia'
              ? 'border-[#d8c8aa]'
              : 'border-stone-200';
    const outlineSurface =
        typography.theme === 'dark'
            ? 'border-stone-700 bg-[#292621] text-[#f3ede3]'
            : typography.theme === 'sepia'
              ? 'border-[#d1bea0] bg-[#fbf2e2] text-[#332b22]'
              : 'border-stone-200 bg-[#fffdf9] text-stone-950';
    const outlineItemHover =
        typography.theme === 'dark' ? 'hover:bg-white/8' : 'hover:bg-black/5';
    const articleFontSize = {
        small: '1.12rem',
        medium: '1.3rem',
        large: '1.5rem',
    }[typography.fontSize];
    const articleLineHeight = {
        compact: 1.38,
        comfortable: 1.52,
        relaxed: 1.72,
    }[typography.lineSpacing];
    const noteStartVerse =
        noteAnchor.verseStart ?? noteAnchor.segments?.[0]?.verse;
    const noteEndVerse =
        noteAnchor.verseEnd ??
        noteAnchor.segments?.at(-1)?.verse ??
        noteStartVerse;
    const noteReference = noteStartVerse
        ? `${book.name} ${chapter}:${noteStartVerse}${noteEndVerse && noteEndVerse !== noteStartVerse ? `–${noteEndVerse}` : ''}`
        : `${book.name} ${chapter}`;
    const notePassage = fullContent.filter((item) => {
        if (item.kind !== 'verse' || !noteStartVerse) return false;
        const value = Number.parseInt(item.number, 10);
        const start = Number.parseInt(noteStartVerse, 10);
        const end = Number.parseInt(noteEndVerse ?? noteStartVerse, 10);
        return value >= start && value <= end;
    });

    return (
        <>
            <Head title={`${book.name} ${chapter} — ${edition.name}`} />
            <div className="min-h-screen bg-[#eee9df] text-[#25221e] lg:pl-[15rem]">
                <aside className="fixed inset-y-0 left-0 z-40 hidden w-[15rem] border-r border-stone-200 lg:block">
                    <Library activeBook={book.name} />
                </aside>

                <header className="absolute top-0 right-0 left-0 z-30 flex items-center justify-between px-6 py-5 lg:left-[15rem] lg:justify-end lg:px-12">
                    <div className="lg:hidden">
                        <Brand />
                    </div>
                    <div className="flex items-center gap-5 text-stone-950">
                        <Link
                            href="/search"
                            aria-label="Search"
                            className="cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-950"
                        >
                            <Search className="size-5" />
                        </Link>
                        <div ref={editionPreferencesRef} className="relative">
                            <button
                                type="button"
                                aria-label="Edition preferences"
                                aria-expanded={editionPreferencesOpen}
                                onClick={() => {
                                    setEditionPreferencesOpen((open) => !open);
                                    setTypographyOpen(false);
                                    setOutlineOpen(false);
                                    setHighlightOpen(false);
                                }}
                                className="cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-950"
                            >
                                <MoreHorizontal className="size-5" />
                            </button>
                            {editionPreferencesOpen && (
                                <section className="absolute top-10 right-0 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-stone-200 bg-[#fffdf9] p-5 text-stone-900 shadow-[0_20px_60px_rgba(41,37,36,0.2)]">
                                    <div className="mb-5">
                                        <p className="font-serif text-xl font-semibold">
                                            {edition.abbreviation} preferences
                                        </p>
                                        <p className="mt-1 text-xs text-stone-500">
                                            Options supplied by {edition.name}
                                        </p>
                                    </div>
                                    {edition.variantProfile === 'oeb' ? (
                                        <div className="grid gap-4">
                                            <PreferenceSelect
                                                label="Spelling"
                                                value={
                                                    preferences.spelling ?? 'us'
                                                }
                                                options={[
                                                    {
                                                        value: 'cth',
                                                        label: 'Commonwealth',
                                                    },
                                                    {
                                                        value: 'us',
                                                        label: 'American',
                                                    },
                                                ]}
                                                onChange={(value) =>
                                                    updatePreference(
                                                        'spelling',
                                                        value as 'cth' | 'us',
                                                    )
                                                }
                                            />
                                            <PreferenceSelect
                                                label="Gender language"
                                                value={
                                                    preferences.gender ?? 'neut'
                                                }
                                                options={[
                                                    {
                                                        value: 'neut',
                                                        label: 'Gender neutral',
                                                    },
                                                    {
                                                        value: 'masc',
                                                        label: 'Traditional masculine',
                                                    },
                                                ]}
                                                onChange={(value) =>
                                                    updatePreference(
                                                        'gender',
                                                        value as
                                                            | 'neut'
                                                            | 'masc',
                                                    )
                                                }
                                            />
                                            <PreferenceSelect
                                                label="Versification"
                                                value={
                                                    preferences.versification ??
                                                    'nrsv'
                                                }
                                                options={[
                                                    {
                                                        value: 'nrsv',
                                                        label: 'NRSV',
                                                    },
                                                    {
                                                        value: 'jps',
                                                        label: 'JPS',
                                                    },
                                                ]}
                                                onChange={(value) =>
                                                    updatePreference(
                                                        'versification',
                                                        value as 'nrsv' | 'jps',
                                                    )
                                                }
                                            />
                                            <PreferenceSelect
                                                label="Gehenna"
                                                value={
                                                    preferences.gehenna ??
                                                    'gehenna'
                                                }
                                                options={[
                                                    {
                                                        value: 'gehenna',
                                                        label: 'Gehenna',
                                                    },
                                                    {
                                                        value: 'pit',
                                                        label: 'The Pit',
                                                    },
                                                ]}
                                                onChange={(value) =>
                                                    updatePreference(
                                                        'gehenna',
                                                        value as
                                                            | 'gehenna'
                                                            | 'pit',
                                                    )
                                                }
                                            />
                                            <PreferenceSelect
                                                label="Ioudaioi"
                                                value={
                                                    preferences.ioudaioi ??
                                                    'ioudaioi'
                                                }
                                                options={[
                                                    {
                                                        value: 'ioudaioi',
                                                        label: 'Contextual',
                                                    },
                                                    {
                                                        value: 'jew',
                                                        label: 'The Jews',
                                                    },
                                                ]}
                                                onChange={(value) =>
                                                    updatePreference(
                                                        'ioudaioi',
                                                        value as
                                                            | 'ioudaioi'
                                                            | 'jew',
                                                    )
                                                }
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-sm text-stone-500">
                                            This edition has no additional text
                                            preferences.
                                        </p>
                                    )}
                                </section>
                            )}
                        </div>
                    </div>
                </header>

                <section className="relative h-[30rem] overflow-hidden lg:h-[25.5rem]">
                    {chapterArtwork ? (
                        <div
                            ref={heroArtworkRef}
                            className="absolute inset-x-0 -top-[18%] -bottom-[18%] will-change-transform"
                        >
                            <img
                                src={chapterArtwork.imageUrl}
                                alt={chapterArtwork.altText}
                                className="size-full object-cover"
                                style={{ objectPosition: imagePosition }}
                            />
                        </div>
                    ) : (
                        <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-[#d9c9a9]"
                            style={{
                                backgroundImage:
                                    'radial-gradient(circle at 78% 22%, rgba(49, 69, 54, 0.76), transparent 27%), radial-gradient(circle at 67% 78%, rgba(118, 105, 65, 0.54), transparent 34%), linear-gradient(118deg, #f2e5cd 0%, #d8c7a5 48%, #74806a 100%)',
                            }}
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#f5ead5]/95 via-[#f5ead5]/38 to-transparent" />
                    <div
                        ref={heroTextRef}
                        className="absolute inset-x-0 bottom-14 z-10 px-7 will-change-transform sm:px-12 lg:bottom-12 lg:px-[3.4rem]"
                    >
                        <p className="max-w-52 text-[0.72rem] font-semibold tracking-[0.3em] uppercase">
                            {longNamePrefix ?? book.name}
                        </p>
                        <h1 className="mt-2 font-serif text-[4.4rem] leading-none font-semibold tracking-[-0.04em] lg:text-[4.8rem]">
                            {book.name}
                        </h1>
                        <div className="mt-5 h-0.5 w-16 bg-[#bd6b32]" />
                        <p className="mt-4 font-serif text-xl">
                            Chapter {chapter}
                        </p>
                    </div>
                </section>

                <main
                    className={`relative z-20 -mt-7 min-h-screen rounded-t-[2rem] shadow-[0_-8px_30px_rgba(62,49,30,0.06)] lg:rounded-t-[1.8rem] ${readerSurface}`}
                    style={
                        {
                            '--reader-accent':
                                typography.theme === 'dark'
                                    ? '#f29a5a'
                                    : '#b85c26',
                        } as CSSProperties
                    }
                >
                    <div className="mx-auto max-w-[52rem] px-7 pb-24 sm:px-12 lg:px-14">
                        <div
                            className={`sticky top-0 z-20 flex h-[5.4rem] items-center justify-between border-b backdrop-blur ${readerHeaderSurface}`}
                        >
                            <div className="flex items-center gap-3">
                                <Link
                                    href={`/books/${edition.slug}/${book.code}`}
                                    aria-label={`Back to ${book.name} overview`}
                                    className={`grid size-9 place-items-center rounded-full ${readerControl}`}
                                >
                                    <ArrowLeft className="size-5" />
                                </Link>
                                <CustomSelect
                                    label="Chapter"
                                    value={chapter}
                                    onChange={changeChapter}
                                    options={chapters.map((number) => ({
                                        value: number,
                                        label: `${book.name} ${number}`,
                                    }))}
                                    theme={typography.theme}
                                    variant="inline"
                                    className="font-serif text-lg font-semibold"
                                    triggerClassName="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--reader-accent)] focus-visible:ring-0"
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    aria-label="Previous chapter"
                                    disabled={chapterIndex <= 0}
                                    onClick={() =>
                                        changeChapter(
                                            chapters[chapterIndex - 1]!,
                                        )
                                    }
                                    className={`grid size-9 place-items-center rounded-full border disabled:cursor-not-allowed disabled:opacity-35 sm:size-10 ${readerBorderedControl}`}
                                >
                                    <ArrowLeft className="size-4" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Next chapter"
                                    disabled={
                                        chapterIndex === -1 ||
                                        chapterIndex >= chapters.length - 1
                                    }
                                    onClick={() =>
                                        changeChapter(
                                            chapters[chapterIndex + 1]!,
                                        )
                                    }
                                    className={`grid size-9 place-items-center rounded-full border disabled:cursor-not-allowed disabled:opacity-35 sm:size-10 ${readerBorderedControl}`}
                                >
                                    <ArrowRight className="size-4" />
                                </button>
                                <div ref={typographyRef} className="relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTypographyOpen((open) => !open);
                                            setEditionPreferencesOpen(false);
                                            setOutlineOpen(false);
                                            setHighlightOpen(false);
                                        }}
                                        aria-label="Typography settings"
                                        aria-expanded={typographyOpen}
                                        className={`grid size-11 place-items-center rounded-full ${readerControl}`}
                                    >
                                        <span className="font-serif text-lg font-medium">
                                            Aa
                                        </span>
                                    </button>
                                    {typographyOpen && (
                                        <section className="absolute top-12 right-0 z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-stone-200 bg-[#fffdf9] p-5 font-sans text-stone-900 shadow-[0_20px_60px_rgba(41,37,36,0.2)]">
                                            <p className="mb-5 font-serif text-xl font-semibold">
                                                Reading appearance
                                            </p>
                                            <div className="grid gap-5">
                                                <TypographyChoice
                                                    label="Text size"
                                                    value={typography.fontSize}
                                                    options={[
                                                        {
                                                            value: 'small',
                                                            label: 'Small',
                                                        },
                                                        {
                                                            value: 'medium',
                                                            label: 'Medium',
                                                        },
                                                        {
                                                            value: 'large',
                                                            label: 'Large',
                                                        },
                                                    ]}
                                                    onChange={(value) =>
                                                        updateTypography(
                                                            'fontSize',
                                                            value,
                                                        )
                                                    }
                                                />
                                                <TypographyChoice
                                                    label="Line spacing"
                                                    value={
                                                        typography.lineSpacing
                                                    }
                                                    options={[
                                                        {
                                                            value: 'compact',
                                                            label: 'Compact',
                                                        },
                                                        {
                                                            value: 'comfortable',
                                                            label: 'Comfortable',
                                                        },
                                                        {
                                                            value: 'relaxed',
                                                            label: 'Relaxed',
                                                        },
                                                    ]}
                                                    onChange={(value) =>
                                                        updateTypography(
                                                            'lineSpacing',
                                                            value,
                                                        )
                                                    }
                                                />
                                                <TypographyChoice
                                                    label="Reading mode"
                                                    value={typography.theme}
                                                    options={[
                                                        {
                                                            value: 'light',
                                                            label: 'Light',
                                                        },
                                                        {
                                                            value: 'sepia',
                                                            label: 'Sepia',
                                                        },
                                                        {
                                                            value: 'dark',
                                                            label: 'Dark',
                                                        },
                                                    ]}
                                                    onChange={(value) =>
                                                        updateTypography(
                                                            'theme',
                                                            value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </section>
                                    )}
                                </div>
                                <div ref={outlineRef} className="relative">
                                    <button
                                        type="button"
                                        aria-label="Chapter outline"
                                        aria-expanded={outlineOpen}
                                        onClick={() => {
                                            setOutlineOpen((open) => !open);
                                            setTypographyOpen(false);
                                            setEditionPreferencesOpen(false);
                                            setHighlightOpen(false);
                                        }}
                                        className={`hidden size-11 place-items-center rounded-full sm:grid ${readerControl}`}
                                    >
                                        <List className="size-5" />
                                    </button>
                                    {outlineOpen && (
                                        <section
                                            aria-labelledby="chapter-outline-title"
                                            className={`absolute top-12 right-0 z-50 w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border font-sans shadow-[0_20px_60px_rgba(41,37,36,0.22)] ${outlineSurface}`}
                                        >
                                            <div
                                                className={`flex items-start justify-between border-b px-5 py-4 ${readerDivider}`}
                                            >
                                                <div>
                                                    <h2
                                                        id="chapter-outline-title"
                                                        className="font-serif text-xl font-semibold"
                                                    >
                                                        Chapter outline
                                                    </h2>
                                                    <p
                                                        className={`mt-1 text-xs ${readerMutedText}`}
                                                    >
                                                        {book.name} · Chapter{' '}
                                                        {chapter}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    aria-label="Close chapter outline"
                                                    onClick={() =>
                                                        setOutlineOpen(false)
                                                    }
                                                    className={`grid size-9 cursor-pointer place-items-center rounded-full ${readerControl}`}
                                                >
                                                    <X className="size-4" />
                                                </button>
                                            </div>
                                            <div className="max-h-[min(30rem,60vh)] overflow-y-auto p-2">
                                                {outline.length ? (
                                                    outline.map((section) => {
                                                        const verseRange =
                                                            section.verseStart &&
                                                            section.verseEnd
                                                                ? section.verseStart ===
                                                                  section.verseEnd
                                                                    ? section.verseStart
                                                                    : `${section.verseStart}–${section.verseEnd}`
                                                                : undefined;

                                                        return (
                                                            <button
                                                                key={
                                                                    section.key
                                                                }
                                                                type="button"
                                                                onClick={() =>
                                                                    navigateToSection(
                                                                        section.key,
                                                                    )
                                                                }
                                                                className={`grid w-full cursor-pointer grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-3 rounded-xl px-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--reader-accent)] ${outlineItemHover}`}
                                                            >
                                                                <span
                                                                    className={`pt-0.5 text-xs tabular-nums ${readerMutedText}`}
                                                                >
                                                                    {verseRange
                                                                        ? `vv. ${verseRange}`
                                                                        : '—'}
                                                                </span>
                                                                <span className="font-serif text-base leading-snug font-semibold">
                                                                    {
                                                                        section.title
                                                                    }
                                                                </span>
                                                            </button>
                                                        );
                                                    })
                                                ) : (
                                                    <p
                                                        className={`px-3 py-6 text-sm ${readerMutedText}`}
                                                    >
                                                        No section headings are
                                                        available for this
                                                        chapter.
                                                    </p>
                                                )}
                                            </div>
                                        </section>
                                    )}
                                </div>
                                <div ref={highlightRef} className="relative">
                                    <button
                                        type="button"
                                        aria-label={
                                            highlights.length
                                                ? `${highlights.length} highlights in this chapter`
                                                : 'Highlights'
                                        }
                                        aria-expanded={highlightOpen}
                                        onPointerDown={(event) => {
                                            if (pendingHighlight)
                                                event.preventDefault();
                                        }}
                                        onClick={openHighlights}
                                        className={`relative grid size-11 place-items-center rounded-full ${readerControl}`}
                                    >
                                        {highlights.length ? (
                                            <FilledHighlighter className="size-5" />
                                        ) : (
                                            <Highlighter className="size-5" />
                                        )}
                                        {highlights.length > 0 && (
                                            <span className="absolute top-0 right-0 grid size-4 place-items-center rounded-full bg-[var(--reader-accent)] font-sans text-[0.62rem] font-bold text-white">
                                                {highlights.length}
                                            </span>
                                        )}
                                    </button>

                                    {highlightOpen && (
                                        <section
                                            aria-labelledby="highlights-panel-title"
                                            className={`absolute top-12 right-0 z-50 w-[min(25rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border font-sans shadow-[0_20px_60px_rgba(41,37,36,0.22)] ${outlineSurface}`}
                                        >
                                            <div
                                                className={`flex items-start justify-between border-b px-5 py-4 ${readerDivider}`}
                                            >
                                                <div>
                                                    <h2
                                                        id="highlights-panel-title"
                                                        className="font-serif text-xl font-semibold"
                                                    >
                                                        {pendingHighlight
                                                            ? 'Highlight selection'
                                                            : 'Highlights'}
                                                    </h2>
                                                    <p
                                                        className={`mt-1 text-xs ${readerMutedText}`}
                                                    >
                                                        {book.name} · Chapter{' '}
                                                        {chapter}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    aria-label="Close highlights"
                                                    onClick={() =>
                                                        setHighlightOpen(false)
                                                    }
                                                    className={`grid size-9 cursor-pointer place-items-center rounded-full ${readerControl}`}
                                                >
                                                    <X className="size-4" />
                                                </button>
                                            </div>

                                            {pendingHighlight && (
                                                <div
                                                    className={`border-b p-5 ${readerDivider}`}
                                                >
                                                    <p className="line-clamp-3 font-serif text-sm italic">
                                                        “
                                                        {
                                                            pendingHighlight.selectedText
                                                        }
                                                        ”
                                                    </p>
                                                    <p
                                                        className={`mt-4 text-xs font-semibold tracking-[0.16em] uppercase ${readerMutedText}`}
                                                    >
                                                        Choose a colour to save
                                                    </p>
                                                    <div className="mt-3 flex gap-3">
                                                        {highlightColors.map(
                                                            (color) => (
                                                                <button
                                                                    key={
                                                                        color.value
                                                                    }
                                                                    type="button"
                                                                    disabled={
                                                                        highlightProcessing
                                                                    }
                                                                    onPointerDown={(
                                                                        event,
                                                                    ) =>
                                                                        event.preventDefault()
                                                                    }
                                                                    onClick={() =>
                                                                        saveHighlight(
                                                                            color.value,
                                                                        )
                                                                    }
                                                                    aria-label={`Save as ${color.label}`}
                                                                    className={`size-9 rounded-full border-2 border-white shadow-sm ring-1 ring-black/20 transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--reader-accent)] disabled:opacity-50 ${color.className}`}
                                                                />
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="max-h-[min(27rem,55vh)] overflow-y-auto p-2">
                                                {highlights.length ? (
                                                    highlights.map(
                                                        (highlight) => {
                                                            const first =
                                                                highlight
                                                                    .segments[0];
                                                            const last =
                                                                highlight.segments.at(
                                                                    -1,
                                                                );
                                                            const reference =
                                                                first?.verse ===
                                                                last?.verse
                                                                    ? `${book.name} ${chapter}:${first?.verse}`
                                                                    : `${book.name} ${chapter}:${first?.verse}–${last?.verse}`;

                                                            return (
                                                                <article
                                                                    key={
                                                                        highlight.id
                                                                    }
                                                                    className={`rounded-xl p-3 ${outlineItemHover}`}
                                                                >
                                                                    <p className="line-clamp-2 font-serif text-sm leading-relaxed">
                                                                        “
                                                                        {
                                                                            highlight.selectedText
                                                                        }
                                                                        ”
                                                                    </p>
                                                                    <div className="mt-3 flex items-center gap-2">
                                                                        <span
                                                                            className={`mr-auto text-xs ${readerMutedText}`}
                                                                        >
                                                                            {
                                                                                reference
                                                                            }
                                                                        </span>
                                                                        {highlightColors.map(
                                                                            (
                                                                                color,
                                                                            ) => (
                                                                                <button
                                                                                    key={
                                                                                        color.value
                                                                                    }
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        updateHighlightColor(
                                                                                            highlight,
                                                                                            color.value,
                                                                                        )
                                                                                    }
                                                                                    aria-label={`Change to ${color.label}`}
                                                                                    aria-pressed={
                                                                                        highlight.color ===
                                                                                        color.value
                                                                                    }
                                                                                    className={`size-5 rounded-full ${color.className} ${highlight.color === color.value ? 'ring-2 ring-[var(--reader-accent)] ring-offset-2' : 'ring-1 ring-black/20'}`}
                                                                                />
                                                                            ),
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                removeHighlight(
                                                                                    highlight,
                                                                                )
                                                                            }
                                                                            aria-label={`Remove highlight: ${highlight.selectedText}`}
                                                                            className="ml-1 grid size-7 place-items-center rounded-full text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/50"
                                                                        >
                                                                            <Trash2 className="size-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </article>
                                                            );
                                                        },
                                                    )
                                                ) : (
                                                    <p
                                                        className={`px-3 py-6 text-center text-sm leading-6 ${readerMutedText}`}
                                                    >
                                                        Select words in the
                                                        reading text, then
                                                        choose a colour to save
                                                        your first highlight.
                                                    </p>
                                                )}
                                            </div>
                                        </section>
                                    )}
                                </div>
                                <div ref={bookmarkRef} className="relative">
                                    <button
                                        type="button"
                                        aria-label={
                                            bookmarks.length
                                                ? `${bookmarks.length} bookmarks in this chapter`
                                                : 'Save a passage'
                                        }
                                        aria-expanded={bookmarkOpen}
                                        onClick={openBookmarks}
                                        className={`relative grid size-11 place-items-center rounded-full ${readerControl}`}
                                    >
                                        <Bookmark
                                            className={`size-5 ${bookmarks.length ? 'fill-current' : ''}`}
                                        />
                                        {bookmarks.length > 1 && (
                                            <span className="absolute top-0 right-0 grid size-4 place-items-center rounded-full bg-[var(--reader-accent)] font-sans text-[0.62rem] font-bold text-white">
                                                {bookmarks.length}
                                            </span>
                                        )}
                                    </button>

                                    {bookmarkOpen && (
                                        <section
                                            aria-labelledby="bookmark-panel-title"
                                            className={`absolute top-12 right-0 z-50 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border font-sans shadow-[0_20px_60px_rgba(41,37,36,0.22)] ${outlineSurface}`}
                                        >
                                            <div
                                                className={`flex items-start justify-between border-b px-5 py-4 ${readerDivider}`}
                                            >
                                                <div>
                                                    <h2
                                                        id="bookmark-panel-title"
                                                        className="font-serif text-xl font-semibold"
                                                    >
                                                        {bookmarkMode === 'list'
                                                            ? `Bookmarks in ${book.name} ${chapter}`
                                                            : bookmarkMode ===
                                                                'edit'
                                                              ? 'Edit bookmark'
                                                              : 'Save passage'}
                                                    </h2>
                                                    {bookmarkMode !==
                                                        'list' && (
                                                        <p
                                                            className={`mt-1 text-xs ${readerMutedText}`}
                                                        >
                                                            {book.name} ·
                                                            Chapter {chapter}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    aria-label="Close bookmarks"
                                                    onClick={() =>
                                                        setBookmarkOpen(false)
                                                    }
                                                    className={`grid size-9 place-items-center rounded-full ${readerControl}`}
                                                >
                                                    <X className="size-4" />
                                                </button>
                                            </div>

                                            {bookmarkMode === 'list' ? (
                                                <div className="max-h-[min(30rem,65vh)] overflow-y-auto p-3">
                                                    <div className="grid gap-2">
                                                        {bookmarks.map(
                                                            (bookmark) => (
                                                                <article
                                                                    key={
                                                                        bookmark.id
                                                                    }
                                                                    className={`rounded-xl border p-4 ${readerDivider}`}
                                                                >
                                                                    <p className="font-serif text-base font-semibold">
                                                                        {bookmark.title ||
                                                                            bookmarkReference(
                                                                                bookmark,
                                                                            )}
                                                                    </p>
                                                                    <p
                                                                        className={`mt-1 text-xs ${readerMutedText}`}
                                                                    >
                                                                        {bookmarkReference(
                                                                            bookmark,
                                                                        )}
                                                                    </p>
                                                                    <div className="mt-3 flex gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                beginEditBookmark(
                                                                                    bookmark,
                                                                                )
                                                                            }
                                                                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${outlineItemHover}`}
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                removeBookmark(
                                                                                    bookmark,
                                                                                )
                                                                            }
                                                                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    </div>
                                                                </article>
                                                            ),
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={
                                                            beginCreateBookmark
                                                        }
                                                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-positive px-4 py-3 text-sm font-semibold text-positive-foreground hover:bg-positive-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-positive"
                                                    >
                                                        <Plus className="size-4" />
                                                        Save another passage
                                                    </button>
                                                    <Link
                                                        href="/bookmarks"
                                                        className={`mt-2 block rounded-lg py-2 text-center text-xs font-semibold ${readerMutedText}`}
                                                    >
                                                        View all bookmarks
                                                    </Link>
                                                </div>
                                            ) : (
                                                <div className="grid gap-4 p-5">
                                                    <label className="grid gap-1.5 text-xs font-semibold tracking-wide uppercase">
                                                        <span
                                                            className={
                                                                readerMutedText
                                                            }
                                                        >
                                                            Title{' '}
                                                            <span className="normal-case">
                                                                (optional)
                                                            </span>
                                                        </span>
                                                        <input
                                                            value={
                                                                bookmarkTitle
                                                            }
                                                            onChange={(event) =>
                                                                setBookmarkTitle(
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            maxLength={120}
                                                            placeholder={`${book.name} ${chapter}`}
                                                            className={`rounded-xl border bg-transparent px-3 py-2.5 text-sm font-normal tracking-normal normal-case outline-none focus:border-[var(--reader-accent)] focus:ring-2 focus:ring-[var(--reader-accent)]/20 ${readerDivider}`}
                                                        />
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="grid gap-1.5 text-xs font-semibold tracking-wide uppercase">
                                                            <span
                                                                className={
                                                                    readerMutedText
                                                                }
                                                            >
                                                                From verse
                                                            </span>
                                                            <CustomSelect
                                                                label="From verse"
                                                                value={
                                                                    bookmarkVerseStart
                                                                }
                                                                onChange={(
                                                                    value,
                                                                ) => {
                                                                    setBookmarkVerseStart(
                                                                        value,
                                                                    );
                                                                    if (!value)
                                                                        setBookmarkVerseEnd(
                                                                            '',
                                                                        );
                                                                    else if (
                                                                        !bookmarkVerseEnd
                                                                    )
                                                                        setBookmarkVerseEnd(
                                                                            value,
                                                                        );
                                                                }}
                                                                options={[
                                                                    {
                                                                        value: '',
                                                                        label: 'Whole chapter',
                                                                    },
                                                                    ...verseNumbers.map(
                                                                        (
                                                                            verse,
                                                                        ) => ({
                                                                            value: verse,
                                                                            label: verse,
                                                                        }),
                                                                    ),
                                                                ]}
                                                                theme={
                                                                    typography.theme
                                                                }
                                                                triggerClassName="text-sm font-normal tracking-normal normal-case"
                                                            />
                                                        </div>
                                                        <div className="grid gap-1.5 text-xs font-semibold tracking-wide uppercase">
                                                            <span
                                                                className={
                                                                    readerMutedText
                                                                }
                                                            >
                                                                To verse
                                                            </span>
                                                            <CustomSelect
                                                                label="To verse"
                                                                value={
                                                                    bookmarkVerseEnd
                                                                }
                                                                disabled={
                                                                    !bookmarkVerseStart
                                                                }
                                                                onChange={(
                                                                    value,
                                                                ) =>
                                                                    setBookmarkVerseEnd(
                                                                        value,
                                                                    )
                                                                }
                                                                options={verseNumbers.map(
                                                                    (
                                                                        verse,
                                                                    ) => ({
                                                                        value: verse,
                                                                        label: verse,
                                                                    }),
                                                                )}
                                                                theme={
                                                                    typography.theme
                                                                }
                                                                triggerClassName="text-sm font-normal tracking-normal normal-case"
                                                            />
                                                        </div>
                                                    </div>
                                                    {bookmarkError && (
                                                        <p
                                                            role="alert"
                                                            className="text-sm text-red-700"
                                                        >
                                                            {bookmarkError}
                                                        </p>
                                                    )}
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                bookmarkProcessing
                                                            }
                                                            onClick={
                                                                saveBookmark
                                                            }
                                                            className="flex-1 rounded-xl bg-positive px-4 py-3 text-sm font-semibold text-positive-foreground hover:bg-positive-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-positive disabled:opacity-60"
                                                        >
                                                            {bookmarkProcessing
                                                                ? 'Saving…'
                                                                : bookmarkMode ===
                                                                    'edit'
                                                                  ? 'Save changes'
                                                                  : 'Save bookmark'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                bookmarks.length >
                                                                1
                                                                    ? setBookmarkMode(
                                                                          'list',
                                                                      )
                                                                    : setBookmarkOpen(
                                                                          false,
                                                                      )
                                                            }
                                                            className={`rounded-xl px-4 py-3 text-sm font-semibold ${outlineItemHover}`}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                    {bookmarkMode === 'edit' &&
                                                        editingBookmark && (
                                                            <div className="grid gap-2 border-t border-[var(--reader-border)] pt-4 sm:grid-cols-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={
                                                                        beginCreateBookmark
                                                                    }
                                                                    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${outlineItemHover}`}
                                                                >
                                                                    <Plus className="size-4" />
                                                                    Save another
                                                                    passage
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removeBookmark(
                                                                            editingBookmark,
                                                                        )
                                                                    }
                                                                    className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 dark:text-red-300 dark:hover:bg-red-950/50"
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                    Remove
                                                                    bookmark
                                                                </button>
                                                            </div>
                                                        )}
                                                </div>
                                            )}
                                        </section>
                                    )}
                                </div>
                            </div>
                        </div>

                        {focusedBookmark?.verseStart && (
                            <div
                                className={`flex flex-col gap-3 border-b px-1 py-4 sm:flex-row sm:items-center sm:justify-between ${readerDivider}`}
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--reader-accent)_14%,transparent)] text-[var(--reader-accent)]">
                                        <Bookmark className="size-4 fill-current" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate font-serif font-semibold">
                                            {focusedBookmark.title ||
                                                bookmarkReference(
                                                    focusedBookmark,
                                                )}
                                        </p>
                                        <p
                                            className={`font-sans text-xs ${readerMutedText}`}
                                        >
                                            {bookmarkReference(focusedBookmark)}
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href={`/read/${edition.slug}/${book.code}/${chapter}`}
                                    className={`inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full border px-4 py-2 font-sans text-sm font-semibold sm:self-auto ${readerBorderedControl}`}
                                >
                                    <BookOpen className="size-4" />
                                    Read full chapter
                                </Link>
                            </div>
                        )}

                        <article
                            ref={readerArticleRef}
                            className="pt-8 font-serif"
                            style={{
                                fontSize: articleFontSize,
                                lineHeight: articleLineHeight,
                            }}
                        >
                            {loadError && (
                                <p className="rounded-xl bg-red-50 p-4 font-sans text-sm text-red-800">
                                    {loadError}
                                </p>
                            )}
                            {!document && !loadError && (
                                <p
                                    className={`font-sans text-sm ${readerMutedText}`}
                                >
                                    Preparing the text…
                                </p>
                            )}
                            {content.map((item, index) =>
                                item.kind === 'heading' ? (
                                    <div
                                        key={item.key}
                                        id={`section-${item.key}`}
                                        className={`group/section flex scroll-mt-[6.5rem] items-center justify-between gap-3 ${index ? `mt-12 border-t pt-7 ${readerDivider}` : ''} mb-4`}
                                    >
                                        <h2
                                            className={`font-sans text-[0.68rem] font-semibold tracking-[0.29em] uppercase ${readerMutedText}`}
                                        >
                                            {renderInlineSequence(item.content)}
                                        </h2>
                                        {notesForSection(item).length > 0 && (
                                            <NoteMarker
                                                notes={notesForSection(item)}
                                                variant="section"
                                                onClick={() =>
                                                    openNotesForSection(item)
                                                }
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        key={item.key}
                                        className="group/verse grid grid-cols-[4.5rem_1.5rem_minmax(0,1fr)_2.75rem] items-start gap-x-2 py-1.5"
                                    >
                                        <span>
                                            {item.number === '1' && (
                                                <span
                                                    className={`-mt-1 block font-serif leading-none text-[var(--reader-accent)] ${chapter.length >= 3 ? 'text-[2.75rem]' : 'text-[3.5rem]'}`}
                                                >
                                                    {chapter}
                                                </span>
                                            )}
                                        </span>
                                        <span
                                            className={`pt-1 text-right text-sm tabular-nums ${readerMutedText}`}
                                        >
                                            {item.number}
                                        </span>
                                        <p data-verse-number={item.number}>
                                            {renderInlineSequence(item.content)}
                                        </p>
                                        <NoteMarker
                                            notes={notesForVerse(item.number)}
                                            onClick={() =>
                                                openNotesAt(item.number)
                                            }
                                        />
                                    </div>
                                ),
                            )}
                        </article>
                    </div>
                </main>

                {noteOpen && (
                    <>
                        <button
                            type="button"
                            aria-label="Close note drawer"
                            onClick={closeNoteDrawer}
                            className={`fixed inset-0 z-[75] cursor-default bg-black/20 transition-[opacity,backdrop-filter] duration-300 motion-reduce:transition-none ${noteClosing ? 'opacity-0' : 'opacity-100'}`}
                            style={{
                                backdropFilter: noteClosing
                                    ? 'blur(0px) grayscale(0%)'
                                    : 'blur(2px) grayscale(55%)',
                            }}
                        />
                        <aside
                            aria-label="Notes"
                            className={`fixed inset-y-0 left-0 z-[80] flex w-full animate-in flex-col border-r border-stone-200 bg-[#fffdf9] text-stone-900 shadow-[18px_0_60px_rgba(30,25,20,0.22)] transition-[transform,max-width] duration-300 ease-out slide-in-from-left motion-reduce:transition-none ${noteExpanded ? 'max-w-none' : 'max-w-[440px]'} ${noteClosing ? '-translate-x-full' : 'translate-x-0'}`}
                        >
                            <header
                                className={`border-b border-stone-200 ${noteExpanded ? 'px-5 py-4 md:px-10 lg:px-16' : 'px-5 py-4'}`}
                            >
                                <div
                                    className={`flex items-center justify-between ${noteExpanded ? 'mx-auto w-full max-w-5xl' : ''}`}
                                >
                                    <div>
                                        <p className="font-sans text-[0.65rem] font-semibold tracking-[0.22em] text-[#9a5428] uppercase">
                                            {book.name} {chapter}
                                        </p>
                                        <h2 className="mt-1 font-serif text-2xl">
                                            {noteMode === 'list'
                                                ? `${noteList.length} ${noteList.length === 1 ? 'note' : 'notes'} here`
                                                : noteMode === 'edit'
                                                  ? 'Edit note'
                                                  : 'New note'}
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {noteMode !== 'list' && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setNoteReferenceOpen(
                                                            (open) => !open,
                                                        )
                                                    }
                                                    className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full px-3 font-sans text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-2 focus-visible:outline-[#9a5428]"
                                                    aria-expanded={
                                                        noteReferenceOpen
                                                    }
                                                    aria-controls="note-scripture-reference"
                                                >
                                                    <BookOpen className="size-4" />
                                                    <span className="hidden sm:inline">
                                                        View passage
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setNoteExpanded(
                                                            (expanded) =>
                                                                !expanded,
                                                        );
                                                        setNoteReferenceOpen(
                                                            false,
                                                        );
                                                    }}
                                                    className="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#9a5428]"
                                                    aria-label={
                                                        noteExpanded
                                                            ? 'Exit fullscreen writing'
                                                            : 'Expand writing area'
                                                    }
                                                    title={
                                                        noteExpanded
                                                            ? 'Exit fullscreen'
                                                            : 'Write fullscreen'
                                                    }
                                                >
                                                    {noteExpanded ? (
                                                        <Minimize2 className="size-5" />
                                                    ) : (
                                                        <Maximize2 className="size-5" />
                                                    )}
                                                </button>
                                            </>
                                        )}
                                        <button
                                            type="button"
                                            onClick={closeNoteDrawer}
                                            className="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#9a5428]"
                                            aria-label="Close notes"
                                        >
                                            <X className="size-5" />
                                        </button>
                                    </div>
                                </div>
                            </header>

                            {noteReferenceOpen && noteMode !== 'list' && (
                                <section
                                    id="note-scripture-reference"
                                    className={`z-10 border-b border-stone-200 bg-[#f7efe3] shadow-[0_18px_45px_rgba(60,45,30,0.13)] ${noteExpanded ? 'absolute top-[89px] right-6 w-[min(28rem,calc(100%-3rem))] rounded-2xl border md:right-10' : ''}`}
                                    aria-label={`Passage: ${noteReference}`}
                                >
                                    <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
                                        <div>
                                            <p className="font-sans text-[0.62rem] font-semibold tracking-[0.2em] text-[#9a5428] uppercase">
                                                Attached passage
                                            </p>
                                            <h3 className="mt-1 font-serif text-lg font-semibold">
                                                {noteAnchor.sectionTitle ??
                                                    noteReference}
                                            </h3>
                                            {noteAnchor.sectionTitle && (
                                                <p className="mt-0.5 font-sans text-xs text-stone-500">
                                                    {noteReference}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setNoteReferenceOpen(false)
                                            }
                                            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#9a5428]"
                                            aria-label="Close passage"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </div>
                                    <div className="max-h-[45vh] overflow-y-auto border-t border-[#dfcdb7] px-5 py-4 font-serif text-[0.98rem] leading-7 text-stone-700">
                                        {noteAnchor.selectedText ? (
                                            <blockquote className="border-l-2 border-[#b66b36] pl-4 italic">
                                                “{noteAnchor.selectedText}”
                                            </blockquote>
                                        ) : notePassage.length ? (
                                            <div className="grid gap-3">
                                                {notePassage.map((item) =>
                                                    item.kind === 'verse' ? (
                                                        <p
                                                            key={item.key}
                                                            className="grid grid-cols-[1.75rem_1fr] gap-2"
                                                        >
                                                            <span className="pt-0.5 font-sans text-xs text-[#9a5428]">
                                                                {item.number}
                                                            </span>
                                                            <span>
                                                                {renderInlineSequence(
                                                                    item.content,
                                                                )}
                                                            </span>
                                                        </p>
                                                    ) : null,
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-stone-500 italic">
                                                The attached passage will appear
                                                here once selected.
                                            </p>
                                        )}
                                    </div>
                                </section>
                            )}

                            {noteMode === 'list' ? (
                                <div className="flex-1 overflow-y-auto p-5">
                                    <p className="mb-4 font-serif text-sm leading-6 text-stone-500">
                                        {noteList.length === 1
                                            ? 'A note is attached here. Open it to read or edit, or create another note at the same location.'
                                            : 'Several notes are attached here. Choose one to read or edit, or create another at the same location.'}
                                    </p>
                                    <div className="grid gap-3">
                                        {noteList.map((note) => (
                                            <article
                                                key={note.id}
                                                className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50/70 transition hover:border-[#c99d78] hover:bg-[#fbf5eb]"
                                            >
                                                <div className="p-4">
                                                    <h3 className="font-serif text-lg font-semibold">
                                                        {note.title}
                                                    </h3>
                                                    {note.selectedText && (
                                                        <p className="mt-2 border-l-2 border-[#c99d78] pl-3 font-serif text-sm text-stone-500 italic">
                                                            “{note.selectedText}
                                                            ”
                                                        </p>
                                                    )}
                                                    <p className="mt-2 line-clamp-3 font-serif text-sm leading-6 text-stone-600">
                                                        {notePreview(
                                                            note.bodyMarkdown,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="note-card-actions flex items-center justify-end border-t border-stone-200 px-3 py-2">
                                                    <Link
                                                        href={`/notes/${note.id}`}
                                                        className="note-card-action inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 font-serif text-sm font-semibold text-stone-700 hover:bg-white hover:text-stone-950 focus-visible:bg-white focus-visible:outline-2 focus-visible:outline-[#9a5428]"
                                                    >
                                                        <BookOpen className="size-4" />
                                                        Read
                                                    </Link>
                                                    <span
                                                        aria-hidden="true"
                                                        className="note-card-action-separator mx-1 h-5 w-px bg-stone-300"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            beginEditNote(note)
                                                        }
                                                        className="note-card-action inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 font-serif text-sm font-semibold text-stone-700 hover:bg-white hover:text-stone-950 focus-visible:bg-white focus-visible:outline-2 focus-visible:outline-[#9a5428]"
                                                    >
                                                        <Pencil className="size-4" />
                                                        Edit
                                                    </button>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            noteListAnchor &&
                                            beginCreateNote(noteListAnchor)
                                        }
                                        disabled={!noteListAnchor}
                                        className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full bg-positive px-5 py-2.5 font-serif text-sm font-semibold text-positive-foreground hover:bg-positive-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-positive"
                                    >
                                        <Plus className="size-4" /> Create note
                                    </button>
                                </div>
                            ) : (
                                <div
                                    className={`flex-1 overflow-y-auto ${noteExpanded ? 'px-5 py-8 md:px-10 lg:px-16' : 'px-5 py-5'}`}
                                >
                                    <div
                                        className={
                                            noteExpanded
                                                ? 'mx-auto w-full max-w-5xl'
                                                : ''
                                        }
                                    >
                                        {noteAnchor.selectedText && (
                                            <blockquote className="mb-5 border-l-2 border-[#b66b36] bg-[#f7efe3] px-4 py-3 font-serif text-sm leading-6 text-stone-600">
                                                “{noteAnchor.selectedText}”
                                            </blockquote>
                                        )}
                                        <div
                                            className={
                                                noteExpanded
                                                    ? 'mb-6 grid gap-5 md:grid-cols-[15rem_minmax(0,1fr)] md:items-end'
                                                    : ''
                                            }
                                        >
                                            {noteAnchor.type !==
                                                'selection' && (
                                                <div
                                                    className={`${noteExpanded ? '' : 'mb-4'} grid gap-1.5 font-sans text-xs font-semibold tracking-wide text-stone-500 uppercase`}
                                                >
                                                    <span>Attach to</span>
                                                    <CustomSelect
                                                        label="Attach to"
                                                        value={noteAnchor.type}
                                                        onChange={(value) =>
                                                            updateNoteAnchorType(
                                                                value as NoteAnchorType,
                                                            )
                                                        }
                                                        options={[
                                                            {
                                                                value: 'verse',
                                                                label: 'This verse',
                                                            },
                                                            {
                                                                value: 'range',
                                                                label: 'Verse range',
                                                            },
                                                            {
                                                                value: 'section',
                                                                label: 'This section',
                                                            },
                                                        ]}
                                                        triggerClassName="min-h-[54px] px-4 py-3 font-serif text-lg font-normal tracking-normal normal-case"
                                                    />
                                                </div>
                                            )}
                                            <label className="grid gap-1.5 font-sans text-xs font-semibold tracking-wide text-stone-500 uppercase">
                                                Title
                                                <input
                                                    value={noteTitle}
                                                    onChange={(event) => {
                                                        setNoteTitleAutomatic(
                                                            false,
                                                        );
                                                        setNoteTitle(
                                                            event.target.value,
                                                        );
                                                    }}
                                                    maxLength={180}
                                                    autoFocus
                                                    placeholder="Give this note a title"
                                                    className="rounded-xl border border-stone-300 bg-white px-4 py-3 font-serif text-lg font-normal tracking-normal text-stone-900 normal-case outline-none focus:border-[#9a5428] focus:ring-2 focus:ring-[#9a5428]/15"
                                                />
                                            </label>
                                        </div>
                                        {noteAnchor.type === 'range' && (
                                            <div className="mb-6 grid gap-4 rounded-2xl border border-stone-200 bg-[#faf5ec] p-4 sm:grid-cols-2">
                                                <div className="grid gap-1.5 font-sans text-xs font-semibold tracking-wide text-stone-500 uppercase">
                                                    <span>Start verse</span>
                                                    <CustomSelect
                                                        label="Start verse"
                                                        value={
                                                            noteAnchor.verseStart ??
                                                            noteOriginVerse ??
                                                            verseNumbers[0] ??
                                                            ''
                                                        }
                                                        onChange={(value) =>
                                                            updateNoteRange(
                                                                'start',
                                                                value,
                                                            )
                                                        }
                                                        options={verseNumbers.map(
                                                            (verse) => ({
                                                                value: verse,
                                                                label: `Verse ${verse}`,
                                                            }),
                                                        )}
                                                        triggerClassName="font-serif text-sm font-normal tracking-normal normal-case"
                                                    />
                                                </div>
                                                <div className="grid gap-1.5 font-sans text-xs font-semibold tracking-wide text-stone-500 uppercase">
                                                    <span>End verse</span>
                                                    <CustomSelect
                                                        label="End verse"
                                                        value={
                                                            noteAnchor.verseEnd ??
                                                            noteAnchor.verseStart ??
                                                            ''
                                                        }
                                                        onChange={(value) =>
                                                            updateNoteRange(
                                                                'end',
                                                                value,
                                                            )
                                                        }
                                                        options={verseNumbers
                                                            .slice(
                                                                Math.max(
                                                                    0,
                                                                    verseNumbers.indexOf(
                                                                        noteAnchor.verseStart ??
                                                                            '',
                                                                    ),
                                                                ),
                                                            )
                                                            .map((verse) => ({
                                                                value: verse,
                                                                label: `Verse ${verse}`,
                                                            }))}
                                                        triggerClassName="font-serif text-sm font-normal tracking-normal normal-case"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div className="mt-4">
                                            <span className="mb-1.5 block font-sans text-xs font-semibold tracking-wide text-stone-500 uppercase">
                                                Note
                                            </span>
                                            <NoteEditor
                                                value={noteBody}
                                                onChange={setNoteBody}
                                                disabled={noteProcessing}
                                                expanded={noteExpanded}
                                            />
                                            <p className="mt-2 font-sans text-xs text-stone-500">
                                                Use the toolbar or Markdown
                                                shortcuts such as{' '}
                                                <code>##</code>,{' '}
                                                <code>**bold**</code>, lists,
                                                and quotes.
                                            </p>
                                        </div>
                                        {noteError && (
                                            <p
                                                role="alert"
                                                className="mt-4 text-sm text-red-700"
                                            >
                                                {noteError}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {noteMode !== 'list' && (
                                <footer
                                    className={`flex flex-wrap items-center gap-2 border-t border-stone-200 bg-stone-50/90 px-5 py-4 ${noteExpanded ? 'justify-end md:px-10 lg:px-16' : ''}`}
                                >
                                    <button
                                        type="button"
                                        disabled={noteProcessing}
                                        onClick={saveNote}
                                        className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-positive px-5 py-3 font-serif text-sm font-semibold text-positive-foreground hover:bg-positive-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-positive disabled:opacity-55 ${noteExpanded ? 'min-w-40' : 'flex-1'}`}
                                    >
                                        <Save className="size-4" />{' '}
                                        {noteProcessing
                                            ? 'Saving…'
                                            : 'Save note'}
                                    </button>
                                    {editingNote && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeNote(editingNote)
                                            }
                                            className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-3 font-serif text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700"
                                        >
                                            <Trash2 className="size-4" /> Delete
                                        </button>
                                    )}
                                </footer>
                            )}
                        </aside>
                    </>
                )}

                {pendingHighlight && !highlightOpen && !noteOpen && (
                    <div
                        role="toolbar"
                        aria-label="Highlight selected text"
                        onPointerDown={(event) => event.preventDefault()}
                        className="fixed z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full border border-stone-200 bg-[#fffdf9] p-2 shadow-[0_12px_35px_rgba(41,37,36,0.3)]"
                        style={{
                            top: pendingHighlight.position.top,
                            left: Math.max(
                                112,
                                Math.min(
                                    pendingHighlight.position.left,
                                    window.document.documentElement
                                        .clientWidth - 112,
                                ),
                            ),
                        }}
                    >
                        <button
                            type="button"
                            onClick={() =>
                                beginCreateNote({
                                    type: 'selection',
                                    selectedText: pendingHighlight.selectedText,
                                    segments: pendingHighlight.segments,
                                    verseStart:
                                        pendingHighlight.segments[0]?.verse,
                                    verseEnd:
                                        pendingHighlight.segments.at(-1)?.verse,
                                })
                            }
                            aria-label="Add a note to selected text"
                            title="Add note"
                            className="grid size-8 cursor-pointer place-items-center rounded-full text-stone-600 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#9a5428]"
                        >
                            <NotebookPen className="size-4" />
                        </button>
                        <span className="h-5 w-px bg-stone-200" />
                        <Highlighter className="mx-1 size-4 text-stone-600" />
                        {highlightColors.map((color) => (
                            <button
                                key={color.value}
                                type="button"
                                disabled={highlightProcessing}
                                onClick={() => saveHighlight(color.value)}
                                aria-label={`Highlight ${color.label}`}
                                className={`size-8 rounded-full border-2 border-white shadow-sm ring-1 ring-black/20 transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a5428] disabled:opacity-50 ${color.className}`}
                            />
                        ))}
                    </div>
                )}

                {selectionNotePreview && !noteOpen && !pendingHighlight && (
                    <div
                        role="tooltip"
                        className="pointer-events-none fixed z-[70] w-80 rounded-2xl border border-stone-200 bg-[#fffdf9] p-4 text-stone-800 shadow-[0_14px_40px_rgba(41,37,36,0.24)]"
                        style={{
                            top: selectionNotePreview.position.top,
                            left: selectionNotePreview.position.left,
                        }}
                    >
                        <p className="font-sans text-[0.62rem] font-semibold tracking-[0.18em] text-[#9a5428] uppercase">
                            Note on selected text
                        </p>
                        <p className="mt-1.5 font-serif text-base font-semibold text-stone-900">
                            {selectionNotePreview.note.title}
                        </p>
                        <p className="mt-1.5 line-clamp-3 font-serif text-sm leading-5 text-stone-600">
                            {notePreview(
                                selectionNotePreview.note.bodyMarkdown,
                            )}
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}
