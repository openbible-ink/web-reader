import { Head } from '@inertiajs/react';
import {
    Bookmark,
    BookOpen,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    List,
    Menu,
    MoreHorizontal,
    NotebookPen,
    Search,
    Type,
    X,
} from 'lucide-react';
import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react';
import type {
    BibleDocument,
    FlowNode,
    InlineNode,
    NoteFieldNode,
} from 'usfm-parser';
import { parseOeb, type OebVariantOptions } from 'usfm-parser/oeb';

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
        chapter?: string;
        verseStart?: string;
        verseEnd?: string;
    };
    role: 'hero' | 'inline' | 'background' | 'gallery';
}

interface ReaderProps {
    artwork?: ScriptureArtwork | null;
}

type ReadingItem =
    | { key: string; kind: 'heading'; content: InlineNode[] }
    | { key: string; kind: 'verse'; number: string; content: InlineNode[] };

const sourceUrl = '/bibles/oeb/43-John.usfm.db';
const preferencesKey = 'bible-reader:oeb-preferences';
const fallbackArtwork = {
    imageUrl: '/images/scripture/john-olive-branch.png',
    altText:
        'A vintage botanical study of an olive branch with dark green leaves and ripe olives on aged parchment.',
    focalPoint: { x: 66, y: 42 },
};
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

function savedPreferences(): OebVariantOptions {
    if (typeof window === 'undefined') return defaultPreferences;
    try {
        const saved = window.localStorage.getItem(preferencesKey);
        return saved
            ? { ...defaultPreferences, ...JSON.parse(saved) }
            : defaultPreferences;
    } catch {
        return defaultPreferences;
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
                    className="mx-0.5 align-super font-sans text-[0.48em] font-semibold text-[#a95624]"
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
    for (const node of nodes) {
        if (node.type !== 'block') continue;
        if (node.style.startsWith('s') || node.style.startsWith('ms')) {
            flushVerse();
            items.push({
                key: node.id,
                kind: 'heading',
                content: node.children,
            });
            continue;
        }
        if (node.style === 'b') continue;
        for (const child of node.children) {
            if (child.type === 'verseStart') {
                flushVerse();
                verse = { key: child.id, number: child.number, content: [] };
            } else if (verse) verse.content.push(child);
        }
    }
    flushVerse();
    return items;
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
                className="rounded-lg border border-stone-200 bg-[#fffdf8] px-3 py-2.5 text-sm tracking-normal text-stone-900 normal-case outline-none focus:border-[#b8652e]"
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

function Brand() {
    return (
        <div className="flex items-center gap-3 text-stone-950">
            <BookOpen strokeWidth={1.8} className="size-7" />
            <span className="font-serif text-[1.08rem] font-semibold">
                Open Bible
            </span>
        </div>
    );
}

function Library({ close }: { close?: () => void }) {
    const navItems = [
        [BookOpen, 'Read'],
        [Search, 'Search'],
        [NotebookPen, 'Notes'],
        [Bookmark, 'Highlights'],
        [MoreHorizontal, 'More'],
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
                {navItems.map(([Icon, label]) => (
                    <button
                        type="button"
                        key={label}
                        className={`mb-1 flex w-full items-center gap-4 rounded-r-xl border-l-2 px-5 py-3 text-left ${label === 'Read' ? 'border-[#b85f28] bg-[#f2ece3] text-[#94491e]' : 'border-transparent'}`}
                    >
                        <Icon className="size-5" strokeWidth={1.6} />
                        {label}
                    </button>
                ))}
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
                            className={`block w-full rounded-lg px-1 text-left ${book === 'John' ? 'font-semibold text-stone-950' : 'hover:text-stone-950'}`}
                        >
                            {book}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function Reader({ artwork }: ReaderProps) {
    const [source, setSource] = useState<string>();
    const [loadError, setLoadError] = useState<string>();
    const [chapter, setChapter] = useState('1');
    const [preferences, setPreferences] =
        useState<OebVariantOptions>(savedPreferences);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [libraryOpen, setLibraryOpen] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        fetch(sourceUrl, { signal: controller.signal })
            .then((response) => {
                if (!response.ok)
                    throw new Error(`Unable to load John (${response.status})`);
                return response.text();
            })
            .then(setSource)
            .catch((error: unknown) => {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                )
                    return;
                setLoadError(
                    error instanceof Error
                        ? error.message
                        : 'Unable to load John',
                );
            });
        return () => controller.abort();
    }, []);

    useEffect(() => {
        window.localStorage.setItem(
            preferencesKey,
            JSON.stringify(preferences),
        );
    }, [preferences]);

    const document = useMemo(
        () =>
            source ? parseOeb(source, { variants: preferences }) : undefined,
        [source, preferences],
    );
    const chapters = useMemo(
        () => (document ? chapterNumbers(document) : []),
        [document],
    );
    const content = useMemo(
        () => (document ? readingItems(chapterContent(document, chapter)) : []),
        [document, chapter],
    );
    const chapterIndex = chapters.indexOf(chapter);
    const image = artwork ?? fallbackArtwork;
    const imagePosition = `${image.focalPoint?.x ?? 50}% ${image.focalPoint?.y ?? 50}%`;
    const updatePreference = <Key extends keyof OebVariantOptions>(
        key: Key,
        value: OebVariantOptions[Key],
    ) => setPreferences((current) => ({ ...current, [key]: value }));
    const changeChapter = (nextChapter: string) => {
        setChapter(nextChapter);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <>
            <Head title={`John ${chapter} — Open English Bible`} />
            <div className="min-h-screen bg-[#eee9df] text-[#25221e] lg:pl-[15rem]">
                <aside className="fixed inset-y-0 left-0 z-40 hidden w-[15rem] border-r border-stone-200 lg:block">
                    <Library />
                </aside>

                <header className="absolute top-0 right-0 left-0 z-30 flex items-center justify-between px-6 py-5 lg:left-[15rem] lg:justify-end lg:px-12">
                    <div className="lg:hidden">
                        <Brand />
                    </div>
                    <div className="flex items-center gap-5 text-stone-950">
                        <button type="button" aria-label="Search">
                            <Search className="size-5" />
                        </button>
                        <button type="button" aria-label="Bookmark">
                            <Bookmark className="hidden size-5 sm:block" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setLibraryOpen(true)}
                            aria-label="Open library"
                        >
                            <Menu className="size-5 lg:hidden" />
                            <MoreHorizontal className="hidden size-5 lg:block" />
                        </button>
                    </div>
                </header>

                <section className="relative h-[30rem] overflow-hidden lg:h-[25.5rem]">
                    <img
                        src={image.imageUrl}
                        alt={image.altText}
                        className="absolute inset-0 size-full object-cover"
                        style={{ objectPosition: imagePosition }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#f5ead5]/95 via-[#f5ead5]/38 to-transparent" />
                    <div className="absolute inset-x-0 bottom-14 z-10 px-7 sm:px-12 lg:bottom-12 lg:px-[3.4rem]">
                        <p className="max-w-52 text-[0.72rem] font-semibold tracking-[0.3em] uppercase">
                            The Gospel according to
                        </p>
                        <h1 className="mt-2 font-serif text-[4.4rem] leading-none font-semibold tracking-[-0.04em] lg:text-[4.8rem]">
                            John
                        </h1>
                        <div className="mt-5 h-0.5 w-16 bg-[#bd6b32]" />
                        <p className="mt-4 font-serif text-xl">
                            Chapter {chapter}
                        </p>
                    </div>
                </section>

                <main className="relative z-20 -mt-7 min-h-screen rounded-t-[2rem] bg-[#fffdf9] shadow-[0_-8px_30px_rgba(62,49,30,0.06)] lg:rounded-t-[1.8rem]">
                    <div className="mx-auto max-w-[52rem] px-7 pb-24 sm:px-12 lg:px-14">
                        <div className="sticky top-0 z-20 flex h-[5.4rem] items-center justify-between border-b border-stone-200 bg-[#fffdf9]/95 backdrop-blur">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    aria-label="Previous chapter"
                                    disabled={chapterIndex <= 0}
                                    onClick={() =>
                                        changeChapter(
                                            chapters[chapterIndex - 1]!,
                                        )
                                    }
                                    className="grid size-10 place-items-center rounded-full hover:bg-stone-100 disabled:opacity-30"
                                >
                                    <ChevronLeft className="size-5" />
                                </button>
                                <label className="relative font-serif text-lg font-semibold">
                                    <span className="sr-only">Chapter</span>
                                    <select
                                        value={chapter}
                                        onChange={(event) =>
                                            changeChapter(event.target.value)
                                        }
                                        className="appearance-none bg-transparent py-2 pr-7 outline-none"
                                    >
                                        {chapters.map((number) => (
                                            <option key={number} value={number}>
                                                John {number}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute top-3 right-0 size-4" />
                                </label>
                            </div>
                            <div className="flex items-center gap-1">
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
                                    className="grid size-10 place-items-center rounded-full border border-stone-100 hover:bg-stone-100 disabled:opacity-30"
                                >
                                    <ChevronRight className="size-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSettingsOpen((open) => !open)
                                    }
                                    aria-label="Reading preferences"
                                    className="grid size-11 place-items-center rounded-full hover:bg-stone-100"
                                >
                                    <Type className="size-5" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Contents"
                                    className="hidden size-11 place-items-center rounded-full hover:bg-stone-100 sm:grid"
                                >
                                    <List className="size-5" />
                                </button>
                            </div>
                        </div>

                        {settingsOpen && (
                            <section className="relative z-10 grid gap-4 border-b border-stone-200 py-6 sm:grid-cols-2 lg:grid-cols-3">
                                <PreferenceSelect
                                    label="Spelling"
                                    value={preferences.spelling ?? 'us'}
                                    options={[
                                        { value: 'cth', label: 'Commonwealth' },
                                        { value: 'us', label: 'American' },
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
                                    value={preferences.gender ?? 'neut'}
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
                                            value as 'neut' | 'masc',
                                        )
                                    }
                                />
                                <PreferenceSelect
                                    label="Versification"
                                    value={preferences.versification ?? 'nrsv'}
                                    options={[
                                        { value: 'nrsv', label: 'NRSV' },
                                        { value: 'jps', label: 'JPS' },
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
                                    value={preferences.gehenna ?? 'gehenna'}
                                    options={[
                                        { value: 'gehenna', label: 'Gehenna' },
                                        { value: 'pit', label: 'The Pit' },
                                    ]}
                                    onChange={(value) =>
                                        updatePreference(
                                            'gehenna',
                                            value as 'gehenna' | 'pit',
                                        )
                                    }
                                />
                                <PreferenceSelect
                                    label="Ioudaioi"
                                    value={preferences.ioudaioi ?? 'ioudaioi'}
                                    options={[
                                        {
                                            value: 'ioudaioi',
                                            label: 'Contextual',
                                        },
                                        { value: 'jew', label: 'The Jews' },
                                    ]}
                                    onChange={(value) =>
                                        updatePreference(
                                            'ioudaioi',
                                            value as 'ioudaioi' | 'jew',
                                        )
                                    }
                                />
                            </section>
                        )}

                        <article className="pt-8 font-serif text-[1.22rem] leading-[1.55] sm:text-[1.36rem] sm:leading-[1.48]">
                            {loadError && (
                                <p className="rounded-xl bg-red-50 p-4 font-sans text-sm text-red-800">
                                    {loadError}
                                </p>
                            )}
                            {!document && !loadError && (
                                <p className="font-sans text-sm text-stone-500">
                                    Preparing the text…
                                </p>
                            )}
                            {content.map((item, index) =>
                                item.kind === 'heading' ? (
                                    <h2
                                        key={item.key}
                                        className={`${index ? 'mt-12 border-t border-stone-200 pt-7' : ''} mb-4 font-sans text-[0.68rem] font-semibold tracking-[0.29em] text-stone-500 uppercase`}
                                    >
                                        {renderInlineSequence(item.content)}
                                    </h2>
                                ) : (
                                    <div
                                        key={item.key}
                                        className="relative grid grid-cols-[2.6rem_1fr] gap-3 py-1.5 sm:grid-cols-[3rem_1fr] sm:gap-4"
                                    >
                                        {item.number === '1' && (
                                            <span
                                                aria-hidden="true"
                                                className="absolute -top-1 left-0 font-serif text-[3.8rem] leading-none text-[#b85c26]"
                                            >
                                                {chapter}
                                            </span>
                                        )}
                                        <span className="pt-1 text-right text-sm text-stone-500 tabular-nums">
                                            {item.number}
                                        </span>
                                        <p>
                                            {renderInlineSequence(item.content)}
                                        </p>
                                    </div>
                                ),
                            )}
                        </article>
                    </div>
                </main>

                {libraryOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <button
                            type="button"
                            aria-label="Close library"
                            onClick={() => setLibraryOpen(false)}
                            className="absolute inset-0 bg-stone-950/40 backdrop-blur-[2px]"
                        />
                        <aside className="absolute inset-x-0 bottom-0 h-[82vh] overflow-hidden rounded-t-[1.8rem] shadow-2xl">
                            <div className="absolute top-2 left-1/2 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-stone-400" />
                            <Library close={() => setLibraryOpen(false)} />
                        </aside>
                    </div>
                )}
            </div>
        </>
    );
}
