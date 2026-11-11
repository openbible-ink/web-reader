import SavedItemsPageShell from '@/components/saved-items-page-shell';
import { getBookGradient } from '@/lib/book-gradients';
import { getCanonicalBookMetadata } from '@/lib/book-metadata';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

interface Book {
    code: string;
    name: string;
    longName?: string | null;
    testament: 'old' | 'new';
}

interface BooksProps {
    books: Book[];
}

function BookShelf({
    books,
    label,
    description,
    transitioningBook,
    onTransitionStart,
}: {
    books: Book[];
    label: string;
    description: string;
    transitioningBook: string | null;
    onTransitionStart: (bookCode: string) => void;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    const headingId = `${label.toLowerCase().replace(' ', '-')}-heading`;

    useLayoutEffect(() => {
        if (
            window.sessionStorage.getItem('book-transition-return') !== 'true' ||
            !transitioningBook
        ) {
            return;
        }

        const track = trackRef.current;
        const card = track?.querySelector<HTMLElement>(
            `[data-book-code="${transitioningBook}"]`,
        );

        if (!track || !card) {
            return;
        }

        track.scrollLeft = Math.max(
            0,
            card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2,
        );
    }, [transitioningBook]);

    const scroll = (direction: -1 | 1) => {
        trackRef.current?.scrollBy({
            left: direction * Math.min(window.innerWidth * 0.75, 920),
            behavior: 'smooth',
        });
    };

    return (
        <section aria-labelledby={headingId} className="min-w-0">
            <div className="flex items-end justify-between gap-6 px-6 sm:px-10 lg:px-14">
                <div>
                    <h2 id={headingId} className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
                        {label}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
                        {description}
                    </p>
                </div>
                <div className={`${books.length > 1 ? 'hidden sm:flex' : 'hidden'} shrink-0 items-center gap-0.5 rounded-full bg-[#e7ddcf] p-1`}>
                    <button
                        type="button"
                        onClick={() => scroll(-1)}
                        aria-label={`Scroll ${label} books left`}
                        className="grid size-9 cursor-pointer place-items-center rounded-full border border-transparent bg-transparent text-stone-700 transition hover:bg-[#fffdf8]/85 focus-visible:bg-[#fffdf8]/85 focus-visible:ring-2 focus-visible:ring-[#a95624]/45 focus-visible:outline-none"
                    >
                        <ArrowLeft className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => scroll(1)}
                        aria-label={`Scroll ${label} books right`}
                        className="grid size-9 cursor-pointer place-items-center rounded-full border border-transparent bg-transparent text-stone-700 transition hover:bg-[#fffdf8]/85 focus-visible:bg-[#fffdf8]/85 focus-visible:ring-2 focus-visible:ring-[#a95624]/45 focus-visible:outline-none"
                    >
                        <ArrowRight className="size-4" />
                    </button>
                </div>
            </div>

            <div
                ref={trackRef}
                tabIndex={0}
                aria-label={`${label} books`}
                className="mt-2 flex snap-x snap-mandatory scroll-ps-6 gap-4 overflow-x-auto px-6 py-7 sm:scroll-ps-10 sm:px-10 lg:scroll-ps-14 lg:px-14 [scrollbar-width:none] focus-visible:outline-none [&::-webkit-scrollbar]:hidden"
            >
                {books.map((book) => {
                    const metadata = getCanonicalBookMetadata(book.code);
                    const gradient = getBookGradient(book.code);
                    const visualStyle = metadata.artworkUrl
                        ? {
                              backgroundColor: gradient.backgroundColor,
                              backgroundImage: `url('${metadata.artworkUrl}')`,
                              backgroundPosition: metadata.artworkPosition ?? 'center',
                          }
                        : {
                              backgroundColor: gradient.backgroundColor,
                              backgroundImage: gradient.backgroundImage,
                          };

                    return (
                        <Link
                            key={book.code}
                            href={`/books/${book.code}`}
                            viewTransition
                            onClick={() => onTransitionStart(book.code)}
                            data-book-code={book.code}
                            style={{
                                viewTransitionName:
                                    transitioningBook === book.code
                                        ? 'book-card'
                                        : 'none',
                            }}
                            className="group relative h-[25rem] w-[15.5rem] shrink-0 snap-start overflow-hidden rounded-[1.65rem] border border-black/8 bg-stone-200 shadow-[0_16px_42px_-28px_rgba(45,35,24,0.58)] transition-shadow duration-500 [container-type:inline-size] hover:shadow-[0_24px_52px_-20px_rgba(45,35,24,0.82)] focus-visible:ring-3 focus-visible:ring-[#a95624]/55 focus-visible:ring-offset-3 focus-visible:ring-offset-[#f4efe5] focus-visible:outline-none sm:h-[27rem] sm:w-64"
                        >
                            <span
                                aria-hidden="true"
                                className="absolute inset-0 bg-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                                style={visualStyle}
                            />
                            <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,18,14,0.02)_20%,rgba(20,18,14,0.26)_55%,rgba(20,18,14,0.92)_100%)]" />
                            <span
                                style={{
                                    viewTransitionName:
                                        transitioningBook === book.code
                                            ? 'book-category'
                                            : 'none',
                                }}
                                className="absolute top-6 left-6 z-10 rounded-full bg-black/20 px-3 py-1.5 text-[0.65rem] font-semibold tracking-[0.24em] text-[#fff4e7] uppercase shadow-sm backdrop-blur-[2px] sm:top-7 sm:left-7"
                            >
                                {metadata.category}
                            </span>
                            <span className="absolute inset-x-0 bottom-0 z-10 flex min-h-[48%] flex-col justify-end p-6 text-[#fffaf1] sm:p-7">
                                <span className="block">
                                    <span
                                        style={{
                                            viewTransitionName:
                                                transitioningBook === book.code
                                                    ? 'book-title'
                                                    : 'none',
                                        }}
                                        className="font-serif text-[clamp(1.75rem,12cqi,2.4rem)] leading-[1.02] font-black tracking-[-0.035em] decoration-[0.06em] underline-offset-[0.13em] group-hover:underline group-focus-visible:underline"
                                    >
                                        {book.name}
                                    </span>
                                </span>
                                <span
                                    style={{
                                        viewTransitionName:
                                            transitioningBook === book.code
                                                ? 'book-description'
                                                : 'none',
                                    }}
                                    className="mt-4 line-clamp-3 text-sm leading-relaxed text-white/78"
                                >
                                    {metadata.description}
                                </span>
                            </span>
                        </Link>
                    );
                })}
                {books.length === 0 && (
                    <div className="flex w-[calc(100%-3rem)] shrink-0 items-center justify-center rounded-[1.5rem] border border-dashed border-[#cfc3b4] bg-white/35 px-6 py-4 text-center text-stone-600 sm:w-[calc(100%-5rem)] lg:w-[calc(100%-7rem)]">
                        No books in this Testament match those filters.
                    </div>
                )}
            </div>
        </section>
    );
}

export default function Books({ books }: BooksProps) {
    const [query, setQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [transitioningBook, setTransitioningBook] = useState<string | null>(
        () =>
            typeof window === 'undefined'
                ? null
                : window.sessionStorage.getItem('book-transition-code'),
    );
    const categories = useMemo(
        () => Array.from(new Set(books.map((book) => getCanonicalBookMetadata(book.code).category))),
        [books],
    );
    const filteredBooks = useMemo(() => {
        const normalisedQuery = query.trim().toLocaleLowerCase();

        return books.filter((book) => {
            const metadata = getCanonicalBookMetadata(book.code);
            const matchesName = !normalisedQuery || book.name.toLocaleLowerCase().includes(normalisedQuery);
            const matchesCategory = !selectedCategory || metadata.category === selectedCategory;

            return matchesName && matchesCategory;
        });
    }, [books, query, selectedCategory]);
    const oldTestament = filteredBooks.filter((book) => book.testament === 'old');
    const newTestament = filteredBooks.filter((book) => book.testament === 'new');
    const beginBookTransition = (bookCode: string) => {
        window.sessionStorage.removeItem('book-transition-return');
        window.sessionStorage.setItem('book-transition-code', bookCode);
        window.sessionStorage.setItem('books-scroll-y', String(window.scrollY));
        setTransitioningBook(bookCode);
    };

    useLayoutEffect(() => {
        if (window.sessionStorage.getItem('book-transition-return') !== 'true') {
            return;
        }

        const savedScroll = Number(
            window.sessionStorage.getItem('books-scroll-y') ?? 0,
        );
        window.scrollTo({ top: savedScroll, behavior: 'auto' });
        window.requestAnimationFrame(() =>
            window.sessionStorage.removeItem('book-transition-return'),
        );
    }, []);

    return (
        <>
            <Head title="Books" />
            <SavedItemsPageShell active="read">
                <main className="min-h-[calc(100svh-5rem)] overflow-hidden bg-[#f4efe5] py-12 text-[#25221e] lg:min-h-svh lg:py-14">
                    <header className="px-6 sm:px-10 lg:px-14">
                        <p className="text-xs font-semibold tracking-[0.28em] uppercase">Library</p>
                        <h1 className="mt-2 font-serif text-6xl font-black tracking-[-0.045em] sm:text-7xl">Books</h1>
                        <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
                            Move through the library one book at a time, from ancient beginnings to the vision of all things made new.
                        </p>

                        <div className="mt-9 max-w-4xl">
                            <div className="relative max-w-xl">
                                <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-stone-500" />
                                <label htmlFor="book-search" className="sr-only">Search books by name</label>
                                <input
                                    id="book-search"
                                    type="search"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Search books…"
                                    className="h-14 w-full rounded-full border border-[#d7cdbf] bg-[#fffdf8]/80 pr-5 pl-13 text-base text-stone-900 shadow-sm outline-none transition placeholder:text-stone-500 focus:border-[#a95624] focus:ring-3 focus:ring-[#a95624]/15"
                                />
                            </div>

                            <div aria-label="Filter books by category" className="mt-4 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategory(null)}
                                    aria-pressed={selectedCategory === null}
                                    className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-[#a95624]/45 focus-visible:outline-none ${
                                        selectedCategory === null
                                            ? 'border-[#9f5428] bg-[#9f5428] text-white'
                                            : 'border-[#d7cdbf] bg-[#fffdf8]/70 text-stone-700 hover:border-[#bd9b78] hover:bg-white'
                                    }`}
                                >
                                    All books
                                </button>
                                {categories.map((category) => (
                                    <button
                                        key={category}
                                        type="button"
                                        onClick={() => setSelectedCategory((current) => current === category ? null : category)}
                                        aria-pressed={selectedCategory === category}
                                        className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-[#a95624]/45 focus-visible:outline-none ${
                                            selectedCategory === category
                                                ? 'border-[#9f5428] bg-[#9f5428] text-white'
                                                : 'border-[#d7cdbf] bg-[#fffdf8]/70 text-stone-700 hover:border-[#bd9b78] hover:bg-white'
                                        }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </header>

                    <div className="mt-12 grid min-w-0 gap-16 sm:mt-14 sm:gap-20">
                        <BookShelf
                            books={oldTestament}
                            label="Old Testament"
                            description="Law, history, poetry, wisdom, and prophecy trace the long story of Israel and its hope."
                            transitioningBook={transitioningBook}
                            onTransitionStart={beginBookTransition}
                        />
                        <BookShelf
                            books={newTestament}
                            label="New Testament"
                            description="The life of Jesus, the birth of the church, and letters of faith culminate in a vision of renewal."
                            transitioningBook={transitioningBook}
                            onTransitionStart={beginBookTransition}
                        />
                    </div>
                </main>
            </SavedItemsPageShell>
        </>
    );
}
