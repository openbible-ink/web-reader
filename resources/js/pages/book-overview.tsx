import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import SavedItemsPageShell from '@/components/saved-items-page-shell';

interface BookOverviewProps {
    canonicalUrl: string;
    edition: {
        slug: string;
        name: string;
        abbreviation: string;
    };
    book: {
        code: string;
        name: string;
        longName?: string | null;
        chapterCount: number;
        verseCounts: Record<number, number>;
    };
}

export default function BookOverview({
    edition,
    book,
    canonicalUrl,
}: BookOverviewProps) {
    const [selectionStep, setSelectionStep] = useState<'chapter' | 'verse'>(
        'chapter',
    );
    const [selectedChapter, setSelectedChapter] = useState(1);
    const [selectedVerse, setSelectedVerse] = useState(1);
    const longNamePrefix = book.longName?.endsWith(book.name)
        ? book.longName.slice(0, -book.name.length).trim()
        : book.longName;
    const title = `${book.name} — ${edition.name}`;
    const description = `Read ${book.longName ?? book.name} online in the ${edition.name} (${edition.abbreviation}).`;
    const chapterNumbers = Array.from(
        { length: book.chapterCount },
        (_, index) => index + 1,
    );
    const verseNumbers = Array.from(
        { length: Math.max(1, book.verseCounts[selectedChapter] ?? 0) },
        (_, index) => index + 1,
    );

    const chooseChapter = (chapter: number) => {
        setSelectedChapter(chapter);
        setSelectedVerse(1);
        setSelectionStep('verse');
    };

    return (
        <>
            <Head title={title}>
                <meta head-key="robots" name="robots" content="index,follow" />
                <meta head-key="description" name="description" content={description} />
                <link head-key="canonical" rel="canonical" href={canonicalUrl} />
                <meta head-key="og:type" property="og:type" content="book" />
                <meta head-key="og:title" property="og:title" content={title} />
                <meta head-key="og:description" property="og:description" content={description} />
                <meta head-key="og:url" property="og:url" content={canonicalUrl} />
            </Head>
            <SavedItemsPageShell active="read">
                <main className="grid min-h-[calc(100svh-5rem)] place-items-center bg-[#f4efe5] px-6 py-10 text-[#25221e] lg:min-h-svh">
                    <section className="w-full max-w-2xl rounded-[2rem] bg-[#fffdf9] p-9 shadow-[0_22px_70px_-42px_rgba(41,37,36,0.45)] sm:p-14">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/books"
                                aria-label="Back to books"
                                className="grid size-9 shrink-0 place-items-center rounded-full text-stone-600 transition hover:bg-[#f5eadc] hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-[#a95624]/45 focus-visible:outline-none"
                            >
                                <ArrowLeft className="size-4" />
                            </Link>
                            <p className="text-xs font-semibold tracking-[0.28em] uppercase">
                                {longNamePrefix ?? 'Book overview'}
                            </p>
                        </div>
                        <h1 className="mt-2 font-serif text-7xl font-black tracking-tight">
                            {book.name}
                        </h1>
                        <p className="mt-7 max-w-lg text-stone-600">
                            This is the future overview for {book.name}. Its
                            structure, introductory material and chapter
                            navigation will be designed separately.
                        </p>

                        <div className="mt-9 border-t border-stone-200 pt-7">
                            {selectionStep === 'chapter' ? (
                                <section aria-labelledby="chapter-picker-heading">
                                    <h2
                                        id="chapter-picker-heading"
                                        className="font-serif text-xl font-semibold"
                                    >
                                        Chapter
                                    </h2>
                                    <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-10">
                                        {chapterNumbers.map((chapter) => (
                                            <button
                                                key={chapter}
                                                type="button"
                                                aria-pressed={
                                                    selectedChapter === chapter
                                                }
                                                onClick={() =>
                                                    chooseChapter(chapter)
                                                }
                                                className={`grid aspect-square w-full cursor-pointer place-items-center rounded-lg font-serif text-base font-semibold tabular-nums transition focus-visible:ring-2 focus-visible:ring-[#a95624]/45 focus-visible:outline-none ${selectedChapter === chapter ? 'bg-[#b85c26] text-white shadow-sm' : 'bg-[#f5eadc] text-stone-800 hover:bg-[#e5ceb1]'}`}
                                            >
                                                {chapter}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            ) : (
                                <section aria-labelledby="verse-picker-heading">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            aria-label="Return to chapter selection"
                                            onClick={() =>
                                                setSelectionStep('chapter')
                                            }
                                            className="grid size-8 cursor-pointer place-items-center rounded-full text-stone-600 transition hover:bg-[#f5eadc] hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-[#a95624]/45 focus-visible:outline-none"
                                        >
                                            <ArrowLeft className="size-4" />
                                        </button>
                                        <h2
                                            id="verse-picker-heading"
                                            className="font-serif text-xl font-semibold"
                                        >
                                            Verse
                                        </h2>
                                    </div>
                                    <div className="mt-4 grid max-h-[18.5rem] grid-cols-6 gap-2 overflow-y-auto pe-1 pb-1 sm:grid-cols-10">
                                        {verseNumbers.map((verse) => (
                                            <button
                                                key={verse}
                                                type="button"
                                                aria-pressed={
                                                    selectedVerse === verse
                                                }
                                                onClick={() =>
                                                    setSelectedVerse(verse)
                                                }
                                                className={`grid aspect-square w-full cursor-pointer place-items-center rounded-lg font-serif text-base font-semibold tabular-nums transition focus-visible:ring-2 focus-visible:ring-[#a95624]/45 focus-visible:outline-none ${selectedVerse === verse ? 'bg-[#b85c26] text-white shadow-sm' : 'bg-[#f5eadc] text-stone-800 hover:bg-[#e5ceb1]'}`}
                                            >
                                                {verse}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        <Link
                            href={`/read/${book.code}/${selectedChapter}#verse-${selectedVerse}`}
                            className="mt-10 inline-flex items-center gap-3 rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white"
                        >
                            {book.name} {selectedChapter}:{selectedVerse}
                            <ArrowRight className="size-4" />
                        </Link>
                    </section>
                </main>
            </SavedItemsPageShell>
        </>
    );
}
