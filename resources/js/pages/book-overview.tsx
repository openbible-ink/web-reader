import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import SavedItemsPageShell from '@/components/saved-items-page-shell';
import { getBookGradient } from '@/lib/book-gradients';
import { getCanonicalBookMetadata } from '@/lib/book-metadata';

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
    const title = `${book.name} — ${edition.name}`;
    const description = `${metadata.description} Read ${book.longName ?? book.name} online in the ${edition.name} (${edition.abbreviation}).`;
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
                    <section
                        style={{ viewTransitionName: 'book-card' }}
                        className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] text-[#fffaf1] shadow-[0_28px_80px_-40px_rgba(41,37,36,0.7)]"
                    >
                        <span
                            aria-hidden="true"
                            className="absolute inset-0 bg-cover"
                            style={visualStyle}
                        />
                        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,18,14,0.12)_5%,rgba(20,18,14,0.42)_48%,rgba(20,18,14,0.78)_100%)]" />

                        <div className="relative z-10 p-9 sm:p-14">
                            <div className="flex items-center gap-3">
                                <Link
                                    href="/books"
                                    viewTransition
                                    preserveScroll
                                    onClick={() => {
                                        window.sessionStorage.setItem(
                                            'book-transition-code',
                                            book.code,
                                        );
                                        window.sessionStorage.setItem(
                                            'book-transition-return',
                                            'true',
                                        );
                                    }}
                                    aria-label="Back to books"
                                    className="grid size-10 shrink-0 place-items-center rounded-full bg-black/25 text-white transition hover:bg-black/40 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
                                >
                                    <ArrowLeft className="size-4" />
                                </Link>
                                <p
                                    style={{ viewTransitionName: 'book-category' }}
                                    className="rounded-full bg-black/25 px-3 py-1.5 text-[0.67rem] font-semibold tracking-[0.24em] text-[#fff4e7] uppercase shadow-sm backdrop-blur-[2px]"
                                >
                                    {metadata.category}
                                </p>
                            </div>

                            <h1
                                style={{ viewTransitionName: 'book-title' }}
                                className="mt-8 font-serif text-[clamp(3.5rem,10vw,5.75rem)] leading-[0.9] font-black tracking-[-0.05em]"
                            >
                                {book.name}
                            </h1>
                            <p
                                style={{ viewTransitionName: 'book-description' }}
                                className="mt-5 max-w-lg text-base leading-relaxed text-white/82 sm:text-lg"
                            >
                                {metadata.description}
                            </p>

                            <div className="mt-9 rounded-[1.5rem] border border-white/35 bg-[#fffaf1]/92 p-6 text-[#25221e] shadow-[0_18px_45px_-30px_rgba(0,0,0,0.75)] backdrop-blur-md sm:p-8">
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
                                                className={`grid aspect-square w-full cursor-pointer place-items-center rounded-lg font-serif text-base font-semibold tabular-nums transition focus-visible:ring-2 focus-visible:ring-[#a95624]/45 focus-visible:outline-none ${selectedChapter === chapter ? 'bg-[#a95624] text-white shadow-sm' : 'bg-[#e9dfd1] text-stone-800 hover:bg-[#d9c5ad]'}`}
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
                                            className="grid size-8 cursor-pointer place-items-center rounded-full text-stone-600 transition hover:bg-[#e9dfd1] hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-[#a95624]/45 focus-visible:outline-none"
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
                                                className={`grid aspect-square w-full cursor-pointer place-items-center rounded-lg font-serif text-base font-semibold tabular-nums transition focus-visible:ring-2 focus-visible:ring-[#a95624]/45 focus-visible:outline-none ${selectedVerse === verse ? 'bg-[#a95624] text-white shadow-sm' : 'bg-[#e9dfd1] text-stone-800 hover:bg-[#d9c5ad]'}`}
                                            >
                                                {verse}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}
                                <Link
                                    href={`/read/${book.code}/${selectedChapter}#verse-${selectedVerse}`}
                                    className="mt-8 inline-flex items-center gap-3 rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-[#9f5428] focus-visible:ring-2 focus-visible:ring-[#a95624]/45 focus-visible:ring-offset-2 focus-visible:outline-none"
                                >
                                    {book.name} {selectedChapter}:{selectedVerse}
                                    <ArrowRight className="size-4" />
                                </Link>
                            </div>
                        </div>
                    </section>
                </main>
            </SavedItemsPageShell>
        </>
    );
}
