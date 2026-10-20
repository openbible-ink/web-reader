import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, BookOpen, FileText, Pencil, Trash2 } from 'lucide-react';

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

function excerpt(markdown: string): string {
    return markdown
        .replace(/[#>*_`[\]()!-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export default function Notes({ notes }: { notes: NoteItem[] }) {
    const remove = (note: NoteItem) => {
        if (!window.confirm(`Delete “${note.title}”?`)) return;
        router.delete(`/notes/${note.id}`, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Notes" />
            <div className="min-h-svh bg-[#f1ece3] text-[#211f1b]">
                <header className="border-b border-[#ddd4c7] bg-[#faf7f0]">
                    <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a95624]"
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
                            href="/read/oeb/JHN/1"
                            className="flex items-center gap-2 rounded-full border border-[#d9d0c4] bg-white/55 px-4 py-2 font-serif text-sm hover:bg-white"
                        >
                            <BookOpen className="size-4" /> Reader
                        </Link>
                    </div>
                </header>
                <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
                    <Link
                        href="/dashboard"
                        className="mb-7 inline-flex items-center gap-2 font-serif text-sm text-[#71695e] hover:text-black"
                    >
                        <ArrowLeft className="size-4" /> Dashboard
                    </Link>
                    <div className="flex items-end justify-between gap-5">
                        <div>
                            <h1 className="font-serif text-5xl tracking-[-0.045em] sm:text-6xl">
                                Notes
                            </h1>
                            <p className="mt-3 font-serif text-lg text-[#7b7368]">
                                Your reflections, questions, and study notes.
                            </p>
                        </div>
                        <span className="font-serif text-sm text-[#8a8277]">
                            {notes.length}{' '}
                            {notes.length === 1 ? 'note' : 'notes'}
                        </span>
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
                                        <div className="flex items-center gap-1">
                                            <Link
                                                href={note.noteUrl}
                                                className="inline-flex items-center gap-2 rounded-full px-3 py-2 font-serif text-sm text-[#675d52] hover:bg-[#f1e9dd] hover:text-[#211f1b] focus-visible:outline-2 focus-visible:outline-[#a95624]"
                                            >
                                                <BookOpen className="size-4" />
                                                Read
                                            </Link>
                                            <Link
                                                href={note.editUrl}
                                                className="inline-flex items-center gap-2 rounded-full px-3 py-2 font-serif text-sm text-[#675d52] hover:bg-[#f1e9dd] hover:text-[#211f1b] focus-visible:outline-2 focus-visible:outline-[#a95624]"
                                            >
                                                <Pencil className="size-4" />
                                                Edit
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => remove(note)}
                                                className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 font-serif text-sm text-[#9b3f29] hover:bg-[#f5e6df] focus-visible:outline-2 focus-visible:outline-[#9b3f29]"
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
                                Open the reader and use a note marker beside a
                                verse or section—or select some text—to begin.
                            </p>
                            <Link
                                href="/read/oeb/JHN/1"
                                className="mt-6 rounded-full bg-[#1e1f1b] px-6 py-3 font-serif text-sm text-[#fffaf1] hover:bg-black"
                            >
                                Start reading
                            </Link>
                        </section>
                    )}
                </main>
            </div>
        </>
    );
}
