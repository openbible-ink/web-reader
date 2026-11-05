import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Highlighter,
    Trash2,
} from 'lucide-react';

const colours = {
    yellow: { label: 'Gold', swatch: '#d9a441', wash: '#f6e7ac' },
    green: { label: 'Sage', swatch: '#6d8b68', wash: '#dce8d5' },
    blue: { label: 'Blue', swatch: '#5f85a8', wash: '#d9e7f1' },
    rose: { label: 'Rose', swatch: '#ae6f72', wash: '#f1dadd' },
} as const;

type HighlightColour = keyof typeof colours;

interface HighlightItem {
    id: string;
    color: HighlightColour;
    selectedText: string;
    reference: string;
    readerUrl: string;
    edition: { name: string; abbreviation: string };
}

interface PaginatedHighlights {
    data: HighlightItem[];
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
    from: number | null;
    to: number | null;
}

export default function Highlights({
    highlights,
    highlightLabels,
    colourCounts,
    activeColour,
}: {
    highlights: PaginatedHighlights;
    highlightLabels: Record<HighlightColour, string>;
    colourCounts: Record<HighlightColour, number>;
    activeColour: HighlightColour | null;
}) {
    const totalHighlights = Object.values(colourCounts).reduce(
        (total, count) => total + count,
        0,
    );
    const highlightLabel = (colour: HighlightColour) =>
        highlightLabels[colour]?.trim() || colours[colour].label;
    const loadHighlights = (
        colour: HighlightColour | null,
        page = 1,
    ) => {
        router.get(
            '/highlights',
            {
                ...(colour ? { colour } : {}),
                ...(page > 1 ? { page } : {}),
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ['highlights', 'colourCounts', 'activeColour'],
            },
        );
    };
    const recolour = (highlight: HighlightItem, color: HighlightColour) => {
        if (color === highlight.color) return;
        router.patch(
            `/highlights/${highlight.id}`,
            { color },
            { preserveScroll: true },
        );
    };

    const remove = (highlight: HighlightItem) => {
        if (!window.confirm(`Remove the highlight at ${highlight.reference}?`))
            return;
        router.delete(`/highlights/${highlight.id}`, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Highlights" />
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
                            href="/read/JHN/1"
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
                            <h1 className="font-serif text-5xl font-black tracking-[-0.045em] sm:text-6xl">
                                Highlights
                            </h1>
                            <p className="mt-3 font-serif text-lg text-[#7b7368]">
                                Words and passages that stood out to you.
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className="font-serif text-sm text-[#8a8277]">
                                {totalHighlights}{' '}
                                {totalHighlights === 1
                                    ? 'highlight'
                                    : 'highlights'}
                            </span>
                            <Link
                                href="/dashboard#preferences"
                                className="font-serif text-xs text-[#9a672d] underline decoration-[#9a672d]/35 underline-offset-4 hover:decoration-current"
                            >
                                Edit colour labels
                            </Link>
                        </div>
                    </div>

                    <nav
                        aria-label="Filter highlights by colour"
                        className="mt-8 flex flex-wrap gap-2"
                    >
                        <button
                            type="button"
                            onClick={() => loadHighlights(null)}
                            aria-pressed={activeColour === null}
                            className={`cursor-pointer rounded-full border px-4 py-2 font-serif text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a672d] ${activeColour === null ? 'border-[#2d2b26] bg-[#2d2b26] text-[#fffaf1]' : 'border-[#d6cdc0] bg-[#fffaf2]/65 hover:bg-white'}`}
                        >
                            All{' '}
                            <span className="opacity-65">
                                ({totalHighlights})
                            </span>
                        </button>
                        {(Object.keys(colours) as HighlightColour[]).map(
                            (colour) => {
                                const selected = activeColour === colour;
                                return (
                                    <button
                                        key={colour}
                                        type="button"
                                        onClick={() => loadHighlights(colour)}
                                        aria-pressed={selected}
                                        className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 font-serif text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a672d] ${selected ? 'border-[#2d2b26] bg-[#fffdf8] shadow-sm' : 'border-[#d6cdc0] bg-[#fffaf2]/65 hover:bg-white'}`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="size-4 rounded-full ring-1 ring-black/10"
                                            style={{
                                                backgroundColor:
                                                    colours[colour].swatch,
                                            }}
                                        />
                                        <span>{highlightLabel(colour)}</span>
                                        <span className="opacity-55">
                                            ({colourCounts[colour]})
                                        </span>
                                    </button>
                                );
                            },
                        )}
                    </nav>

                    {highlights.data.length ? (
                        <div className="mt-9 space-y-4">
                            {highlights.data.map((highlight) => {
                                const colour = colours[highlight.color];
                                return (
                                    <article
                                        key={highlight.id}
                                        className="rounded-2xl border border-[#ded6ca] bg-[#fffdf8]/85 p-5 shadow-[0_12px_35px_rgba(69,52,31,0.05)] sm:p-6"
                                    >
                                        <div className="flex items-start gap-4">
                                            <span
                                                className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        colour.wash,
                                                    color: colour.swatch,
                                                }}
                                            >
                                                <Highlighter
                                                    className="size-5"
                                                    strokeWidth={1.7}
                                                />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <Link
                                                    href={highlight.readerUrl}
                                                    className="block rounded focus-visible:outline-2 focus-visible:outline-[#a95624]"
                                                >
                                                    <h2 className="font-serif text-lg font-semibold">
                                                        {highlight.reference}
                                                    </h2>
                                                    <blockquote className="mt-2 font-serif text-xl leading-8 text-[#37322c]">
                                                        “
                                                        {highlight.selectedText}
                                                        ”
                                                    </blockquote>
                                                    <p className="mt-3 font-serif text-sm text-[#7e776d]">
                                                        {highlight.edition.name}{' '}
                                                        (
                                                        {
                                                            highlight.edition
                                                                .abbreviation
                                                        }
                                                        )
                                                    </p>
                                                    {highlightLabels[
                                                        highlight.color
                                                    ]?.trim() && (
                                                        <span
                                                            className="mt-3 inline-flex rounded-full px-3 py-1 font-sans text-xs font-semibold text-[#4f493f]"
                                                            style={{
                                                                backgroundColor:
                                                                    colour.wash,
                                                            }}
                                                        >
                                                            {highlightLabel(
                                                                highlight.color,
                                                            )}
                                                        </span>
                                                    )}
                                                </Link>
                                                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#e7dfd4] pt-4">
                                                    <fieldset className="flex items-center gap-2">
                                                        <legend className="sr-only">
                                                            Highlight colour
                                                        </legend>
                                                        {Object.entries(
                                                            colours,
                                                        ).map(
                                                            ([key, option]) => (
                                                                <button
                                                                    key={key}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        recolour(
                                                                            highlight,
                                                                            key as HighlightColour,
                                                                        )
                                                                    }
                                                                    className="size-7 cursor-pointer rounded-full border-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#211f1b]"
                                                                    style={{
                                                                        backgroundColor:
                                                                            option.wash,
                                                                        borderColor:
                                                                            key ===
                                                                            highlight.color
                                                                                ? option.swatch
                                                                                : 'transparent',
                                                                    }}
                                                                    aria-label={`Change ${highlight.reference} highlight to ${highlightLabel(key as HighlightColour)}`}
                                                                    title={highlightLabel(
                                                                        key as HighlightColour,
                                                                    )}
                                                                    aria-pressed={
                                                                        key ===
                                                                        highlight.color
                                                                    }
                                                                />
                                                            ),
                                                        )}
                                                    </fieldset>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            remove(highlight)
                                                        }
                                                        className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 font-serif text-sm text-[#9b3f29] hover:bg-[#f5e6df] focus-visible:outline-2 focus-visible:outline-[#9b3f29]"
                                                        aria-label={`Remove highlight at ${highlight.reference}`}
                                                    >
                                                        <Trash2 className="size-4" />{' '}
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                            {highlights.lastPage > 1 && (
                                <nav
                                    aria-label="Highlights pagination"
                                    className="flex items-center justify-between border-t border-[#d9d0c4] pt-5"
                                >
                                    <button
                                        type="button"
                                        disabled={highlights.currentPage <= 1}
                                        onClick={() =>
                                            loadHighlights(
                                                activeColour,
                                                highlights.currentPage - 1,
                                            )
                                        }
                                        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#d6cdc0] bg-[#fffaf2]/65 px-4 py-2 font-serif text-sm transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a672d] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronLeft className="size-4" />
                                        Previous
                                    </button>
                                    <span className="font-serif text-sm text-[#7b7368]">
                                        Page {highlights.currentPage} of{' '}
                                        {highlights.lastPage}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={
                                            highlights.currentPage >=
                                            highlights.lastPage
                                        }
                                        onClick={() =>
                                            loadHighlights(
                                                activeColour,
                                                highlights.currentPage + 1,
                                            )
                                        }
                                        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#d6cdc0] bg-[#fffaf2]/65 px-4 py-2 font-serif text-sm transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a672d] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Next
                                        <ChevronRight className="size-4" />
                                    </button>
                                </nav>
                            )}
                        </div>
                    ) : (
                        <section className="mt-9 flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-[#d4cabd] bg-[#faf6ef]/70 px-6 text-center">
                            <Highlighter className="size-10 stroke-[#927651] stroke-[1.25]" />
                            <h2 className="mt-4 font-serif text-2xl">
                                {activeColour
                                    ? `No ${highlightLabel(activeColour)} highlights yet`
                                    : 'No highlights yet'}
                            </h2>
                            <p className="mt-2 max-w-md font-serif leading-7 text-[#7b7368]">
                                {activeColour
                                    ? 'Choose another colour above, or add one from the reader.'
                                    : 'Select some text in the reader, then choose a colour to save your first highlight.'}
                            </p>
                            <Link
                                href="/read/JHN/1"
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
