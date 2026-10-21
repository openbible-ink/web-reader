import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, BookOpen, Pencil, X } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import NoteContent from '@/components/note-content';
import {
    cachedScriptureSource,
    loadScriptureSource,
} from '@/lib/scripture-source-cache';
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
    };
    edition: {
        slug: string;
        name: string;
        abbreviation: string;
        language: string;
        variantProfile?: string | null;
    };
    book: { code: string; name: string; sourceUrl: string };
    readerUrl: string;
    editUrl: string;
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
                if (current) current.text += inlineText(node);
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
    readerUrl,
    editUrl,
}: NotePageProps) {
    const [passageOpen, setPassageOpen] = useState(false);
    const [source, setSource] = useState(() =>
        cachedScriptureSource(book.sourceUrl),
    );
    const [sourceError, setSourceError] = useState(false);

    useEffect(() => {
        if (source || note.selectedText) return;
        void loadScriptureSource(book.sourceUrl)
            .then(setSource)
            .catch(() => setSourceError(true));
    }, [book.sourceUrl, note.selectedText, source]);

    useEffect(() => {
        if (!passageOpen) return;
        const dismiss = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setPassageOpen(false);
        };
        window.document.addEventListener('keydown', dismiss);
        return () => window.document.removeEventListener('keydown', dismiss);
    }, [passageOpen]);

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

    return (
        <>
            <Head title={note.title} />
            <div className="relative min-h-svh overflow-hidden bg-[#f4efe6] text-[#201f1b]">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-[27rem] bg-[linear-gradient(180deg,rgba(255,252,246,0.08),#f4efe6_95%),url('/images/scripture/john-olive-branch.png')] bg-cover bg-[center_34%] opacity-35"
                />
                <header className="relative z-10 border-b border-[#dcd2c4]/80 bg-[#fbf8f1]/82 backdrop-blur-md">
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9a5428]"
                        >
                            <img
                                src="/images/brand/open-bible-mark-dark-128.png"
                                alt=""
                                className="size-9 object-contain"
                            />
                            <span className="font-serif text-lg font-semibold">
                                Open Bible
                            </span>
                        </Link>
                        <Link
                            href={editUrl}
                            className="inline-flex items-center gap-2 rounded-full border border-[#d4c8b8] bg-[#fffaf2]/75 px-4 py-2 font-serif text-sm transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a5428]"
                        >
                            <Pencil className="size-4" /> Edit note
                        </Link>
                    </div>
                </header>

                <main className="relative z-10 mx-auto max-w-4xl px-5 pt-8 pb-20 sm:px-8 sm:pt-12 lg:pt-16">
                    <Link
                        href="/notes"
                        className="inline-flex items-center gap-2 rounded-full font-serif text-sm text-[#6f675d] hover:text-[#211f1b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9a5428]"
                    >
                        <ArrowLeft className="size-4" /> All notes
                    </Link>

                    <article className="mt-8 rounded-[2rem] border border-[#ded4c7] bg-[#fffdf8]/94 px-6 py-10 shadow-[0_28px_90px_rgba(65,47,29,0.12)] sm:px-12 sm:py-14 lg:px-20 lg:py-16">
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
                                    onClick={() =>
                                        setPassageOpen((open) => !open)
                                    }
                                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#dbcbb7] bg-[#f7efe3] px-4 py-2 font-serif text-sm text-[#70522f] transition hover:border-[#c5a57c] hover:bg-[#f2e5d3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a5428]"
                                    aria-expanded={passageOpen}
                                    aria-controls="attached-passage"
                                >
                                    <BookOpen className="size-4" />
                                    {note.attachmentLabel}
                                </button>

                                {passageOpen && (
                                    <div
                                        id="attached-passage"
                                        role="dialog"
                                        aria-label={`Attached passage: ${note.attachmentLabel}`}
                                        className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100svh-2rem)] w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[#d8cab8] bg-[#fffaf2] text-left shadow-[0_22px_65px_rgba(48,36,24,0.2)]"
                                    >
                                        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e4d8c9] px-5 py-4">
                                            <div>
                                                <p className="font-sans text-[0.61rem] font-semibold tracking-[0.2em] text-[#9a5428] uppercase">
                                                    Attached passage
                                                </p>
                                                <h2 className="mt-1 font-serif text-xl font-semibold">
                                                    {note.attachmentLabel}
                                                </h2>
                                                {note.sectionTitle && (
                                                    <p className="mt-0.5 font-sans text-xs text-[#7c746a]">
                                                        {note.reference}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPassageOpen(false)
                                                }
                                                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#9a5428]"
                                                aria-label="Close passage"
                                            >
                                                <X className="size-4" />
                                            </button>
                                        </div>
                                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 font-serif text-base leading-7 text-[#484139]">
                                            {note.selectedText ? (
                                                <blockquote className="border-l-2 border-[#b66b36] pl-4 italic">
                                                    “{note.selectedText}”
                                                </blockquote>
                                            ) : verses.length ? (
                                                <div className="grid gap-3">
                                                    {passageContent(
                                                        verses,
                                                        Boolean(
                                                            note.chapterEnd &&
                                                            note.chapterEnd !==
                                                                note.chapter,
                                                        ),
                                                    )}
                                                </div>
                                            ) : sourceError ? (
                                                <p className="text-[#81776c] italic">
                                                    The passage could not be
                                                    loaded just now.
                                                </p>
                                            ) : (
                                                <p className="text-[#81776c] italic">
                                                    Preparing the passage…
                                                </p>
                                            )}
                                        </div>
                                        <div className="shrink-0 border-t border-[#e4d8c9] px-5 py-4">
                                            <Link
                                                href={readerUrl}
                                                className="inline-flex items-center gap-2 font-serif text-sm font-semibold text-[#75512b] hover:text-[#3f2b17]"
                                            >
                                                Read in context
                                                <span aria-hidden="true">
                                                    →
                                                </span>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </header>

                        <div className="mx-auto mt-10 max-w-[42rem] sm:mt-14">
                            <NoteContent markdown={note.bodyMarkdown} />
                        </div>

                        <footer className="mx-auto mt-14 flex max-w-[42rem] items-center justify-between gap-4 border-t border-[#e4dbcf] pt-6 font-serif text-sm text-[#81786c]">
                            <span>{updated ? `Updated ${updated}` : ''}</span>
                            <Link
                                href={readerUrl}
                                className="inline-flex items-center gap-2 text-[#70522f] hover:text-[#372717]"
                            >
                                <BookOpen className="size-4" /> Read passage
                            </Link>
                        </footer>
                    </article>
                </main>
            </div>
        </>
    );
}
