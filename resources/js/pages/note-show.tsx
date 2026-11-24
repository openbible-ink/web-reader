import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, BookOpen, Download, Pencil, X } from 'lucide-react';
import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import NoteContent from '@/components/note-content';
import SavedItemsPageShell from '@/components/saved-items-page-shell';
import {
    cachedScriptureSource,
    loadScriptureSource,
} from '@/lib/scripture-source-cache';
import { loadScriptureChapter } from '@/lib/scripture-chapter-cache';
import type { BibleDocument, FlowNode, InlineNode } from 'usfm-parser';
import { parseUsfm } from 'usfm-parser';
import { parseOeb, type OebVariantOptions } from 'usfm-parser/oeb';

interface NotePageProps {
    note: {
        id: string;
        title: string;
        bodyMarkdown: string;
        anchorType: 'verse' | 'range' | 'section' | 'selection';
        selectedText?: string | null;
        sectionTitle?: string | null;
        verseStart?: string | null;
        verseEnd?: string | null;
        chapter: string;
        chapterEnd?: string | null;
        reference: string;
        attachmentLabel: string;
        updatedAt?: string | null;
        tags: Array<{ id: string; name: string; slug: string }>;
    };
    edition: {
        slug: string;
        name: string;
        abbreviation: string;
        language: string;
        variantProfile?: string | null;
    };
    book: { code: string; name: string; sourceUrl: string };
    scriptureBooks: Array<{ code: string; name: string }>;
    readerUrl: string;
    editUrl: string;
    exportUrl: string;
}

interface LinkedPassage {
    bookCode: string;
    chapter: string;
    verseStart: string;
    verseEnd: string;
    kind?: 'link' | 'attachment';
    label?: string;
    readerUrl?: string;
    selectedText?: string | null;
}

interface PassageVerse {
    chapter: string;
    number: string;
    text: string;
}

const defaultOebPreferences: OebVariantOptions = {
    spelling: 'cth',
    gender: 'neut',
    versification: 'nrsv',
    gehenna: 'gehenna',
    ioudaioi: 'ioudaioi',
};

function savedOebPreferences(editionSlug: string): OebVariantOptions {
    if (typeof window === 'undefined') return defaultOebPreferences;
    try {
        const saved = window.localStorage.getItem(
            `bible-reader:${editionSlug}:preferences`,
        );
        return saved
            ? { ...defaultOebPreferences, ...JSON.parse(saved) }
            : defaultOebPreferences;
    } catch {
        return defaultOebPreferences;
    }
}

function inlineText(node: InlineNode): string {
    if (node.type === 'text') return node.value;
    if (node.type === 'inline') return node.children.map(inlineText).join('');
    if (node.type === 'unknown') return node.value ?? '';
    return '';
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

function passageVerses(
    document: BibleDocument,
    chapter: string,
    chapterEnd: string | null | undefined,
    verseStart?: string | null,
    verseEnd?: string | null,
): PassageVerse[] {
    const allChapters = document.children
        .filter((node) => node.type === 'chapterStart')
        .map((node) => node.number);
    const startChapterIndex = allChapters.indexOf(chapter);
    const finalChapter = chapterEnd ?? chapter;
    const endChapterIndex = allChapters.indexOf(finalChapter);
    if (startChapterIndex === -1 || endChapterIndex < startChapterIndex)
        return [];

    return allChapters
        .slice(startChapterIndex, endChapterIndex + 1)
        .flatMap((currentChapter) => {
            const verses: PassageVerse[] = [];
            let current: PassageVerse | undefined;
            const flush = () => {
                if (current) {
                    current.text = current.text.replace(/\s+/g, ' ').trim();
                    verses.push(current);
                }
                current = undefined;
            };
            const consume = (node: InlineNode) => {
                if (node.type === 'verseStart') {
                    flush();
                    current = {
                        chapter: currentChapter,
                        number: node.number,
                        text: '',
                    };
                    return;
                }
                if (current) {
                    const text = inlineText(node);
                    const needsSpace =
                        current.text !== '' &&
                        text !== '' &&
                        !/\s$/.test(current.text) &&
                        !/^[\s,.;:!?)]/.test(text);
                    current.text += `${needsSpace ? ' ' : ''}${text}`;
                }
            };

            chapterContent(document, currentChapter).forEach((node) => {
                if (node.type === 'block') node.children.forEach(consume);
                else if (node.type !== 'chapterStart') consume(node);
            });
            flush();

            const start =
                currentChapter === chapter && verseStart
                    ? verses.findIndex((verse) => verse.number === verseStart)
                    : 0;
            const requestedEnd =
                currentChapter === finalChapter && verseEnd
                    ? verses.findIndex((verse) => verse.number === verseEnd)
                    : verses.length - 1;
            return verses.slice(
                Math.max(0, start),
                Math.max(start, requestedEnd) + 1,
            );
        });
}

function passageContent(
    verses: PassageVerse[],
    showChapters: boolean,
): ReactNode {
    return verses.map((verse) => (
        <p
            key={`${verse.chapter}:${verse.number}`}
            className="grid grid-cols-[2.75rem_1fr] gap-3"
        >
            <span className="pt-1 font-sans text-xs font-semibold text-[#9a5428]">
                {showChapters
                    ? `${verse.chapter}:${verse.number}`
                    : verse.number}
            </span>
            <span>{verse.text}</span>
        </p>
    ));
}

export default function NoteShow({
    note,
    edition,
    book,
    scriptureBooks,
    readerUrl,
    editUrl,
    exportUrl,
}: NotePageProps) {
    const [source, setSource] = useState(() =>
        cachedScriptureSource(book.sourceUrl),
    );
    const [sourceError, setSourceError] = useState(false);
    const [linkedPassage, setLinkedPassage] = useState<LinkedPassage>();
    const [linkedPassageClosing, setLinkedPassageClosing] = useState(false);
    const [linkedDocument, setLinkedDocument] = useState<BibleDocument>();
    const [linkedPassageError, setLinkedPassageError] = useState(false);
    const closeLinkedPassage = useCallback(() => {
        setLinkedPassageClosing(true);
        window.setTimeout(() => {
            setLinkedPassage(undefined);
            setLinkedPassageClosing(false);
        }, 300);
    }, []);

    useEffect(() => {
        if (source || note.selectedText) return;
        void loadScriptureSource(book.sourceUrl)
            .then(setSource)
            .catch(() => setSourceError(true));
    }, [book.sourceUrl, note.selectedText, source]);

    useEffect(() => {
        if (!linkedPassage) return;
        const dismiss = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (linkedPassage) closeLinkedPassage();
            }
        };
        window.document.addEventListener('keydown', dismiss);
        return () => window.document.removeEventListener('keydown', dismiss);
    }, [closeLinkedPassage, linkedPassage]);

    useEffect(() => {
        if (!linkedPassage || linkedPassage.kind === 'attachment') return;
        let active = true;
        setLinkedDocument(undefined);
        setLinkedPassageError(false);
        loadScriptureChapter(
            `/api/v1/editions/${edition.slug}/books/${linkedPassage.bookCode}/chapters/${linkedPassage.chapter}`,
        )
            .then(({ document }) => {
                if (active) setLinkedDocument(document);
            })
            .catch(() => {
                if (active) setLinkedPassageError(true);
            });
        return () => {
            active = false;
        };
    }, [edition.slug, linkedPassage]);

    const verses = useMemo(() => {
        if (!source || note.selectedText) return [];
        const document =
            edition.variantProfile === 'oeb'
                ? parseOeb(source, {
                      variants: savedOebPreferences(edition.slug),
                  })
                : parseUsfm(source, {
                      edition: {
                          id: edition.slug,
                          name: edition.name,
                          abbreviation: edition.abbreviation,
                          language: edition.language,
                      },
                      bookCode: book.code,
                  });
        return passageVerses(
            document,
            note.chapter,
            note.chapterEnd,
            note.verseStart,
            note.verseEnd,
        );
    }, [book.code, edition, note, source]);

    const updated = note.updatedAt
        ? new Date(note.updatedAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
          })
        : undefined;
    const linkedBook = linkedPassage
        ? scriptureBooks.find(
              (scriptureBook) => scriptureBook.code === linkedPassage.bookCode,
          )
        : undefined;
    const linkedVerses = useMemo(
        () =>
            linkedPassage?.kind === 'attachment'
                ? verses
                : linkedPassage && linkedDocument
                  ? passageVerses(
                        linkedDocument,
                        linkedPassage.chapter,
                        linkedPassage.chapter,
                        linkedPassage.verseStart,
                        linkedPassage.verseEnd,
                    )
                  : [],
        [linkedDocument, linkedPassage, verses],
    );
    const linkedPassageLabel = linkedPassage
        ? (linkedPassage.label ??
          `${linkedBook?.name ?? linkedPassage.bookCode} ${linkedPassage.chapter}:${linkedPassage.verseStart}${linkedPassage.verseEnd !== linkedPassage.verseStart ? `–${linkedPassage.verseEnd}` : ''}`)
        : '';
    const openAttachedPassage = () => {
        setLinkedPassageClosing(false);
        setLinkedPassage({
            bookCode: book.code,
            chapter: note.chapter,
            verseStart: note.verseStart ?? '1',
            verseEnd: note.verseEnd ?? note.verseStart ?? '1',
            kind: 'attachment',
            label: note.attachmentLabel,
            readerUrl,
            selectedText: note.selectedText,
        });
    };
    const openScriptureLink = (href: string) => {
        const url = new URL(href, window.location.origin);
        const path = url.pathname.match(/^\/read\/([A-Za-z0-9]{3})\/(\d+)$/);
        const range = url.searchParams
            .get('verses')
            ?.match(/^(\d{1,3}[a-z]?)(?:-(\d{1,3}[a-z]?))?$/i);
        if (!path || !range) return;
        setLinkedPassageClosing(false);
        setLinkedPassage({
            bookCode: path[1].toUpperCase(),
            chapter: path[2],
            verseStart: range[1],
            verseEnd: range[2] ?? range[1],
            kind: 'link',
        });
    };

    return (
        <>
            <Head title={note.title} />
            <SavedItemsPageShell active="notes">
                <div className="relative min-h-svh overflow-hidden bg-[#f4efe6] text-[#201f1b]">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 h-[27rem] bg-[linear-gradient(180deg,rgba(255,252,246,0.08),#f4efe6_95%),url('/images/scripture/john-olive-branch.png')] bg-cover bg-[center_34%] opacity-35"
                    />
                    <header className="relative z-10 border-b border-[#dcd2c4]/80 bg-[#fbf8f1]/82 backdrop-blur-md">
                        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
                            <Link
                                href="/notes"
                                className="inline-flex items-center gap-2 rounded-full font-serif text-sm text-[#6f675d] hover:text-[#211f1b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9a5428]"
                            >
                                <ArrowLeft className="size-4" /> All notes
                            </Link>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <a
                                    href={exportUrl}
                                    download
                                    className="inline-flex items-center gap-2 rounded-full border border-[#cfc1af] bg-[#fffaf2]/80 px-4 py-2 font-serif text-sm text-[#5f554a] transition hover:border-[#bba78f] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a5428]"
                                >
                                    <Download className="size-4" />
                                    <span className="hidden sm:inline">
                                        Export note
                                    </span>
                                    <span className="sm:hidden">Export</span>
                                </a>
                                <Link
                                    href={editUrl}
                                    className="inline-flex items-center gap-2 rounded-full bg-[#a95624] px-4 py-2 font-serif text-sm font-semibold text-white shadow-[0_7px_18px_rgba(133,70,31,0.2)] transition hover:bg-[#8f471d] hover:shadow-[0_9px_22px_rgba(133,70,31,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f3e19]"
                                >
                                    <Pencil className="size-4" /> Edit note
                                </Link>
                            </div>
                        </div>
                    </header>

                    <main className="relative z-10 mx-auto max-w-4xl px-5 pt-8 pb-20 sm:px-8 sm:pt-12 lg:pt-16">
                        <article className="rounded-[2rem] border border-[#ded4c7] bg-[#fffdf8]/94 px-6 py-10 shadow-[0_28px_90px_rgba(65,47,29,0.12)] sm:px-12 sm:py-14 lg:px-20 lg:py-16">
                            <header className="relative border-b border-[#e4dbcf] pb-10 text-center sm:pb-12">
                                <p className="font-sans text-[0.64rem] font-semibold tracking-[0.26em] text-[#8f6e42] uppercase">
                                    Personal note · {edition.abbreviation}
                                </p>
                                <h1 className="mx-auto mt-5 max-w-3xl font-serif text-4xl leading-[1.04] font-black tracking-[-0.035em] text-[#171815] sm:text-6xl">
                                    {note.title}
                                </h1>
                                <div className="relative mt-6 inline-block">
                                    <button
                                        type="button"
                                        onClick={openAttachedPassage}
                                        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#dbcbb7] bg-[#f7efe3] px-4 py-2 font-serif text-sm text-[#70522f] transition hover:border-[#c5a57c] hover:bg-[#f2e5d3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a5428]"
                                        aria-expanded={
                                            linkedPassage?.kind === 'attachment'
                                        }
                                        aria-controls="linked-passage-drawer"
                                    >
                                        <BookOpen className="size-4" />
                                        {note.attachmentLabel}
                                    </button>
                                </div>
                                {note.tags.length > 0 && (
                                    <ul
                                        aria-label="Note tags"
                                        className="mt-5 flex flex-wrap justify-center gap-2"
                                    >
                                        {note.tags.map((tag) => (
                                            <li
                                                key={tag.id}
                                                className="rounded-full border border-[#dfd2c1] bg-[#f3eadc] px-3 py-1 font-sans text-xs font-medium text-[#684c30]"
                                            >
                                                {tag.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </header>

                            <div className="mx-auto mt-10 max-w-[42rem] sm:mt-14">
                                <NoteContent
                                    markdown={note.bodyMarkdown}
                                    onScriptureLink={openScriptureLink}
                                />
                            </div>

                            <footer className="mx-auto mt-14 flex max-w-[42rem] items-center justify-between gap-4 border-t border-[#e4dbcf] pt-6 font-serif text-sm text-[#81786c]">
                                <span>
                                    {updated ? `Updated ${updated}` : ''}
                                </span>
                                <Link
                                    href={readerUrl}
                                    className="inline-flex items-center gap-2 text-[#70522f] hover:text-[#372717]"
                                >
                                    <BookOpen className="size-4" /> Read passage
                                </Link>
                            </footer>
                        </article>
                    </main>
                    {linkedPassage && (
                        <div
                            className={`fixed inset-0 z-[70] bg-stone-950/25 backdrop-blur-[2px] transition-[opacity,backdrop-filter] duration-300 motion-reduce:transition-none ${linkedPassageClosing ? 'opacity-0 backdrop-blur-none' : 'animate-in fade-in opacity-100'}`}
                        >
                            <button
                                type="button"
                                className="absolute inset-0 cursor-default"
                                aria-label="Close linked passage"
                                onClick={closeLinkedPassage}
                            />
                            <aside
                                id="linked-passage-drawer"
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="linked-passage-title"
                                className={`absolute inset-y-0 right-0 flex w-[min(46rem,94vw)] flex-col border-l border-[#d8cab8] bg-[#fffaf2] shadow-[-24px_0_70px_rgba(48,36,24,0.2)] transition-transform duration-300 ease-out motion-reduce:transition-none ${linkedPassageClosing ? 'translate-x-full' : 'animate-in slide-in-from-right translate-x-0'}`}
                            >
                                <header className="flex shrink-0 items-start justify-between gap-6 border-b border-[#e4d8c9] px-6 py-6 sm:px-9">
                                    <div>
                                        <p className="font-sans text-[0.64rem] font-semibold tracking-[0.22em] text-[#9a5428] uppercase">
                                            {linkedPassage.kind === 'attachment'
                                                ? 'Attached passage'
                                                : 'Scripture reference'}{' '}
                                            · {edition.abbreviation}
                                        </p>
                                        <h2
                                            id="linked-passage-title"
                                            className="mt-2 font-serif text-3xl font-black text-[#201f1b]"
                                        >
                                            {linkedPassageLabel}
                                        </h2>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={closeLinkedPassage}
                                        className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-[#ddd0bf] hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#9a5428]"
                                        aria-label="Close linked passage"
                                    >
                                        <X className="size-5" />
                                    </button>
                                </header>
                                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-8 sm:px-9 sm:py-10">
                                    {linkedPassage.selectedText ? (
                                        <blockquote className="border-l-2 border-[#b66b36] pl-5 font-serif text-xl leading-9 text-[#332f2a] italic">
                                            “{linkedPassage.selectedText}”
                                        </blockquote>
                                    ) : linkedVerses.length ? (
                                        <div className="grid gap-5 font-serif text-xl leading-9 text-[#332f2a]">
                                            {passageContent(
                                                linkedVerses,
                                                false,
                                            )}
                                        </div>
                                    ) : linkedPassageError || sourceError ? (
                                        <p className="font-serif text-[#81776c] italic">
                                            The passage could not be loaded just
                                            now.
                                        </p>
                                    ) : (
                                        <div
                                            className="grid gap-5"
                                            aria-label="Preparing passage"
                                        >
                                            {[72, 91, 83, 65].map((width) => (
                                                <div
                                                    key={width}
                                                    className="h-5 animate-pulse rounded-full bg-[#e7ded1]"
                                                    style={{
                                                        width: `${width}%`,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <footer className="shrink-0 border-t border-[#e4d8c9] bg-[#faf4ea] px-6 py-5 sm:px-9">
                                    <Link
                                        href={
                                            linkedPassage.readerUrl ??
                                            `/read/${linkedPassage.bookCode}/${linkedPassage.chapter}?from_note=${note.id}#verse-${linkedPassage.verseStart}`
                                        }
                                        className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-[#a95624] px-5 py-3.5 font-serif text-base font-semibold text-white shadow-[0_8px_22px_rgba(133,70,31,0.2)] transition hover:bg-[#8f471d] hover:shadow-[0_10px_26px_rgba(133,70,31,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f3e19] sm:w-auto"
                                    >
                                        Open in the full reader
                                        <span aria-hidden="true">→</span>
                                    </Link>
                                </footer>
                            </aside>
                        </div>
                    )}
                </div>
            </SavedItemsPageShell>
        </>
    );
}
