import { Head } from '@inertiajs/react';
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    LoaderCircle,
    Settings2,
} from 'lucide-react';
import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react';
import type {
    BibleDocument,
    BlockNode,
    FlowNode,
    InlineNode,
    NoteFieldNode,
} from 'usfm-parser';
import { parseOeb, type OebVariantOptions } from 'usfm-parser/oeb';

const sourceUrl = '/bibles/oeb/43-John.usfm.db';
const preferencesKey = 'bible-reader:oeb-preferences';
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
        const value = window.localStorage.getItem(preferencesKey);
        return value
            ? { ...defaultPreferences, ...JSON.parse(value) }
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
            return (
                <sup
                    className="mr-1 ml-0.5 font-sans text-[0.62em] font-semibold text-amber-700 select-none"
                    id={node.ref}
                >
                    {node.number}
                </sup>
            );
        case 'inline': {
            const content = node.children.map((child) => (
                <Fragment key={child.id}>{renderInline(child)}</Fragment>
            ));
            if (node.style === 'nd')
                return (
                    <span className="font-semibold tracking-wide uppercase">
                        {content}
                    </span>
                );
            if (node.style === 'em' || node.style === 'qs')
                return <em>{content}</em>;
            if (node.style === 'wj')
                return <span className="text-stone-950">{content}</span>;
            return <span>{content}</span>;
        }
        case 'note':
            return (
                <button
                    type="button"
                    title={noteText(node.children)}
                    className="mx-0.5 align-super font-sans text-[0.55em] font-bold text-amber-700 hover:text-amber-900"
                    aria-label={`Footnote: ${noteText(node.children)}`}
                >
                    {node.caller === '+' ? '†' : (node.caller ?? '†')}
                </button>
            );
        case 'unknown':
            return node.value ?? null;
    }
}

function blockClass(style: string): string {
    if (style === 'q' || style === 'q1') return 'pl-5 italic';
    if (style === 'q2') return 'pl-10 italic';
    if (style === 'q3' || style === 'q4') return 'pl-14 italic';
    if (style === 'm' || style === 'nb') return 'mt-0';
    return '';
}

function renderBlock(node: BlockNode): ReactNode {
    if (node.style === 'b') return <div className="h-4" />;
    const content = node.children.map((child) => (
        <Fragment key={child.id}>{renderInline(child)}</Fragment>
    ));
    if (node.style.startsWith('s') || node.style.startsWith('ms'))
        return (
            <h2 className="mt-10 mb-4 font-sans text-sm font-semibold tracking-[0.16em] text-stone-500 uppercase">
                {content}
            </h2>
        );
    if (node.style === 'd')
        return (
            <p className="mb-5 text-center text-stone-600 italic">{content}</p>
        );
    return <p className={`mb-4 ${blockClass(node.style)}`}>{content}</p>;
}

function renderFlow(node: FlowNode): ReactNode {
    if (node.type === 'block') return renderBlock(node);
    if (node.type === 'chapterStart') return null;
    if (
        node.type === 'text' ||
        node.type === 'verseStart' ||
        node.type === 'inline' ||
        node.type === 'note'
    )
        return renderInline(node);
    return node.value ? <span>{node.value}</span> : null;
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
        <label className="grid gap-1.5 text-sm text-stone-600">
            <span>{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-900 shadow-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
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

export default function Reader() {
    const [source, setSource] = useState<string>();
    const [loadError, setLoadError] = useState<string>();
    const [chapter, setChapter] = useState('1');
    const [preferences, setPreferences] =
        useState<OebVariantOptions>(savedPreferences);
    const [settingsOpen, setSettingsOpen] = useState(false);

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

    useEffect(
        () =>
            window.localStorage.setItem(
                preferencesKey,
                JSON.stringify(preferences),
            ),
        [preferences],
    );

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
        () => (document ? chapterContent(document, chapter) : []),
        [document, chapter],
    );
    const chapterIndex = chapters.indexOf(chapter);
    const updatePreference = <Key extends keyof OebVariantOptions>(
        key: Key,
        value: OebVariantOptions[Key],
    ) => setPreferences((current) => ({ ...current, [key]: value }));

    return (
        <>
            <Head title={`John ${chapter} — Open English Bible`} />
            <div className="min-h-screen bg-[#f5f1e8] text-stone-800">
                <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#f5f1e8]/95 backdrop-blur">
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
                        <div className="flex items-center gap-3">
                            <div className="grid size-10 place-items-center rounded-xl bg-stone-900 text-amber-100">
                                <BookOpen className="size-5" />
                            </div>
                            <div>
                                <p className="font-serif text-lg leading-none font-semibold">
                                    Open Bible
                                </p>
                                <p className="mt-1 text-xs tracking-wide text-stone-500">
                                    Open English Bible · CC0
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSettingsOpen((open) => !open)}
                            className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:border-stone-400"
                        >
                            <Settings2 className="size-4" />
                            Reading preferences
                        </button>
                    </div>
                </header>
                {settingsOpen && (
                    <section className="border-b border-stone-200 bg-white">
                        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-6 sm:grid-cols-2 lg:grid-cols-5">
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
                                    { value: 'neut', label: 'Gender neutral' },
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
                                    { value: 'ioudaioi', label: 'Contextual' },
                                    { value: 'jew', label: 'The Jews' },
                                ]}
                                onChange={(value) =>
                                    updatePreference(
                                        'ioudaioi',
                                        value as 'ioudaioi' | 'jew',
                                    )
                                }
                            />
                        </div>
                    </section>
                )}
                <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[12rem_minmax(0,42rem)] lg:justify-center">
                    <aside className="lg:sticky lg:top-28 lg:self-start">
                        <label
                            className="text-xs font-semibold tracking-[0.16em] text-stone-500 uppercase"
                            htmlFor="chapter"
                        >
                            Chapter
                        </label>
                        <select
                            id="chapter"
                            value={chapter}
                            onChange={(event) => setChapter(event.target.value)}
                            disabled={!document}
                            className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 font-medium shadow-sm"
                        >
                            {chapters.map((number) => (
                                <option key={number} value={number}>
                                    {number}
                                </option>
                            ))}
                        </select>
                        <div className="mt-3 flex gap-2">
                            <button
                                type="button"
                                aria-label="Previous chapter"
                                disabled={chapterIndex <= 0}
                                onClick={() =>
                                    setChapter(chapters[chapterIndex - 1]!)
                                }
                                className="grid size-10 place-items-center rounded-lg border border-stone-300 bg-white disabled:opacity-35"
                            >
                                <ChevronLeft className="size-4" />
                            </button>
                            <button
                                type="button"
                                aria-label="Next chapter"
                                disabled={
                                    chapterIndex === -1 ||
                                    chapterIndex >= chapters.length - 1
                                }
                                onClick={() =>
                                    setChapter(chapters[chapterIndex + 1]!)
                                }
                                className="grid size-10 place-items-center rounded-lg border border-stone-300 bg-white disabled:opacity-35"
                            >
                                <ChevronRight className="size-4" />
                            </button>
                        </div>
                    </aside>
                    <article className="min-h-[70vh] rounded-[2rem] border border-stone-200 bg-[#fffdf8] px-7 py-10 shadow-[0_24px_70px_-40px_rgba(41,37,36,0.5)] sm:px-12 sm:py-14">
                        <header className="mb-10 border-b border-stone-200 pb-7">
                            <p className="mb-2 font-sans text-xs font-semibold tracking-[0.22em] text-amber-700 uppercase">
                                The Gospel according to
                            </p>
                            <h1 className="font-serif text-5xl font-semibold tracking-tight text-stone-950">
                                John
                            </h1>
                            <p className="mt-3 font-sans text-sm text-stone-500">
                                Chapter {chapter}
                            </p>
                        </header>
                        {loadError && (
                            <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
                                {loadError}
                            </p>
                        )}
                        {!document && !loadError && (
                            <div className="flex items-center gap-3 text-stone-500">
                                <LoaderCircle className="size-5 animate-spin" />
                                Preparing the text…
                            </div>
                        )}
                        {document && (
                            <div className="font-serif text-[1.16rem] leading-[1.9] text-stone-800">
                                {content.map((node) => (
                                    <Fragment key={node.id}>
                                        {renderFlow(node)}
                                    </Fragment>
                                ))}
                            </div>
                        )}
                        {document?.diagnostics && (
                            <details className="mt-10 border-t border-stone-200 pt-5 font-sans text-xs text-stone-500">
                                <summary>
                                    {document.diagnostics.length} parser
                                    diagnostics
                                </summary>
                                <ul className="mt-2 list-disc pl-5">
                                    {document.diagnostics.map(
                                        (diagnostic, index) => (
                                            <li
                                                key={`${diagnostic.code}-${index}`}
                                            >
                                                {diagnostic.code}:{' '}
                                                {diagnostic.message}
                                            </li>
                                        ),
                                    )}
                                </ul>
                            </details>
                        )}
                    </article>
                </main>
            </div>
        </>
    );
}
