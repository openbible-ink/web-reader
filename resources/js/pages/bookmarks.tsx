import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Bookmark, BookOpen, Trash2 } from 'lucide-react';

interface BookmarkItem {
    id: string;
    title?: string | null;
    reference: string;
    readerUrl: string;
    edition: {
        name: string;
        abbreviation: string;
    };
}

export default function Bookmarks({
    bookmarks,
}: {
    bookmarks: BookmarkItem[];
}) {
    const remove = (bookmark: BookmarkItem) => {
        if (
            !window.confirm(`Remove “${bookmark.title || bookmark.reference}”?`)
        ) {
            return;
        }

        router.delete(`/bookmarks/${bookmark.id}`, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Bookmarks" />
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
                            <BookOpen className="size-4" />
                            Reader
                        </Link>
                    </div>
                </header>

                <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
                    <Link
                        href="/dashboard"
                        className="mb-7 inline-flex items-center gap-2 font-serif text-sm text-[#71695e] hover:text-black"
                    >
                        <ArrowLeft className="size-4" />
                        Dashboard
                    </Link>
                    <div className="flex items-end justify-between gap-5">
                        <div>
                            <h1 className="font-serif text-5xl tracking-[-0.045em] sm:text-6xl">
                                Bookmarks
                            </h1>
                            <p className="mt-3 font-serif text-lg text-[#7b7368]">
                                Passages you want to return to.
                            </p>
                        </div>
                        <span className="font-serif text-sm text-[#8a8277]">
                            {bookmarks.length}{' '}
                            {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
                        </span>
                    </div>

                    {bookmarks.length ? (
                        <div className="mt-9 overflow-hidden rounded-2xl border border-[#ded6ca] bg-[#fffdf8]/80 shadow-[0_12px_35px_rgba(69,52,31,0.05)]">
                            {bookmarks.map((bookmark) => (
                                <article
                                    key={bookmark.id}
                                    className="flex items-center gap-4 border-b border-[#e4ddd2] p-5 last:border-b-0 sm:p-6"
                                >
                                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#eee5d8] text-[#775d35]">
                                        <Bookmark className="size-5 fill-current stroke-[1.4]" />
                                    </span>
                                    <Link
                                        href={bookmark.readerUrl}
                                        className="min-w-0 flex-1 rounded focus-visible:outline-2 focus-visible:outline-[#a95624]"
                                    >
                                        <h2 className="truncate font-serif text-xl">
                                            {bookmark.title ||
                                                bookmark.reference}
                                        </h2>
                                        <p className="mt-1 font-serif text-sm text-[#7e776d]">
                                            {bookmark.reference} ·{' '}
                                            {bookmark.edition.abbreviation}
                                        </p>
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => remove(bookmark)}
                                        className="grid size-10 shrink-0 place-items-center rounded-full text-[#9b3f29] hover:bg-[#f5e6df] focus-visible:outline-2 focus-visible:outline-[#9b3f29]"
                                        aria-label={`Remove ${bookmark.title || bookmark.reference}`}
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <section className="mt-9 flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-[#d4cabd] bg-[#faf6ef]/70 px-6 text-center">
                            <Bookmark className="size-10 stroke-[#927651] stroke-[1.25]" />
                            <h2 className="mt-4 font-serif text-2xl">
                                No bookmarks yet
                            </h2>
                            <p className="mt-2 max-w-md font-serif leading-7 text-[#7b7368]">
                                Use the bookmark button in the reader to save a
                                chapter, section, or verse range.
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
