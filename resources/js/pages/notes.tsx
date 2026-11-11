import { Head, Link, router } from '@inertiajs/react';
import {
    BookOpen,
    FileText,
    Pencil,
    Plus,
    Save,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CustomSelect from '@/components/custom-select';
import NoteEditor from '@/components/note-editor';
import SavedItemsPageShell from '@/components/saved-items-page-shell';
import { loadScriptureSource } from '@/lib/scripture-source-cache';
import type { BibleDocument, FlowNode } from 'usfm-parser';
import { parseUsfm } from 'usfm-parser';
import { parseOeb } from 'usfm-parser/oeb';
import { toast } from 'sonner';

interface NoteItem {
    id: string;
    title: string;
    bodyMarkdown: string;
    selectedText?: string | null;
    reference: string;
    readerUrl: string;
    noteUrl: string;
    editUrl: string;
    edition: { name: string; abbreviation: string };
    updatedAt?: string | null;
}

interface NoteBook {
    id: string;
    code: string;
    name: string;
    sourceUrl: string;
    chapterCount: number;
    edition: {
        slug: string;
        name: string;
        abbreviation: string;
        language: string;
        variantProfile?: string | null;
    };
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

function verseNumbers(nodes: FlowNode[]): string[] {
    const numbers: string[] = [];
    const visit = (value: unknown) => {
        if (!value || typeof value !== 'object') return;
        const node = value as {
            type?: string;
            number?: unknown;
            children?: unknown;
        };
        if (
            node.type === 'verseStart' &&
            typeof node.number === 'string' &&
            !numbers.includes(node.number)
        ) {
            numbers.push(node.number);
        }
        if (Array.isArray(node.children)) {
            node.children.forEach(visit);
        }
    };
    nodes.forEach(visit);
    return numbers;
}

function CreateNoteDrawer({
    books,
    open,
    onClose,
}: {
    books: NoteBook[];
    open: boolean;
    onClose: () => void;
}) {
    const [closing, setClosing] = useState(false);
    const [bookId, setBookId] = useState('');
    const [chapter, setChapter] = useState('');
    const [verseStart, setVerseStart] = useState('');
    const [chapterEnd, setChapterEnd] = useState('');
    const [verseEnd, setVerseEnd] = useState('');
    const [title, setTitle] = useState('');
    const [titleAutomatic, setTitleAutomatic] = useState(true);
    const [body, setBody] = useState('');
    const [source, setSource] = useState('');
    const [sourceError, setSourceError] = useState<string>();
    const [saving, setSaving] = useState(false);
    const book = books.find((item) => item.id === bookId);

    const close = () => {
        setClosing(true);
        window.setTimeout(() => {
            setClosing(false);
            onClose();
        }, 280);
    };

    useEffect(() => {
        if (!open) return;
        const dismiss = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close();
        };
        window.addEventListener('keydown', dismiss);
        return () => window.removeEventListener('keydown', dismiss);
    }, [open]);

    useEffect(() => {
        if (!book) {
            setSource('');
            return;
        }
        let active = true;
        setSource('');
        setSourceError(undefined);
        loadScriptureSource(book.sourceUrl)
            .then((value) => {
                if (active) setSource(value);
            })
            .catch(() => {
                if (active)
                    setSourceError(`Unable to load ${book.name}'s verses.`);
            });
        return () => {
            active = false;
        };
    }, [book]);

    const document = useMemo(() => {
        if (!book || !source) return undefined;
        return book.edition.variantProfile === 'oeb'
            ? parseOeb(source)
            : parseUsfm(source, {
                  edition: {
                      id: book.edition.slug,
                      name: book.edition.name,
                      abbreviation: book.edition.abbreviation,
                      language: book.edition.language,
                  },
                  bookCode: book.code,
              });
    }, [book, source]);
    const verses = useMemo(
        () =>
            document && chapter
                ? verseNumbers(chapterContent(document, chapter))
                : [],
        [chapter, document],
    );
    const endingVerses = useMemo(() => {
        if (!document || !chapterEnd) return [];
        const available = verseNumbers(chapterContent(document, chapterEnd));
        return chapterEnd === chapter && verseStart
            ? available.slice(Math.max(0, available.indexOf(verseStart)))
            : available;
    }, [chapter, chapterEnd, document, verseStart]);
    const hasEnd = Boolean(chapterEnd && verseEnd);
    const reference =
        book && chapter && verseStart
            ? `${book.name} ${chapter}:${verseStart}${hasEnd && (chapterEnd !== chapter || verseEnd !== verseStart) ? `–${chapterEnd === chapter ? '' : `${chapterEnd}:`}${verseEnd}` : ''}`
            : '';

    useEffect(() => {
        if (titleAutomatic) setTitle(reference);
    }, [reference, titleAutomatic]);

    if (!open) return null;

    const save = () => {
        if (!book || !chapter || !verseStart || !title.trim() || !body.trim()) {
            toast.error('Choose a passage and add a title and note.');
            return;
        }
        setSaving(true);
        if ((chapterEnd && !verseEnd) || (!chapterEnd && verseEnd)) {
            toast.error('Choose both an ending chapter and ending verse.');
            return;
        }
        const isRange = Boolean(
            hasEnd && (chapterEnd !== chapter || verseEnd !== verseStart),
        );
        router.post(
            '/notes',
            {
                bible_book_id: book.id,
                chapter,
                chapter_end: isRange ? chapterEnd : null,
                anchor_type: isRange ? 'range' : 'verse',
                title: title.trim(),
                body_markdown: body,
                verse_start: verseStart,
                verse_end: isRange ? verseEnd : verseStart,
                segments: [],
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Note saved');
                    setBookId('');
                    setChapter('');
                    setVerseStart('');
                    setChapterEnd('');
                    setVerseEnd('');
                    setTitle('');
                    setTitleAutomatic(true);
                    setBody('');
                    onClose();
                },
                onError: (errors) =>
                    toast.error(
                        Object.values(errors)[0] ?? 'Unable to save the note.',
                    ),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <>
            <button
                type="button"
                aria-label="Close note drawer"
                onClick={close}
                className={`fixed inset-0 z-[75] cursor-default bg-black/20 backdrop-blur-[3px] backdrop-grayscale-[55%] transition-all duration-300 ${closing ? 'opacity-0' : 'opacity-100'}`}
            />
            <aside
                aria-label="Create note"
                className={`fixed inset-y-0 right-0 z-[80] flex w-full max-w-[42rem] flex-col border-l border-[#ded4c7] bg-[#fffdf9] shadow-[-20px_0_70px_rgba(35,27,18,0.2)] transition-transform duration-300 ${closing ? 'translate-x-full' : 'translate-x-0'}`}
            >
                <header className="flex items-start justify-between gap-5 border-b border-[#e3dbcf] px-6 py-5 sm:px-8">
                    <div>
                        <p className="font-sans text-xs font-semibold tracking-[0.18em] text-[#8a7e6e] uppercase">
                            New note
                        </p>
                        <h2 className="mt-1 font-serif text-3xl">
                            Choose a passage
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={close}
                        className="grid size-10 cursor-pointer place-items-center rounded-full text-stone-600 hover:bg-[#f1e9dd] hover:text-stone-950 focus-visible:outline-2 focus-visible:outline-[#a95624]"
                        aria-label="Close"
                    >
                        <X className="size-5" />
                    </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                    <div className="grid gap-5">
                        <label className="grid gap-1.5 font-sans text-xs font-semibold tracking-wide text-stone-500 uppercase">
                            Book
                            <CustomSelect
                                label="Book"
                                value={bookId}
                                placeholder="Choose a book"
                                onChange={(value) => {
                                    setBookId(value);
                                    setChapter('');
                                    setVerseStart('');
                                    setChapterEnd('');
                                    setVerseEnd('');
                                }}
                                options={books.map((item) => ({
                                    value: item.id,
                                    label: item.name,
                                }))}
                                triggerClassName="min-h-[52px] px-4 font-serif text-base font-normal tracking-normal normal-case"
                            />
                        </label>
                        <fieldset className="rounded-2xl border border-[#e3dbcf] bg-[#faf7f1] p-4">
                            <legend className="px-2 font-sans text-xs font-semibold tracking-[0.14em] text-stone-500 uppercase">
                                Start verse
                            </legend>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="grid gap-1.5 font-sans text-xs font-semibold tracking-wide text-stone-500 uppercase">
                                    Chapter
                                    <CustomSelect
                                        label="Start chapter"
                                        value={chapter}
                                        placeholder="Choose a chapter"
                                        disabled={!book}
                                        layout="chapter-grid"
                                        onChange={(value) => {
                                            setChapter(value);
                                            setVerseStart('');
                                            setChapterEnd('');
                                            setVerseEnd('');
                                        }}
                                        options={Array.from(
                                            { length: book?.chapterCount ?? 0 },
                                            (_, index) => ({
                                                value: String(index + 1),
                                                label: String(index + 1),
                                            }),
                                        )}
                                        triggerClassName="min-h-[52px] px-4 font-serif text-base font-normal tracking-normal normal-case"
                                    />
                                </label>
                                <label className="grid gap-1.5 font-sans text-xs font-semibold tracking-wide text-stone-500 uppercase">
                                    Verse
                                    <CustomSelect
                                        label="Verse"
                                        value={verseStart}
                                        placeholder={
                                            chapter && !source
                                                ? 'Loading verses…'
                                                : 'Choose a verse'
                                        }
                                        disabled={!chapter || !verses.length}
                                        layout="chapter-grid"
                                        onChange={(value) => {
                                            setVerseStart(value);
                                            setChapterEnd('');
                                            setVerseEnd('');
                                        }}
                                        options={verses.map((verse) => ({
                                            value: verse,
                                            label: verse,
                                        }))}
                                        triggerClassName="min-h-[52px] px-4 font-serif text-base font-normal tracking-normal normal-case"
                                    />
                                </label>
                            </div>
                        </fieldset>
                        <fieldset className="rounded-2xl border border-[#e3dbcf] bg-[#faf7f1] p-4">
                            <legend className="px-2 font-sans text-xs font-semibold tracking-[0.14em] text-stone-500 uppercase">
                                End verse{' '}
                                <span className="normal-case opacity-70">
                                    (optional)
                                </span>
                            </legend>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="grid gap-1.5 font-sans text-xs font-semibold tracking-wide text-stone-500 uppercase">
                                    Chapter
                                    <CustomSelect
                                        label="End chapter"
                                        value={chapterEnd}
                                        placeholder="No end chapter"
                                        disabled={!verseStart}
                                        layout="chapter-grid"
                                        onChange={(value) => {
                                            setChapterEnd(value);
                                            setVerseEnd('');
                                        }}
                                        options={Array.from(
                                            { length: book?.chapterCount ?? 0 },
                                            (_, index) => String(index + 1),
                                        )
                                            .filter(
                                                (value) =>
                                                    Number.parseInt(
                                                        value,
                                                        10,
                                                    ) >=
                                                    Number.parseInt(
                                                        chapter,
                                                        10,
                                                    ),
                                            )
                                            .map((value) => ({
                                                value,
                                                label: value,
                                            }))}
                                        triggerClassName="min-h-[52px] px-4 font-serif text-base font-normal tracking-normal normal-case"
                                    />
                                </label>
                                <label className="grid gap-1.5 font-sans text-xs font-semibold tracking-wide text-stone-500 uppercase">
                                    Verse
                                    <CustomSelect
                                        label="End verse"
                                        value={verseEnd}
                                        placeholder="Choose an end verse"
                                        disabled={
                                            !chapterEnd || !endingVerses.length
                                        }
                                        layout="chapter-grid"
                                        onChange={setVerseEnd}
                                        options={endingVerses.map((verse) => ({
                                            value: verse,
                                            label: verse,
                                        }))}
                                        triggerClassName="min-h-[52px] px-4 font-serif text-base font-normal tracking-normal normal-case"
                                    />
                                </label>
                            </div>
                            {chapterEnd && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setChapterEnd('');
                                        setVerseEnd('');
                                    }}
                                    className="mt-3 cursor-pointer font-sans text-xs font-semibold text-[#8a542c] hover:text-[#4f2e17]"
                                >
                                    Clear ending passage
                                </button>
                            )}
                        </fieldset>
                        {sourceError && (
                            <p role="alert" className="text-sm text-red-700">
                                {sourceError}
                            </p>
                        )}
                        {reference && (
                            <p className="rounded-xl bg-[#f5ede1] px-4 py-3 font-serif text-sm text-[#725b3e]">
                                Attached to {reference}
                            </p>
                        )}
                        <label className="grid gap-1.5 font-sans text-xs font-semibold tracking-wide text-stone-500 uppercase">
                            Title
                            <input
                                value={title}
                                onChange={(event) => {
                                    setTitleAutomatic(false);
                                    setTitle(event.target.value);
                                }}
                                placeholder="Give this note a title"
                                maxLength={180}
                                className="min-h-[54px] rounded-xl border border-stone-300 bg-white px-4 py-3 font-serif text-lg font-normal tracking-normal text-stone-900 normal-case outline-none focus:border-[#9a5428] focus:ring-2 focus:ring-[#9a5428]/15"
                            />
                        </label>
                        <div>
                            <span className="mb-1.5 block font-sans text-xs font-semibold tracking-wide text-stone-500 uppercase">
                                Note
                            </span>
                            <NoteEditor
                                value={body}
                                onChange={setBody}
                                disabled={saving}
                            />
                        </div>
                    </div>
                </div>
                <footer className="border-t border-[#e3dbcf] bg-[#faf7f1]/95 px-6 py-4 sm:px-8">
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving}
                        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-positive px-5 py-3 font-serif text-sm font-semibold text-positive-foreground hover:bg-positive-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-positive disabled:cursor-wait disabled:opacity-55"
                    >
                        <Save className="size-4" />{' '}
                        {saving ? 'Saving…' : 'Save note'}
                    </button>
                </footer>
            </aside>
        </>
    );
}

function excerpt(markdown: string): string {
    return markdown
        .replace(/[#>*_`[\]()!-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export default function Notes({
    notes,
    books,
}: {
    notes: NoteItem[];
    books: NoteBook[];
}) {
    const [createOpen, setCreateOpen] = useState(false);
    const remove = (note: NoteItem) => {
        if (!window.confirm(`Delete “${note.title}”?`)) return;
        router.delete(`/notes/${note.id}`, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Notes" />
            <SavedItemsPageShell active="notes">
                <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
                    <div className="flex items-start justify-between gap-5">
                        <div>
                            <h1 className="font-serif text-5xl font-black tracking-[-0.045em] sm:text-6xl">
                                Notes
                            </h1>
                            <p className="mt-3 font-serif text-lg text-[#7b7368]">
                                Your reflections, questions, and study notes.
                            </p>
                            <p className="mt-1.5 font-serif text-sm text-[#8a8277]">
                                ({notes.length}{' '}
                                {notes.length === 1 ? 'note' : 'notes'})
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            <button
                                type="button"
                                onClick={() => setCreateOpen(true)}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-positive px-5 py-3 font-serif text-sm font-semibold text-positive-foreground shadow-[0_8px_22px_rgba(46,80,54,0.16)] hover:bg-positive-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-positive"
                            >
                                <Plus className="size-4" /> Create note
                            </button>
                        </div>
                    </div>
                    {notes.length ? (
                        <div className="mt-9 grid gap-4 sm:grid-cols-2">
                            {notes.map((note) => (
                                <article
                                    key={note.id}
                                    className="flex min-h-64 flex-col rounded-2xl border border-[#ded6ca] bg-[#fffdf8]/85 p-6 shadow-[0_12px_35px_rgba(69,52,31,0.05)]"
                                >
                                    <Link
                                        href={note.noteUrl}
                                        className="flex-1 rounded focus-visible:outline-2 focus-visible:outline-[#a95624]"
                                    >
                                        <div className="flex items-center gap-3 text-[#89683b]">
                                            <span className="grid size-9 place-items-center rounded-full bg-[#eee5d8]">
                                                <FileText className="size-4" />
                                            </span>
                                            <span className="font-serif text-sm">
                                                {note.reference} ·{' '}
                                                {note.edition.abbreviation}
                                            </span>
                                        </div>
                                        <h2 className="mt-5 font-serif text-2xl font-semibold">
                                            {note.title}
                                        </h2>
                                        {note.selectedText && (
                                            <p className="mt-3 line-clamp-2 border-l-2 border-[#c69a61] pl-3 font-serif text-sm text-[#786f63] italic">
                                                “{note.selectedText}”
                                            </p>
                                        )}
                                        <p className="mt-3 line-clamp-4 font-serif leading-7 text-[#554f47]">
                                            {excerpt(note.bodyMarkdown)}
                                        </p>
                                    </Link>
                                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7dfd4] pt-4">
                                        <span className="font-serif text-xs text-[#928a7e]">
                                            {note.updatedAt
                                                ? new Date(
                                                      note.updatedAt,
                                                  ).toLocaleDateString(
                                                      undefined,
                                                      {
                                                          day: 'numeric',
                                                          month: 'short',
                                                          year: 'numeric',
                                                      },
                                                  )
                                                : ''}
                                        </span>
                                        <div className="note-card-actions flex items-center">
                                            <Link
                                                href={note.noteUrl}
                                                className="note-card-action inline-flex items-center gap-2 rounded-full px-3 py-2 font-serif text-sm text-[#675d52] hover:bg-[#f1e9dd] hover:text-[#211f1b] focus-visible:outline-2 focus-visible:outline-[#a95624]"
                                            >
                                                <BookOpen className="size-4" />
                                                Read
                                            </Link>
                                            <span
                                                aria-hidden="true"
                                                className="note-card-action-separator mx-1 h-5 w-px bg-[#d7cdc0]"
                                            />
                                            <Link
                                                href={note.editUrl}
                                                className="note-card-action inline-flex items-center gap-2 rounded-full px-3 py-2 font-serif text-sm text-[#675d52] hover:bg-[#f1e9dd] hover:text-[#211f1b] focus-visible:outline-2 focus-visible:outline-[#a95624]"
                                            >
                                                <Pencil className="size-4" />
                                                Edit
                                            </Link>
                                            <span
                                                aria-hidden="true"
                                                className="note-card-action-separator mx-1 h-5 w-px bg-[#d7cdc0]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => remove(note)}
                                                className="note-card-action inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 font-serif text-sm text-[#9b3f29] hover:bg-[#f5e6df] focus-visible:outline-2 focus-visible:outline-[#9b3f29]"
                                            >
                                                <Trash2 className="size-4" />
                                                <span className="sr-only sm:not-sr-only">
                                                    Remove
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <section className="mt-9 flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-[#d4cabd] bg-[#faf6ef]/70 px-6 text-center">
                            <FileText className="size-10 stroke-[#927651] stroke-[1.25]" />
                            <h2 className="mt-4 font-serif text-2xl">
                                No notes yet
                            </h2>
                            <p className="mt-2 max-w-md font-serif leading-7 text-[#7b7368]">
                                Create a note here by choosing a passage, or add
                                one while reading.
                            </p>
                            <button
                                type="button"
                                onClick={() => setCreateOpen(true)}
                                className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-positive px-6 py-3 font-serif text-sm font-semibold text-positive-foreground hover:bg-positive-hover focus-visible:outline-2 focus-visible:outline-positive"
                            >
                                <Plus className="size-4" /> Create your first
                                note
                            </button>
                        </section>
                    )}
                </main>
                <CreateNoteDrawer
                    books={books}
                    open={createOpen}
                    onClose={() => setCreateOpen(false)}
                />
            </SavedItemsPageShell>
        </>
    );
}
