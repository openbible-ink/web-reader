import CustomSelect from '@/components/custom-select';
import SavedItemsPageShell from '@/components/saved-items-page-shell';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    BarChart3,
    BookOpen,
    List,
    Search as SearchIcon,
    Sparkles,
} from 'lucide-react';
import {
    type FormEvent,
    type KeyboardEvent,
    type ReactNode,
    useEffect,
    useRef,
    useState,
} from 'react';

type Edition = { slug: string; name: string; abbreviation: string };
type Book = {
    code: string;
    name: string;
    testament: 'old' | 'new';
    category: string;
};
type SearchScope = 'verse' | 'headings' | 'footnotes' | 'notes';
type FilterKind = 'in' | 'book' | 'testament' | 'category';
type SearchFilter = {
    kind: FilterKind;
    value: string;
    label: string;
    bookCode?: string;
};
type FilterOption = SearchFilter & { description: string };
type SearchResult = {
    id: number | string;
    kind?: 'verse' | 'section' | 'note';
    title?: string;
    bookCode: string;
    bookName: string;
    chapter: string;
    verse: string;
    verseStart?: string;
    verseEnd?: string;
    reference?: string;
    sectionTitle: string | null;
    footnoteText: string | null;
    matchedIn: SearchScope[];
    text: string;
    tags?: Array<{ id: string; name: string; slug: string }>;
    url: string;
};
type Pagination = {
    data: SearchResult[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};
type Reference = { label: string; url: string };
type DistributionItem = {
    code?: string;
    key?: string;
    name: string;
    testament?: 'old' | 'new';
    category?: string;
    count: number;
};
type Distribution = {
    books: DistributionItem[];
    testaments: DistributionItem[];
    total: number;
};

function DistributionChart({ distribution }: { distribution: Distribution }) {
    const [groupBy, setGroupBy] = useState<'books' | 'testaments'>('books');
    const [category, setCategory] = useState('all');
    const [hideEmptyBooks, setHideEmptyBooks] = useState(false);
    const bookCategories = Array.from(
        new Set(
            distribution.books
                .map((item) => item.category)
                .filter((value): value is string => Boolean(value)),
        ),
    );
    const categoryBooks = distribution.books.filter(
        (item) => category === 'all' || item.category === category,
    );
    const hasEmptyBooks = categoryBooks.some((item) => item.count === 0);
    const items =
        groupBy === 'books'
            ? categoryBooks.filter((item) => !hideEmptyBooks || item.count > 0)
            : distribution.testaments;
    const maximum = Math.max(...items.map((item) => item.count), 1);
    const displayedTotal = items.reduce((total, item) => total + item.count, 0);

    useEffect(() => {
        if (!hasEmptyBooks) setHideEmptyBooks(false);
    }, [hasEmptyBooks]);

    return (
        <section
            className="mt-5 overflow-hidden rounded-3xl border border-[#d8cdbf] bg-[#fbf8f1] shadow-[0_18px_55px_-40px_rgba(48,37,25,0.7)]"
            aria-labelledby="distribution-heading"
        >
            <div className="border-b border-[#ded4c7] px-6 py-5 sm:px-8">
                <div className="flex flex-wrap items-start justify-between gap-5">
                    <div>
                        <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-[#8a7968] uppercase">
                            Search distribution
                        </p>
                        <h3
                            id="distribution-heading"
                            className="mt-1 font-serif text-2xl font-bold"
                        >
                            Occurrences across scripture
                        </h3>
                        <p className="mt-1 font-serif text-sm text-[#766d62]">
                            {displayedTotal.toLocaleString()} total{' '}
                            {displayedTotal === 1 ? 'instance' : 'instances'}{' '}
                            {groupBy === 'books' && category !== 'all'
                                ? `across ${category.toLowerCase()} books`
                                : 'in the selected search scope'}
                            .
                        </p>
                    </div>
                    <div
                        role="tablist"
                        aria-label="Group distribution by"
                        className="flex rounded-full bg-[#e9dfd1] p-1"
                    >
                        {(['books', 'testaments'] as const).map((value) => (
                            <button
                                key={value}
                                type="button"
                                role="tab"
                                aria-selected={groupBy === value}
                                onClick={() => setGroupBy(value)}
                                className={`cursor-pointer rounded-full px-4 py-2 font-serif text-sm transition focus-visible:ring-2 focus-visible:ring-[#a95624] focus-visible:outline-none ${groupBy === value ? 'bg-[#fffdf8] font-semibold text-[#3c342c] shadow-sm' : 'text-[#71665a] hover:text-[#3c342c]'}`}
                            >
                                {value === 'books' ? 'Book' : 'Testament'}
                            </button>
                        ))}
                    </div>
                </div>
                {groupBy === 'books' && (
                    <div className="mt-5 flex flex-wrap items-center gap-4">
                        <div className="min-w-44 flex-1">
                            <CustomSelect
                                value={category}
                                options={[
                                    { value: 'all', label: 'All categories' },
                                    ...bookCategories.map((value) => ({
                                        value,
                                        label: value,
                                    })),
                                ]}
                                onChange={setCategory}
                                label="Book category"
                                variant="inline"
                                triggerClassName="w-full bg-[#fffdf8]"
                            />
                        </div>
                        <button
                            type="button"
                            disabled={!hasEmptyBooks}
                            aria-pressed={hideEmptyBooks}
                            onClick={() =>
                                setHideEmptyBooks((current) => !current)
                            }
                            className="cursor-pointer font-serif text-sm text-[#8f542c] underline decoration-[#caa27f] underline-offset-4 transition hover:text-[#643719] focus-visible:ring-2 focus-visible:ring-[#a95624] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-[#9d948a] disabled:no-underline disabled:opacity-55"
                        >
                            {hideEmptyBooks
                                ? 'Show empty books'
                                : 'Remove empty books'}
                        </button>
                    </div>
                )}
            </div>
            <div role="tabpanel" className="space-y-2 px-6 py-6 sm:px-8">
                {items.map((item, index) => {
                    const width =
                        item.count === 0
                            ? 0
                            : Math.max((item.count / maximum) * 100, 1.5);
                    return (
                        <div
                            key={`${groupBy}-${category}-${hideEmptyBooks}-${item.code ?? item.key}`}
                            className="grid grid-cols-[minmax(7rem,10rem)_minmax(0,1fr)_3.5rem] items-center gap-3"
                            aria-label={`${item.name}: ${item.count} ${item.count === 1 ? 'instance' : 'instances'}`}
                        >
                            <span
                                className="truncate font-serif text-sm text-[#403830]"
                                title={item.name}
                            >
                                {item.name}
                            </span>
                            <span className="relative h-7 overflow-hidden rounded-md bg-[#eee7dc]">
                                <span
                                    className="distribution-bar-enter absolute inset-y-0 left-0 rounded-md bg-[linear-gradient(90deg,#79aeca,#356f91)]"
                                    style={{
                                        width: `${width}%`,
                                        animationDelay: `${Math.min(index * 22, 440)}ms`,
                                    }}
                                />
                            </span>
                            <span className="text-right font-mono text-xs font-semibold text-[#715f50]">
                                {item.count.toLocaleString()}
                            </span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function SearchResultsSkeleton() {
    return (
        <div
            role="status"
            aria-label="Searching scripture"
            className="mt-5 motion-safe:animate-pulse"
        >
            <span className="sr-only">Searching scripture…</span>
            <div className="mb-5 flex items-end justify-between gap-6 px-1">
                <div className="space-y-2">
                    <div className="h-3 w-32 rounded-full bg-[#cfc3b3]/55" />
                    <div className="h-8 w-44 rounded-full bg-[#cfc3b3]/45" />
                </div>
                <div className="h-12 w-48 rounded-2xl bg-[#cfc3b3]/35" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 6 }, (_, index) => (
                    <div
                        key={index}
                        className="flex min-h-48 flex-col rounded-2xl border border-[#ded5c9] bg-[#fffdf9] p-6 shadow-[0_10px_35px_-28px_rgba(41,34,25,0.7)]"
                    >
                        <div className="flex items-start justify-between gap-5">
                            <div className="space-y-2">
                                <div className="h-5 w-36 rounded-full bg-[#b8ab9c]/35" />
                                <div className="h-2.5 w-24 rounded-full bg-[#b8ab9c]/25" />
                            </div>
                            <div className="h-6 w-11 rounded-full bg-[#b8ab9c]/25" />
                        </div>
                        <div className="mt-6 space-y-3">
                            <div className="h-3.5 w-full rounded-full bg-[#b8ab9c]/30" />
                            <div className="h-3.5 w-[92%] rounded-full bg-[#b8ab9c]/30" />
                            <div className="h-3.5 w-[68%] rounded-full bg-[#b8ab9c]/30" />
                        </div>
                        <div className="mt-auto h-3 w-28 rounded-full bg-[#b8865e]/25" />
                    </div>
                ))}
            </div>
        </div>
    );
}

const scopeOptions: Array<{
    value: SearchScope;
    label: string;
    description: string;
}> = [
    {
        value: 'verse',
        label: 'Verse text',
        description: 'Search the biblical text',
    },
    {
        value: 'headings',
        label: 'Section headings',
        description: 'Search translation-specific headings',
    },
    {
        value: 'footnotes',
        label: 'Footnotes',
        description: 'Search translator and textual notes',
    },
    {
        value: 'notes',
        label: 'My notes',
        description: 'Search your private note titles, text and tags',
    },
];

function Highlighted({
    text,
    query,
    regex = false,
}: {
    text: string;
    query: string;
    regex?: boolean;
}) {
    if (regex && query.startsWith('/') && query.endsWith('/')) {
        const source = query.slice(1, -1);
        try {
            const wordAnchored =
                source.startsWith('^') &&
                source.endsWith('$') &&
                !/\s/u.test(source);
            const expression = new RegExp(
                wordAnchored ? source.slice(1, -1) : source,
                'giu',
            );
            const matcher = wordAnchored
                ? new RegExp(`\\b(?:${expression.source})\\b`, 'giu')
                : expression;
            const matches = [...text.matchAll(matcher)].filter(
                (match) => match[0].length > 0,
            );
            if (!matches.length) return text;

            const parts: ReactNode[] = [];
            let cursor = 0;
            matches.forEach((match, index) => {
                const start = match.index ?? 0;
                if (start > cursor)
                    parts.push(
                        <span key={`text-${index}`}>
                            {text.slice(cursor, start)}
                        </span>,
                    );
                parts.push(
                    <mark
                        key={`match-${start}-${index}`}
                        className="rounded-sm bg-[#eacb91]/55 px-0.5 text-inherit"
                    >
                        {match[0]}
                    </mark>,
                );
                cursor = start + match[0].length;
            });
            if (cursor < text.length)
                parts.push(<span key="text-end">{text.slice(cursor)}</span>);

            return parts;
        } catch {
            return text;
        }
    }

    const terms = [...query.trim().matchAll(/["“]([^"”]+)["”]|([^\s]+)/gu)]
        .map((match) => (match[1] || match[2] || '').trim())
        .filter((term) => term.length > 1);
    if (!terms.length) return text;
    const expression = new RegExp(
        `(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
        'gi',
    );
    return text.split(expression).map((part, index) =>
        terms.some((term) => term.toLowerCase() === part.toLowerCase()) ? (
            <mark
                key={`${part}-${index}`}
                className="rounded-sm bg-[#eacb91]/55 px-0.5 text-inherit"
            >
                {part}
            </mark>
        ) : (
            <span key={`${part}-${index}`}>{part}</span>
        ),
    );
}

export default function Search({
    query,
    searchText,
    searchFilters,
    isRegex,
    regexError,
    edition,
    editions,
    books,
    categories,
    selectedBook,
    reference,
    results,
    distribution,
    indexReady,
}: {
    query: string;
    edition: Edition;
    editions: Edition[];
    books: Book[];
    selectedBook: string;
    categories: string[];
    searchText: string;
    searchScopes: SearchScope[];
    searchFilters: SearchFilter[];
    isRegex: boolean;
    regexError: string | null;
    reference: Reference | null;
    results: Pagination | null;
    distribution: Distribution | null;
    indexReady: boolean;
}) {
    const [search, setSearch] = useState(searchText);
    const [activeFilters, setActiveFilters] =
        useState<SearchFilter[]>(searchFilters);
    const [translation, setTranslation] = useState(edition.slug);
    const [book, setBook] = useState(selectedBook);
    const [filterMenuOpen, setFilterMenuOpen] = useState(false);
    const [activeFilterIndex, setActiveFilterIndex] = useState(0);
    const [resultsToolbarStuck, setResultsToolbarStuck] = useState(false);
    const [resultsView, setResultsView] = useState<'results' | 'distribution'>(
        'results',
    );
    const [searching, setSearching] = useState(false);
    const [scrollToResults, setScrollToResults] = useState(false);
    const [resultsAnimationKey, setResultsAnimationKey] = useState(0);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const resultsToolbarSentinelRef = useRef<HTMLDivElement>(null);
    const resultsAnchorRef = useRef<HTMLElement>(null);

    useEffect(() => setResultsView('results'), [searchText, edition.slug]);

    useEffect(() => {
        if (!scrollToResults || searching) return;
        const frame = window.requestAnimationFrame(() => {
            resultsAnchorRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
            setScrollToResults(false);
        });
        return () => window.cancelAnimationFrame(frame);
    }, [scrollToResults, searching, resultsAnimationKey]);

    useEffect(() => {
        const sentinel = resultsToolbarSentinelRef.current;
        if (!sentinel || searching) {
            setResultsToolbarStuck(false);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                setResultsToolbarStuck(
                    !entry.isIntersecting && entry.boundingClientRect.top < 0,
                );
            },
            {
                threshold: 0,
                rootMargin: '-1px 0px 0px',
            },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [searching, resultsAnimationKey, results]);

    const allFilterOptions: FilterOption[] = [
        ...scopeOptions.map((option) => ({ kind: 'in' as const, ...option })),
        ...books.map((item) => ({
            kind: 'book' as const,
            value: item.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, ''),
            label: item.name,
            bookCode: item.code,
            description: `Search only ${item.name}`,
        })),
        {
            kind: 'testament',
            value: 'old',
            label: 'Old Testament',
            description: 'Search the Old Testament',
        },
        {
            kind: 'testament',
            value: 'new',
            label: 'New Testament',
            description: 'Search the New Testament',
        },
        ...categories.map((category) => ({
            kind: 'category' as const,
            value: category
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, ''),
            label: category,
            description: `Search ${category.toLowerCase()} books`,
        })),
    ];
    const filterMatch = search.match(
        /(?:^|\s)(in|book|testament|category):([^\s]*)$/i,
    );
    const filterKind = filterMatch?.[1].toLowerCase() as FilterKind | undefined;
    const filterFragment = filterMatch?.[2].toLowerCase();
    const visibleFilterOptions = allFilterOptions.filter(
        (option) =>
            option.kind === filterKind &&
            (filterFragment === undefined ||
                option.value.startsWith(filterFragment) ||
                option.label.toLowerCase().startsWith(filterFragment)),
    );
    const optionFromToken = (
        kind: FilterKind,
        rawValue: string,
    ): FilterOption | undefined => {
        const value = rawValue.toLowerCase();
        if (kind === 'in') {
            const canonical = ['heading', 'section', 'sections'].includes(value)
                ? 'headings'
                : value === 'footnote'
                  ? 'footnotes'
                  : value === 'note'
                    ? 'notes'
                    : ['verse-text', 'versetext'].includes(value)
                      ? 'verse'
                      : value;
            return allFilterOptions.find(
                (option) => option.kind === kind && option.value === canonical,
            );
        }
        if (kind === 'testament') {
            const canonical =
                value === 'ot' ? 'old' : value === 'nt' ? 'new' : value;
            return allFilterOptions.find(
                (option) => option.kind === kind && option.value === canonical,
            );
        }
        if (kind === 'book') {
            const aliases: Record<string, string> = {
                jn: 'JHN',
                jhn: 'JHN',
                mt: 'MAT',
                matt: 'MAT',
                mk: 'MRK',
                lk: 'LUK',
                ps: 'PSA',
                rev: 'REV',
                '1cor': '1CO',
                '2cor': '2CO',
                '1pet': '1PE',
                '2pet': '2PE',
            };
            const code = aliases[value] ?? value.toUpperCase();
            return allFilterOptions.find(
                (option) =>
                    option.kind === kind &&
                    (option.value === value || option.bookCode === code),
            );
        }
        return allFilterOptions.find(
            (option) => option.kind === kind && option.value === value,
        );
    };

    const chooseFilter = (filter: SearchFilter) => {
        const match = search.match(
            /(?:^|\s)(?:in|book|testament|category):[^\s]*$/i,
        );
        const prefix = match
            ? search.slice(0, match.index).trimEnd()
            : search.trimEnd();
        setSearch(prefix);
        setActiveFilters((current) => [
            ...current.filter((item) => item.kind !== filter.kind),
            filter,
        ]);
        if (filter.kind === 'book') setBook(filter.bookCode ?? '');
        setFilterMenuOpen(false);
        setActiveFilterIndex(0);
        window.requestAnimationFrame(() => searchInputRef.current?.focus());
    };

    const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (
            event.key === 'Backspace' &&
            search === '' &&
            !filterMenuOpen &&
            activeFilters.length > 0
        ) {
            event.preventDefault();
            setActiveFilters((current) => current.slice(0, -1));
            return;
        }
        if (!filterMenuOpen || visibleFilterOptions.length === 0) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            setActiveFilterIndex(
                (current) =>
                    (current + direction + visibleFilterOptions.length) %
                    visibleFilterOptions.length,
            );
        } else if (event.key === 'Enter') {
            event.preventDefault();
            chooseFilter(
                visibleFilterOptions[activeFilterIndex] ??
                    visibleFilterOptions[0],
            );
        } else if (event.key === 'Escape') {
            event.preventDefault();
            setFilterMenuOpen(false);
        }
    };

    const visit = (
        nextTranslation = translation,
        nextBook = book,
        nextFilters = activeFilters,
    ) => {
        const filtered = nextFilters.filter(
            (filter) =>
                filter.kind !== 'book' ||
                (nextBook !== '' && filter.bookCode === nextBook),
        );
        const tokens = filtered.map(
            (filter) => `${filter.kind}:${filter.value}`,
        );
        const scopedQuery = [...tokens, search.trim()]
            .filter(Boolean)
            .join(' ');
        router.get(
            '/search',
            { q: scopedQuery, translation: nextTranslation },
            {
                preserveState: true,
                replace: true,
                onStart: () => setSearching(true),
                onSuccess: () => {
                    setResultsAnimationKey((current) => current + 1);
                    setScrollToResults(true);
                },
                onFinish: () => setSearching(false),
            },
        );
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        visit();
    };
    const queryWithoutBook = [
        ...activeFilters
            .filter((filter) => filter.kind !== 'book')
            .map((filter) => `${filter.kind}:${filter.value}`),
        search.trim(),
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <SavedItemsPageShell active="search">
            <Head title={query ? `Search: ${query}` : 'Search'} />
            <main className="min-h-svh px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
                <div className="mx-auto max-w-6xl">
                    <header className="relative rounded-[2rem] border border-[#dfd5c7] bg-[#fbf7ef] px-6 py-10 shadow-[0_24px_70px_-50px_rgba(45,34,22,0.55)] sm:px-10 lg:px-14">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_84%_22%,rgba(191,113,52,0.18),transparent_38%),linear-gradient(112deg,transparent_22%,rgba(87,102,76,0.11)_100%)]"
                        />
                        <div className="relative max-w-3xl">
                            <p className="text-xs font-semibold tracking-[0.28em] text-[#9a672d] uppercase">
                                Explore scripture
                            </p>
                            <h1 className="mt-3 font-serif text-5xl font-black tracking-[-0.035em] sm:text-6xl">
                                Search the Bible
                            </h1>
                            <p className="mt-3 max-w-2xl font-serif text-base leading-7 text-[#6f685f]">
                                Search verse text, section headings and
                                footnotes, or enter a reference such as John
                                3:16.
                            </p>
                        </div>
                        <form
                            onSubmit={submit}
                            role="search"
                            className="relative mt-8"
                        >
                            {(activeFilters.length > 0 || isRegex) && (
                                <div
                                    aria-label="Active search filters"
                                    className="mb-3 flex flex-wrap items-center gap-2 px-1"
                                >
                                    <span className="mr-1 text-[0.65rem] font-semibold tracking-[0.16em] text-[#827568] uppercase">
                                        Filters
                                    </span>
                                    {isRegex && (
                                        <span className="rounded-md border border-[#c9b9a5] bg-[#e9dfd2] px-2 py-1.5 font-mono text-sm text-[#6d4b34] shadow-sm">
                                            regex
                                        </span>
                                    )}
                                    {activeFilters.map((filter) => (
                                        <span
                                            key={`${filter.kind}:${filter.value}`}
                                            className="inline-flex shrink-0 items-center overflow-hidden rounded-md border border-[#d7d7d4] bg-[#eeeeeb] text-[#4d4d48] shadow-sm"
                                        >
                                            <code className="px-2 py-1.5 font-mono text-sm">
                                                {filter.kind}:{filter.label}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveFilters(
                                                        (current) =>
                                                            current.filter(
                                                                (item) =>
                                                                    item.kind !==
                                                                        filter.kind ||
                                                                    item.value !==
                                                                        filter.value,
                                                            ),
                                                    );
                                                    if (filter.kind === 'book')
                                                        setBook('');
                                                }}
                                                className="cursor-pointer border-l border-[#d2d2cf] px-1.5 py-1.5 font-sans text-sm text-[#777771] transition hover:bg-[#dfdfdb] hover:text-[#33332f] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#a95624]"
                                                aria-label={`Remove ${filter.kind}:${filter.label} filter`}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="relative">
                                <label className="flex min-h-16 items-center gap-4 rounded-2xl border border-[#cfc3b3] bg-white/90 px-5 shadow-[0_10px_34px_rgba(49,38,25,0.09)] focus-within:ring-2 focus-within:ring-[#a95624]/30">
                                    <SearchIcon
                                        className="size-6 shrink-0 stroke-[1.6] text-[#a95624]"
                                        aria-hidden="true"
                                    />
                                    <span className="sr-only">
                                        Search scripture
                                    </span>
                                    <input
                                        ref={searchInputRef}
                                        type="search"
                                        role="combobox"
                                        name="q"
                                        value={search}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            const completedTokens = [
                                                ...value.matchAll(
                                                    /(?:^|\s)(in|book|testament|category):([^\s]+)(?=\s|$)/gi,
                                                ),
                                            ]
                                                .map((match) => ({
                                                    match: match[0],
                                                    option: optionFromToken(
                                                        match[1].toLowerCase() as FilterKind,
                                                        match[2],
                                                    ),
                                                }))
                                                .filter(
                                                    (
                                                        item,
                                                    ): item is {
                                                        match: string;
                                                        option: FilterOption;
                                                    } =>
                                                        item.option !==
                                                        undefined,
                                                );
                                            const completed =
                                                completedTokens.map(
                                                    (item) => item.option,
                                                );
                                            const remainingText =
                                                completedTokens
                                                    .reduce(
                                                        (text, item) =>
                                                            text.replace(
                                                                item.match,
                                                                ' ',
                                                            ),
                                                        value,
                                                    )
                                                    .replace(/\s+/g, ' ')
                                                    .trimStart();
                                            setSearch(remainingText);
                                            if (completed.length > 0)
                                                setActiveFilters((current) => [
                                                    ...current,
                                                    ...completed.filter(
                                                        (option) =>
                                                            !current.some(
                                                                (item) =>
                                                                    item.kind ===
                                                                        option.kind &&
                                                                    item.value ===
                                                                        option.value,
                                                            ),
                                                    ),
                                                ]);
                                            setFilterMenuOpen(
                                                completed.length === 0 &&
                                                    /(?:^|\s)(?:in|book|testament|category):[^\s]*$/i.test(
                                                        value,
                                                    ),
                                            );
                                            setActiveFilterIndex(0);
                                        }}
                                        onKeyDown={handleSearchKeyDown}
                                        onFocus={() =>
                                            setFilterMenuOpen(
                                                /(?:^|\s)(?:in|book|testament|category):[^\s]*$/i.test(
                                                    search,
                                                ),
                                            )
                                        }
                                        onBlur={() =>
                                            window.setTimeout(
                                                () => setFilterMenuOpen(false),
                                                120,
                                            )
                                        }
                                        placeholder="Try “light of the world” or “John 3:16”"
                                        className="min-w-0 flex-1 bg-transparent font-serif text-lg outline-none placeholder:text-[#948b80]"
                                        aria-autocomplete="list"
                                        aria-expanded={filterMenuOpen}
                                        aria-controls="search-filter-options"
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        className="hidden cursor-pointer items-center gap-2 rounded-full bg-[#282821] px-5 py-2.5 font-serif text-sm font-semibold text-white transition hover:bg-[#464238] focus-visible:ring-2 focus-visible:ring-[#a95624] focus-visible:ring-offset-2 focus-visible:outline-none sm:inline-flex"
                                    >
                                        Search <ArrowRight className="size-4" />
                                    </button>
                                </label>
                                {filterMenuOpen &&
                                    visibleFilterOptions.length > 0 && (
                                        <div
                                            id="search-filter-options"
                                            role="listbox"
                                            aria-label="Filter scripture search"
                                            className="absolute top-[calc(100%+0.5rem)] right-0 left-0 z-50 max-h-80 overflow-y-auto rounded-2xl border border-[#d8ccbd] bg-[#fffdf8] p-2 font-sans shadow-[0_20px_55px_rgba(48,38,27,0.18)] sm:right-auto sm:left-12 sm:w-[25rem]"
                                        >
                                            <p className="px-3 pt-2 pb-1 text-[0.65rem] font-semibold tracking-[0.18em] text-[#8a7968] uppercase">
                                                {filterKind === 'book'
                                                    ? 'Choose a book'
                                                    : filterKind === 'testament'
                                                      ? 'Choose a testament'
                                                      : filterKind ===
                                                          'category'
                                                        ? 'Choose a category'
                                                        : 'Search within'}
                                            </p>
                                            {visibleFilterOptions.map(
                                                (option, index) => (
                                                    <button
                                                        key={`${option.kind}:${option.value}`}
                                                        type="button"
                                                        role="option"
                                                        aria-selected={
                                                            index ===
                                                            activeFilterIndex
                                                        }
                                                        onMouseDown={(event) =>
                                                            event.preventDefault()
                                                        }
                                                        onClick={() =>
                                                            chooseFilter(option)
                                                        }
                                                        onMouseEnter={() =>
                                                            setActiveFilterIndex(
                                                                index,
                                                            )
                                                        }
                                                        className={`flex w-full cursor-pointer items-center justify-between gap-5 rounded-xl px-3 py-3 text-left transition ${index === activeFilterIndex ? 'bg-[#f2e8da] text-[#7f4724]' : 'hover:bg-[#f8f2e9]'}`}
                                                    >
                                                        <span>
                                                            <span className="block font-serif font-semibold">
                                                                {option.label}
                                                            </span>
                                                            <span className="mt-0.5 block text-xs text-[#7a7167]">
                                                                {
                                                                    option.description
                                                                }
                                                            </span>
                                                        </span>
                                                        <code className="rounded-md bg-white/75 px-2 py-1 text-xs text-[#8c5a36]">
                                                            {option.kind}:
                                                            {option.value}
                                                        </code>
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    )}
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
                                <CustomSelect
                                    value={translation}
                                    options={editions.map((item) => ({
                                        value: item.slug,
                                        label: `${item.name} (${item.abbreviation})`,
                                    }))}
                                    onChange={(value) => {
                                        const nextFilters =
                                            activeFilters.filter(
                                                (filter) =>
                                                    filter.kind !== 'book',
                                            );
                                        setTranslation(value);
                                        setBook('');
                                        setActiveFilters(nextFilters);
                                        visit(value, '', nextFilters);
                                    }}
                                    label="Translation"
                                    variant="inline"
                                    triggerClassName="bg-[#fffaf2]/70"
                                />
                                <CustomSelect
                                    value={book}
                                    options={[
                                        { value: '', label: 'All books' },
                                        ...books.map((item) => ({
                                            value: item.code,
                                            label: item.name,
                                        })),
                                    ]}
                                    onChange={(value) => {
                                        const chosen = books.find(
                                            (item) => item.code === value,
                                        );
                                        const nextFilters = [
                                            ...activeFilters.filter(
                                                (filter) =>
                                                    filter.kind !== 'book',
                                            ),
                                            ...(chosen
                                                ? [
                                                      {
                                                          kind: 'book' as const,
                                                          value: chosen.name
                                                              .toLowerCase()
                                                              .replace(
                                                                  /[^a-z0-9]+/g,
                                                                  '-',
                                                              )
                                                              .replace(
                                                                  /^-|-$/g,
                                                                  '',
                                                              ),
                                                          label: chosen.name,
                                                          bookCode: chosen.code,
                                                      },
                                                  ]
                                                : []),
                                        ];
                                        setBook(value);
                                        setActiveFilters(nextFilters);
                                        visit(translation, value, nextFilters);
                                    }}
                                    label="Book"
                                    variant="inline"
                                    triggerClassName="bg-[#fffaf2]/70"
                                />
                            </div>
                        </form>
                    </header>

                    <section
                        ref={resultsAnchorRef}
                        className="mt-8 scroll-mt-4"
                        aria-live="polite"
                    >
                        {searching && <SearchResultsSkeleton />}
                        {regexError && (
                            <div
                                role="alert"
                                className="mb-5 rounded-2xl border border-[#d8b8a8] bg-[#fff4ed] px-5 py-4 font-serif text-[#7f3f27]"
                            >
                                <strong className="font-semibold">
                                    Regex error:
                                </strong>{' '}
                                {regexError}
                            </div>
                        )}
                        {!indexReady && (
                            <div className="rounded-2xl border border-[#d8c8b3] bg-[#fff8eb] p-6 font-serif text-[#665744]">
                                This translation is being prepared for search.
                                Try another translation for now.
                            </div>
                        )}
                        {!searching && indexReady && reference && (
                            <Link
                                href={reference.url}
                                className="group flex items-center gap-5 rounded-2xl border border-[#d9cdbd] bg-[#fffdf8] p-6 shadow-sm transition hover:border-[#b98555] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#a95624] focus-visible:outline-none"
                            >
                                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#eee1cd] text-[#9a572a]">
                                    <BookOpen className="size-6 stroke-[1.5]" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[0.68rem] font-semibold tracking-[0.2em] text-[#8a7968] uppercase">
                                        Go directly to
                                    </span>
                                    <span className="mt-1 block font-serif text-2xl font-bold">
                                        {reference.label}
                                    </span>
                                </span>
                                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                            </Link>
                        )}
                        {!searching && indexReady && results && (
                            <>
                                <div
                                    ref={resultsToolbarSentinelRef}
                                    aria-hidden="true"
                                    className="h-px"
                                />
                                <div
                                    className={`sticky top-0 z-30 -mx-4 isolate after:pointer-events-none after:absolute after:bottom-0 after:left-[2.5%] after:-z-10 after:h-2 after:w-[95%] after:transition-shadow ${resultsToolbarStuck ? 'after:shadow-[0_5px_10px_-2px_rgba(42,33,23,0.32),0_13px_24px_-8px_rgba(42,33,23,0.3)]' : 'after:shadow-none'}`}
                                >
                                    <div
                                        className={`relative z-10 flex flex-wrap items-center justify-between gap-4 border-b px-4 pt-2 pb-4 transition-[background-color,border-color,backdrop-filter] ${resultsToolbarStuck ? 'border-[#d7ccbd] bg-[#f1ece3]' : 'border-transparent bg-transparent'}`}
                                    >
                                        <div>
                                            <p className="text-xs font-semibold tracking-[0.2em] text-[#8a7968] uppercase">
                                                {edition.name}
                                            </p>
                                            <h2 className="mt-1 font-serif text-3xl font-bold">
                                                {results.total.toLocaleString()}{' '}
                                                {results.total === 1
                                                    ? 'result'
                                                    : 'results'}
                                            </h2>
                                            {results.total > 0 && (
                                                <p className="mt-1 font-serif text-sm text-[#81776c]">
                                                    Showing{' '}
                                                    {(
                                                        (results.current_page -
                                                            1) *
                                                            results.per_page +
                                                        1
                                                    ).toLocaleString()}
                                                    –
                                                    {Math.min(
                                                        results.current_page *
                                                            results.per_page,
                                                        results.total,
                                                    ).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center justify-end">
                                            {selectedBook && (
                                                <Link
                                                    href={`/search?q=${encodeURIComponent(queryWithoutBook)}&translation=${edition.slug}`}
                                                    className="mr-4 font-serif text-sm text-[#8f542c] underline decoration-[#caa27f] underline-offset-4"
                                                >
                                                    Clear book filter
                                                </Link>
                                            )}
                                            {distribution && (
                                                <div
                                                    role="group"
                                                    aria-label="Search result view"
                                                    className="flex rounded-full border border-[#d3c8b9] bg-[#e9dfd1] p-1"
                                                >
                                                    <button
                                                        type="button"
                                                        aria-pressed={
                                                            resultsView ===
                                                            'results'
                                                        }
                                                        onClick={() =>
                                                            setResultsView(
                                                                'results',
                                                            )
                                                        }
                                                        className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 font-serif text-sm transition focus-visible:ring-2 focus-visible:ring-[#a95624] focus-visible:outline-none ${resultsView === 'results' ? 'bg-[#fffdf8] font-semibold shadow-sm' : 'text-[#71665a] hover:text-[#3c342c]'}`}
                                                    >
                                                        <List className="size-4" />{' '}
                                                        Results
                                                    </button>
                                                    <button
                                                        type="button"
                                                        aria-pressed={
                                                            resultsView ===
                                                            'distribution'
                                                        }
                                                        onClick={() =>
                                                            setResultsView(
                                                                'distribution',
                                                            )
                                                        }
                                                        className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 font-serif text-sm transition focus-visible:ring-2 focus-visible:ring-[#a95624] focus-visible:outline-none ${resultsView === 'distribution' ? 'bg-[#fffdf8] font-semibold shadow-sm' : 'text-[#71665a] hover:text-[#3c342c]'}`}
                                                    >
                                                        <BarChart3 className="size-4" />{' '}
                                                        Distribution
                                                    </button>
                                                </div>
                                            )}
                                            {results.last_page > 1 && (
                                                <div
                                                    aria-hidden={
                                                        resultsView !==
                                                        'results'
                                                    }
                                                    inert={
                                                        resultsView !==
                                                        'results'
                                                    }
                                                    className={`overflow-hidden transition-[max-width,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${resultsView === 'results' ? 'ml-4 max-w-64 delay-0' : 'pointer-events-none ml-0 max-w-0 delay-150'}`}
                                                >
                                                    <nav
                                                        aria-label="Search results pagination"
                                                        className={`flex items-center justify-between gap-3 rounded-2xl border border-[#d3c8b9] bg-[#fbf8f1]/90 p-2 shadow-sm transition-opacity duration-150 ${resultsView === 'results' ? 'opacity-100 delay-300' : 'opacity-0 delay-0'}`}
                                                    >
                                                        <PaginationLink
                                                            href={
                                                                results.prev_page_url
                                                            }
                                                            label="Previous page"
                                                        >
                                                            <ArrowLeft className="size-4" />
                                                        </PaginationLink>
                                                        <span className="font-serif text-sm whitespace-nowrap text-[#71695f]">
                                                            Page{' '}
                                                            {
                                                                results.current_page
                                                            }{' '}
                                                            of{' '}
                                                            {results.last_page}
                                                        </span>
                                                        <PaginationLink
                                                            href={
                                                                results.next_page_url
                                                            }
                                                            label="Next page"
                                                        >
                                                            <ArrowRight className="size-4" />
                                                        </PaginationLink>
                                                    </nav>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {resultsView === 'distribution' &&
                                distribution ? (
                                    <DistributionChart
                                        distribution={distribution}
                                    />
                                ) : results.data.length ? (
                                    <div
                                        key={resultsAnimationKey}
                                        className="mt-5 grid gap-4 lg:grid-cols-2"
                                    >
                                        {results.data.map((result, index) =>
                                            result.kind === 'note' ? (
                                                <Link
                                                    key={result.id}
                                                    href={result.url}
                                                    style={{
                                                        animationDelay: `${Math.min(index * 65, 650)}ms`,
                                                    }}
                                                    className="search-result-enter group relative flex min-h-48 flex-col overflow-hidden rounded-2xl border border-[#c9c0d5] bg-[radial-gradient(circle_at_92%_12%,rgba(111,88,139,0.13),transparent_38%),linear-gradient(135deg,#f1edf5_0%,#fffdf9_62%,#eee8df_100%)] p-6 shadow-[0_14px_38px_-27px_rgba(57,43,72,0.65)] transition before:absolute before:top-[10%] before:bottom-[10%] before:left-0 before:w-1 before:rounded-full before:bg-[#806496] hover:border-[#a995ba] hover:shadow-[0_20px_48px_-25px_rgba(57,43,72,0.72)] focus-visible:ring-2 focus-visible:ring-[#806496] focus-visible:outline-none"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <p className="flex items-center gap-2 text-[0.68rem] font-semibold tracking-[0.18em] text-[#675276] uppercase">
                                                            <span
                                                                aria-hidden="true"
                                                                className="size-1.5 rounded-full bg-[#806496]"
                                                            />
                                                            My note
                                                        </p>
                                                        <span className="rounded-full border border-white/70 bg-white/65 px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.12em] text-[#6d6257] uppercase shadow-sm">
                                                            Private
                                                        </span>
                                                    </div>
                                                    <h3 className="mt-5 font-serif text-2xl leading-tight font-bold text-[#302b26]">
                                                        <Highlighted
                                                            text={
                                                                result.title ??
                                                                ''
                                                            }
                                                            query={searchText}
                                                            regex={isRegex}
                                                        />
                                                    </h3>
                                                    <p className="mt-1 font-serif text-sm text-[#746a60]">
                                                        {result.reference}
                                                    </p>
                                                    <p className="mt-4 line-clamp-3 font-serif text-base leading-7 text-[#4d4652]">
                                                        <Highlighted
                                                            text={result.text}
                                                            query={searchText}
                                                            regex={isRegex}
                                                        />
                                                    </p>
                                                    {result.tags &&
                                                        result.tags.length >
                                                            0 && (
                                                            <div className="mt-4 flex flex-wrap gap-1.5">
                                                                {result.tags.map(
                                                                    (tag) => (
                                                                        <span
                                                                            key={
                                                                                tag.id
                                                                            }
                                                                            className="rounded-full bg-white/65 px-2.5 py-1 font-sans text-[0.68rem] text-[#675276]"
                                                                        >
                                                                            {
                                                                                tag.name
                                                                            }
                                                                        </span>
                                                                    ),
                                                                )}
                                                            </div>
                                                        )}
                                                    <span className="mt-auto pt-5 font-serif text-sm font-semibold text-[#725185]">
                                                        Read note{' '}
                                                        <ArrowRight className="ml-1 inline size-4 transition-transform group-hover:translate-x-1" />
                                                    </span>
                                                </Link>
                                            ) : result.kind === 'section' ? (
                                                <Link
                                                    key={result.id}
                                                    href={result.url}
                                                    style={{
                                                        animationDelay: `${Math.min(index * 65, 650)}ms`,
                                                    }}
                                                    className="search-result-enter group relative flex min-h-48 flex-col overflow-hidden rounded-2xl border border-[#d5c1a7] bg-[radial-gradient(circle_at_92%_12%,rgba(174,102,48,0.16),transparent_36%),linear-gradient(135deg,#f3e5d1_0%,#fbf7ee_56%,#edf0e5_100%)] p-6 shadow-[0_14px_38px_-27px_rgba(65,45,26,0.72)] transition before:absolute before:top-[10%] before:bottom-[10%] before:left-0 before:w-1 before:rounded-full before:bg-[#b66a35] hover:border-[#b98b61] hover:shadow-[0_20px_48px_-25px_rgba(65,45,26,0.78)] focus-visible:ring-2 focus-visible:ring-[#a95624] focus-visible:outline-none"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <p className="flex items-center gap-2 text-[0.68rem] font-semibold tracking-[0.18em] text-[#805839] uppercase">
                                                            <span
                                                                aria-hidden="true"
                                                                className="size-1.5 rounded-full bg-[#b66a35]"
                                                            />
                                                            Section heading
                                                        </p>
                                                        <span className="rounded-full border border-white/70 bg-white/65 px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.12em] text-[#6d6257] uppercase shadow-sm">
                                                            {
                                                                edition.abbreviation
                                                            }
                                                        </span>
                                                    </div>
                                                    <h3 className="mt-5 font-serif text-2xl leading-tight font-bold text-[#302b26]">
                                                        <Highlighted
                                                            text={
                                                                result.sectionTitle ??
                                                                ''
                                                            }
                                                            query={searchText}
                                                            regex={isRegex}
                                                        />
                                                    </h3>
                                                    <p className="mt-2 font-serif text-sm text-[#746a60]">
                                                        {result.reference}
                                                    </p>
                                                    <span className="mt-auto pt-5 font-serif text-sm font-semibold text-[#9a572a]">
                                                        Read section{' '}
                                                        <ArrowRight className="ml-1 inline size-4 transition-transform group-hover:translate-x-1" />
                                                    </span>
                                                </Link>
                                            ) : (
                                                <Link
                                                    key={result.id}
                                                    href={result.url}
                                                    style={{
                                                        animationDelay: `${Math.min(index * 65, 650)}ms`,
                                                    }}
                                                    className={`search-result-enter group flex min-h-48 flex-col rounded-2xl border p-6 transition focus-visible:ring-2 focus-visible:ring-[#a95624] focus-visible:outline-none ${result.matchedIn.includes('footnotes') ? 'relative overflow-hidden border-[#c4cec4] bg-[radial-gradient(circle_at_8%_88%,rgba(91,112,95,0.14),transparent_38%),linear-gradient(135deg,#edf1e9_0%,#f8f7f1_58%,#eeeae3_100%)] shadow-[0_14px_38px_-27px_rgba(42,58,45,0.65)] after:absolute after:top-[10%] after:right-0 after:bottom-[10%] after:w-1 after:rounded-full after:bg-[#6f806f] hover:border-[#99aa9a] hover:shadow-[0_20px_48px_-25px_rgba(42,58,45,0.72)]' : 'border-[#ded5c9] bg-[#fffdf9] shadow-[0_10px_35px_-28px_rgba(41,34,25,0.7)] hover:border-[#c9a887] hover:shadow-[0_16px_42px_-26px_rgba(41,34,25,0.7)]'}`}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            {result.matchedIn.includes(
                                                                'footnotes',
                                                            ) && (
                                                                <p className="mb-2 flex items-center gap-2 text-[0.68rem] font-semibold tracking-[0.18em] text-[#526653] uppercase">
                                                                    <span
                                                                        aria-hidden="true"
                                                                        className="size-1.5 rounded-full bg-[#6f806f]"
                                                                    />
                                                                    Footnote
                                                                    match
                                                                </p>
                                                            )}
                                                            <p className="font-serif text-xl font-bold">
                                                                {
                                                                    result.bookName
                                                                }{' '}
                                                                {result.chapter}
                                                                :{result.verse}
                                                            </p>
                                                            {result.sectionTitle && (
                                                                <p className="mt-1 text-xs font-semibold tracking-[0.14em] text-[#8b7d6e] uppercase">
                                                                    <Highlighted
                                                                        text={
                                                                            result.sectionTitle
                                                                        }
                                                                        query={
                                                                            searchText
                                                                        }
                                                                        regex={
                                                                            isRegex
                                                                        }
                                                                    />
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span
                                                            className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.12em] text-[#6d6257] uppercase ${result.matchedIn.includes('footnotes') ? 'border border-white/70 bg-white/65 shadow-sm' : 'bg-[#eee7dc]'}`}
                                                        >
                                                            {
                                                                edition.abbreviation
                                                            }
                                                        </span>
                                                    </div>
                                                    <p className="mt-5 font-serif text-lg leading-8 text-[#37322c]">
                                                        <Highlighted
                                                            text={result.text}
                                                            query={searchText}
                                                            regex={isRegex}
                                                        />
                                                    </p>
                                                    {result.footnoteText &&
                                                        result.matchedIn.includes(
                                                            'footnotes',
                                                        ) && (
                                                            <div className="mt-4 rounded-xl border border-[#cdd7cd] bg-white/55 px-4 py-3">
                                                                <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-[#526653] uppercase">
                                                                    Footnote
                                                                    text
                                                                </p>
                                                                <p className="mt-1 font-serif text-sm leading-6 text-[#4f5a50]">
                                                                    <Highlighted
                                                                        text={
                                                                            result.footnoteText
                                                                        }
                                                                        query={
                                                                            searchText
                                                                        }
                                                                        regex={
                                                                            isRegex
                                                                        }
                                                                    />
                                                                </p>
                                                            </div>
                                                        )}
                                                    <span className="mt-auto pt-5 font-serif text-sm font-semibold text-[#9a572a]">
                                                        Read in context{' '}
                                                        <ArrowRight className="ml-1 inline size-4 transition-transform group-hover:translate-x-1" />
                                                    </span>
                                                </Link>
                                            ),
                                        )}
                                    </div>
                                ) : (
                                    <div className="mt-5 rounded-2xl border border-dashed border-[#cec2b3] bg-[#faf6ef] px-6 py-12 text-center">
                                        <Sparkles className="mx-auto size-7 text-[#a56b39]" />
                                        <h3 className="mt-3 font-serif text-xl font-bold">
                                            No matching passages
                                        </h3>
                                        <p className="mt-2 font-serif text-sm text-[#766d62]">
                                            Try fewer words, another content
                                            filter, a different book, or another
                                            translation.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                        {!searching && indexReady && !query && (
                            <div className="grid gap-4 sm:grid-cols-3">
                                {[
                                    'John 3:16',
                                    'light of the world',
                                    'love one another',
                                ].map((suggestion) => (
                                    <Link
                                        key={suggestion}
                                        href={`/search?q=${encodeURIComponent(suggestion)}&translation=${edition.slug}`}
                                        className="rounded-2xl border border-[#ded5c9] bg-[#fffdf9] p-5 font-serif text-lg transition hover:border-[#bd9169] hover:shadow-sm"
                                    >
                                        {suggestion}
                                        <ArrowRight className="mt-4 size-4 text-[#9a572a]" />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </SavedItemsPageShell>
    );
}

function PaginationLink({
    href,
    label,
    children,
}: {
    href: string | null;
    label: string;
    children: ReactNode;
}) {
    const classes =
        'inline-flex size-10 items-center justify-center rounded-full border border-[#d0c5b7] transition';
    return href ? (
        <Link
            href={href}
            preserveScroll
            aria-label={label}
            className={`${classes} hover:bg-[#fffaf2]`}
        >
            {children}
        </Link>
    ) : (
        <span
            aria-label={label}
            aria-disabled="true"
            className={`${classes} opacity-35`}
        >
            {children}
        </span>
    );
}
