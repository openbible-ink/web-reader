import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Bookmark,
    BookOpen,
    ChevronDown,
    Highlighter,
    List,
    MoreHorizontal,
    NotebookPen,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import {
    Fragment,
    type CSSProperties,
    type ReactNode,
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

interface PendingHighlight {
    selectedText: string;
    segments: HighlightSegment[];
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
        <label className="grid gap-1.5 text-xs tracking-wide text-stone-500 uppercase">
            <span>{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="cursor-pointer rounded-lg border border-stone-300 bg-[#fffdf8] px-3 py-2.5 text-sm tracking-normal text-stone-900 normal-case outline-none focus-visible:border-[#a95624] focus-visible:ring-2 focus-visible:ring-[#a95624]/30"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
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

function Brand() {
    return (
        <div className="flex items-center gap-3 text-stone-950">
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
        </div>
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
        { icon: BookOpen, label: 'Read' },
        { icon: NotebookPen, label: 'Notes' },
        { icon: Highlighter, label: 'Highlights', href: '/highlights' },
        { icon: Bookmark, label: 'Bookmarks', href: '/bookmarks' },
        { icon: MoreHorizontal, label: 'More' },
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
    const editionPreferencesRef = useRef<HTMLDivElement>(null);
    const typographyRef = useRef<HTMLDivElement>(null);
    const outlineRef = useRef<HTMLDivElement>(null);
    const bookmarkRef = useRef<HTMLDivElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);
    const heroArtworkRef = useRef<HTMLDivElement>(null);
    const heroTextRef = useRef<HTMLDivElement>(null);
    const readerArticleRef = useRef<HTMLElement>(null);

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
            !highlightOpen
        )
            return;

        const dismissOnEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            setEditionPreferencesOpen(false);
            setTypographyOpen(false);
            setOutlineOpen(false);
            setBookmarkOpen(false);
            setHighlightOpen(false);
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
        editionPreferencesOpen,
        highlightOpen,
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

        const names = highlightColors.map(({ value }) => `open-bible-${value}`);
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

        return () => names.forEach((name) => registry.delete(name));
    }, [content, highlights]);
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
                                <label className="relative font-serif text-lg font-semibold">
                                    <span className="sr-only">Chapter</span>
                                    <select
                                        value={chapter}
                                        onChange={(event) =>
                                            changeChapter(event.target.value)
                                        }
                                        className="cursor-pointer appearance-none rounded-md bg-transparent py-2 pr-7 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--reader-accent)]"
                                        style={{
                                            colorScheme:
                                                typography.theme === 'dark'
                                                    ? 'dark'
                                                    : 'light',
                                        }}
                                    >
                                        {chapters.map((number) => (
                                            <option key={number} value={number}>
                                                {book.name} {number}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute top-3 right-0 size-4" />
                                </label>
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
                                                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--reader-accent)] px-4 py-3 text-sm font-semibold text-white"
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
                                                        <label className="grid gap-1.5 text-xs font-semibold tracking-wide uppercase">
                                                            <span
                                                                className={
                                                                    readerMutedText
                                                                }
                                                            >
                                                                From verse
                                                            </span>
                                                            <select
                                                                value={
                                                                    bookmarkVerseStart
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) => {
                                                                    const value =
                                                                        event
                                                                            .target
                                                                            .value;
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
                                                                className={`rounded-xl border bg-transparent px-3 py-2.5 text-sm font-normal tracking-normal normal-case outline-none ${readerDivider}`}
                                                            >
                                                                <option value="">
                                                                    Whole
                                                                    chapter
                                                                </option>
                                                                {verseNumbers.map(
                                                                    (verse) => (
                                                                        <option
                                                                            key={
                                                                                verse
                                                                            }
                                                                            value={
                                                                                verse
                                                                            }
                                                                        >
                                                                            {
                                                                                verse
                                                                            }
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                        </label>
                                                        <label className="grid gap-1.5 text-xs font-semibold tracking-wide uppercase">
                                                            <span
                                                                className={
                                                                    readerMutedText
                                                                }
                                                            >
                                                                To verse
                                                            </span>
                                                            <select
                                                                value={
                                                                    bookmarkVerseEnd
                                                                }
                                                                disabled={
                                                                    !bookmarkVerseStart
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    setBookmarkVerseEnd(
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                className={`rounded-xl border bg-transparent px-3 py-2.5 text-sm font-normal tracking-normal normal-case outline-none disabled:opacity-45 ${readerDivider}`}
                                                            >
                                                                {verseNumbers.map(
                                                                    (verse) => (
                                                                        <option
                                                                            key={
                                                                                verse
                                                                            }
                                                                            value={
                                                                                verse
                                                                            }
                                                                        >
                                                                            {
                                                                                verse
                                                                            }
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                        </label>
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
                                                            className="flex-1 rounded-xl bg-[var(--reader-accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
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
                                    <h2
                                        key={item.key}
                                        id={`section-${item.key}`}
                                        className={`${index ? `mt-12 border-t pt-7 ${readerDivider}` : ''} mb-4 scroll-mt-[6.5rem] font-sans text-[0.68rem] font-semibold tracking-[0.29em] uppercase ${readerMutedText}`}
                                    >
                                        {renderInlineSequence(item.content)}
                                    </h2>
                                ) : (
                                    <div
                                        key={item.key}
                                        className="grid grid-cols-[4.5rem_1.5rem_minmax(0,1fr)] gap-x-2 py-1.5"
                                    >
                                        <span aria-hidden="true">
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
                                    </div>
                                ),
                            )}
                        </article>
                    </div>
                </main>

                {pendingHighlight && !highlightOpen && (
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
            </div>
        </>
    );
}
