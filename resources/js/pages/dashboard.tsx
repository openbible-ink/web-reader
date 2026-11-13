import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Bell,
    Bookmark,
    BookOpen,
    CalendarDays,
    ChevronDown,
    ChevronRight,
    FileText,
    Globe2,
    Highlighter,
    Home,
    LogOut,
    Menu,
    Pencil,
    Quote,
    Search,
    Save,
    Settings2,
    UserRound,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { useAppearance } from '@/hooks/use-appearance';
import { logout } from '@/routes';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editProfile } from '@/routes/profile';
import CustomSelect from '@/components/custom-select';

const navigation = [
    { label: 'Home', icon: Home, href: '/dashboard' },
    { label: 'Library', icon: BookOpen, href: '/books/JHN' },
    { label: 'Search', icon: Search, href: '/search' },
    { label: 'Plans', icon: CalendarDays, href: '#plans' },
    { label: 'Notes', icon: FileText, href: '/notes' },
    { label: 'Highlights', icon: Highlighter, href: '/highlights' },
    { label: 'Bookmarks', icon: Bookmark, href: '/bookmarks' },
    { label: 'Account', icon: UserRound, href: '#account', active: true },
];

const savedTabs = [
    { label: 'Notes', slug: 'notes', icon: FileText },
    { label: 'Highlights', slug: 'highlights', icon: Highlighter },
    { label: 'Bookmarks', slug: 'bookmarks', icon: Bookmark },
] as const;

type SavedTab = (typeof savedTabs)[number]['slug'];

interface DashboardBookmark {
    id: string;
    title?: string | null;
    reference: string;
    edition: string;
    readerUrl: string;
    createdAt?: string | null;
}

interface DashboardProps {
    bookmarkCount: number;
    highlightCount: number;
    noteCount: number;
    savedTab: SavedTab;
    savedItems: PaginatedSavedItems;
    availableEditions: Array<{
        slug: string;
        name: string;
        abbreviation: string;
    }>;
    defaultEditionSlug: string;
    highlightLabels: Record<DashboardHighlight['color'], string>;
    redLetterWords: boolean;
}

interface PaginatedSavedItems {
    data: Array<DashboardBookmark | DashboardHighlight | DashboardNote>;
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface DashboardHighlight {
    id: string;
    selectedText: string;
    color: 'yellow' | 'green' | 'blue' | 'rose';
    reference: string;
    edition: string;
    readerUrl: string;
    createdAt?: string | null;
}

interface DashboardNote {
    id: string;
    title: string;
    bodyMarkdown: string;
    reference: string;
    edition: string;
    readerUrl: string;
    noteUrl: string;
    editUrl: string;
    updatedAt?: string | null;
}

const highlightColours: Record<DashboardHighlight['color'], string> = {
    yellow: '#e7c862',
    green: '#8eaa82',
    blue: '#82a9bf',
    rose: '#c78d90',
};

function Panel({
    children,
    className = '',
    id,
}: {
    children: React.ReactNode;
    className?: string;
    id?: string;
}) {
    return (
        <section
            id={id}
            className={`rounded-2xl border border-[#e2dbd0] bg-[#fffdf8]/75 shadow-[0_8px_30px_rgba(83,65,37,0.04)] backdrop-blur-sm ${className}`}
        >
            {children}
        </section>
    );
}

function SectionHeading({
    children,
    action,
}: {
    children: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <h2 className="font-serif text-[1.7rem] leading-tight tracking-[-0.025em] text-[#181914]">
                {children}
            </h2>
            {action}
        </div>
    );
}

function DashboardSidebar({ close }: { close?: () => void }) {
    return (
        <div className="flex h-full flex-col bg-[#f8f3ea]/95 px-5 py-7 text-[#22231e]">
            <Link
                href="/dashboard"
                onClick={close}
                className="mx-auto flex flex-col items-center rounded-lg focus-visible:ring-2 focus-visible:ring-[#9a672d] focus-visible:outline-none"
            >
                <img
                    src="/images/brand/open-bible-mark-dark-128.png"
                    alt=""
                    className="h-[72px] w-auto"
                />
                <span className="mt-3 text-[10px] font-semibold tracking-[0.36em] uppercase">
                    Open Bible
                </span>
            </Link>

            <div className="my-6 h-px bg-[#dfd7ca]" />

            <nav aria-label="Dashboard navigation" className="grid gap-1.5">
                {navigation.map(({ label, icon: Icon, href, active }) => (
                    <a
                        key={label}
                        href={href}
                        onClick={close}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center gap-4 rounded-xl px-4 py-3 font-serif text-[15px] transition focus-visible:ring-2 focus-visible:ring-[#9a672d] focus-visible:outline-none ${
                            active
                                ? 'bg-[#ece3d5] text-[#171813]'
                                : 'hover:bg-[#f0e9de]'
                        }`}
                    >
                        <Icon
                            aria-hidden="true"
                            className="size-[19px] stroke-[1.5]"
                        />
                        {label}
                    </a>
                ))}
            </nav>
        </div>
    );
}

export default function Dashboard({
    bookmarkCount,
    highlightCount,
    noteCount,
    savedTab,
    savedItems,
    availableEditions,
    defaultEditionSlug,
    highlightLabels,
    redLetterWords,
}: DashboardProps) {
    const { auth } = usePage().props;
    const { appearance, resolvedAppearance } = useAppearance();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [savedItemsLoading, setSavedItemsLoading] = useState(false);
    const [editableHighlightLabels, setEditableHighlightLabels] =
        useState(highlightLabels);
    const [highlightLabelsSaving, setHighlightLabelsSaving] = useState(false);
    const [redLetterWordsEnabled, setRedLetterWordsEnabled] =
        useState(redLetterWords);
    const [redLetterWordsSaving, setRedLetterWordsSaving] = useState(false);
    const user = auth.user;
    const themeLabel =
        appearance === 'system'
            ? `System (${resolvedAppearance})`
            : appearance.charAt(0).toUpperCase() + appearance.slice(1);

    const savedItemsUrl =
        savedTab === 'bookmarks'
            ? '/bookmarks'
            : savedTab === 'highlights'
              ? '/highlights'
              : '/notes';
    const savedItemCounts: Record<SavedTab, number> = {
        notes: noteCount,
        highlights: highlightCount,
        bookmarks: bookmarkCount,
    };
    const notes =
        savedTab === 'notes' ? (savedItems.data as DashboardNote[]) : [];
    const highlights =
        savedTab === 'highlights'
            ? (savedItems.data as DashboardHighlight[])
            : [];
    const bookmarks =
        savedTab === 'bookmarks'
            ? (savedItems.data as DashboardBookmark[])
            : [];

    const saveHighlightLabels = () => {
        router.patch(
            '/settings/highlight-labels',
            { labels: editableHighlightLabels },
            {
                preserveScroll: true,
                onStart: () => setHighlightLabelsSaving(true),
                onFinish: () => setHighlightLabelsSaving(false),
            },
        );
    };

    const toggleRedLetterWords = () => {
        if (redLetterWordsSaving) return;

        const enabled = !redLetterWordsEnabled;
        setRedLetterWordsEnabled(enabled);
        router.patch(
            '/settings/red-letter-words',
            { enabled },
            {
                preserveScroll: true,
                onStart: () => setRedLetterWordsSaving(true),
                onError: () => setRedLetterWordsEnabled(!enabled),
                onFinish: () => setRedLetterWordsSaving(false),
            },
        );
    };

    const loadSavedItems = (tab: SavedTab, page = 1) => {
        if (
            savedItemsLoading ||
            (tab === savedTab && page === savedItems.currentPage)
        ) {
            return;
        }

        router.get(
            '/dashboard',
            { saved: tab, page },
            {
                only: ['savedTab', 'savedItems'],
                preserveScroll: true,
                preserveState: true,
                replace: true,
                onStart: () => setSavedItemsLoading(true),
                onFinish: () => setSavedItemsLoading(false),
            },
        );
    };

    return (
        <>
            <Head title="Dashboard" />
            <div className="min-h-svh bg-[#f2ede4] text-[#20211d]">
                <aside className="fixed inset-y-0 left-0 z-30 hidden w-[184px] border-r border-[#ddd5c9] lg:block">
                    <DashboardSidebar />
                </aside>

                {mobileNavOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <button
                            type="button"
                            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
                            aria-label="Close navigation"
                            onClick={() => setMobileNavOpen(false)}
                        />
                        <aside className="relative h-full w-[min(84vw,320px)] shadow-2xl">
                            <button
                                type="button"
                                onClick={() => setMobileNavOpen(false)}
                                className="absolute top-4 right-4 z-10 rounded-full p-2 hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-[#9a672d] focus-visible:outline-none"
                                aria-label="Close navigation"
                            >
                                <X className="size-5" />
                            </button>
                            <DashboardSidebar
                                close={() => setMobileNavOpen(false)}
                            />
                        </aside>
                    </div>
                )}

                <div className="lg:pl-[184px]">
                    <header className="relative min-h-[245px] overflow-hidden border-b border-[#ded6ca] bg-[#faf7f1] px-5 pb-12 sm:px-8 lg:px-12">
                        <div
                            className="absolute inset-y-0 right-0 w-[68%] opacity-90"
                            aria-hidden="true"
                        >
                            <img
                                src="/images/scripture/john-olive-branch.png"
                                alt=""
                                className="size-full object-cover object-[67%_42%] mix-blend-multiply"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#faf7f1] via-[#faf7f1]/35 to-transparent" />
                        </div>

                        <div className="relative flex h-20 items-center justify-between gap-4">
                            <button
                                type="button"
                                onClick={() => setMobileNavOpen(true)}
                                className="rounded-full border border-[#d9d0c4] bg-[#fffaf2]/85 p-2.5 lg:hidden"
                                aria-label="Open navigation"
                            >
                                <Menu className="size-5" />
                            </button>

                            <form
                                action="/search"
                                method="get"
                                className="ml-auto hidden sm:block"
                            >
                                <label className="flex h-12 w-[min(34vw,310px)] items-center gap-3 rounded-full border border-[#d9d0c4] bg-[#fffaf2]/90 px-5 shadow-sm backdrop-blur-sm focus-within:ring-2 focus-within:ring-[#9a672d]/30">
                                    <Search
                                        aria-hidden="true"
                                        className="size-5 stroke-[1.6]"
                                    />
                                    <span className="sr-only">
                                        Search the Bible
                                    </span>
                                    <input
                                        name="q"
                                        type="search"
                                        placeholder="Search the Bible..."
                                        className="min-w-0 flex-1 bg-transparent font-serif text-sm outline-none placeholder:text-[#756f66]"
                                    />
                                </label>
                            </form>
                            <button
                                type="button"
                                className="rounded-full p-2.5 transition hover:bg-[#fffaf2] focus-visible:ring-2 focus-visible:ring-[#9a672d] focus-visible:outline-none"
                                aria-label="Notifications"
                            >
                                <Bell className="size-5 stroke-[1.6]" />
                            </button>
                            <Link
                                href={editProfile()}
                                className="flex items-center gap-2 rounded-full p-2 focus-visible:ring-2 focus-visible:ring-[#9a672d] focus-visible:outline-none"
                                aria-label={`Account settings for @${user.username}`}
                            >
                                <span className="hidden max-w-28 truncate font-serif text-sm sm:block">
                                    @{user.username}
                                </span>
                                <ChevronDown className="size-4" />
                            </Link>
                        </div>

                        <div className="relative mt-4">
                            <h1 className="font-serif text-[clamp(3.2rem,7vw,5.5rem)] leading-none font-black tracking-[-0.06em] text-[#171813]">
                                Dashboard
                            </h1>
                            <p className="mt-3 font-serif text-xl text-[#81786b] sm:text-2xl">
                                Your reading, your notes, your place.
                            </p>
                        </div>
                    </header>

                    <main className="relative z-10 mx-auto -mt-2 max-w-[1450px] p-4 sm:p-6 lg:p-7 xl:p-8">
                        <div className="grid gap-4 xl:grid-cols-[1.38fr_1fr]">
                            <div className="grid content-start gap-4">
                                <Panel id="account" className="p-6 sm:p-7">
                                    <SectionHeading
                                        action={
                                            <Link
                                                href={editProfile()}
                                                className="flex items-center gap-2 rounded-md px-2 py-1 font-serif text-sm hover:bg-[#eee5d8] focus-visible:ring-2 focus-visible:ring-[#9a672d] focus-visible:outline-none"
                                            >
                                                <Pencil className="size-4 stroke-[1.6]" />
                                                Edit
                                            </Link>
                                        }
                                    >
                                        Account details
                                    </SectionHeading>
                                    <dl className="mt-4 divide-y divide-[#e1d9ce] font-serif text-[15px] sm:text-base">
                                        {[
                                            ['Username', `@${user.username}`],
                                            ['Email', user.email],
                                            ['Language', 'English (UK)'],
                                            ['Theme', themeLabel],
                                            [
                                                'Notifications',
                                                'Reading reminders, product updates',
                                            ],
                                        ].map(([label, value]) => (
                                            <div
                                                key={label}
                                                className="grid gap-1 py-3 sm:grid-cols-[175px_1fr] sm:gap-0"
                                            >
                                                <dt className="text-[#3e3c36]">
                                                    {label}
                                                </dt>
                                                <dd className="break-words text-[#6f6960]">
                                                    {value}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                </Panel>

                                <Panel id="saved-items" className="p-6 sm:p-7">
                                    <SectionHeading
                                        action={
                                            savedItemsUrl ? (
                                                <Link
                                                    href={savedItemsUrl}
                                                    className="flex items-center gap-1 rounded-md px-2 py-1 font-serif text-sm text-[#71695e] hover:bg-[#eee5d8] hover:text-[#181914] focus-visible:ring-2 focus-visible:ring-[#9a672d] focus-visible:outline-none"
                                                >
                                                    See all
                                                    <ChevronRight className="size-4" />
                                                </Link>
                                            ) : null
                                        }
                                    >
                                        Saved items
                                    </SectionHeading>
                                    <div
                                        role="tablist"
                                        aria-label="Saved item type"
                                        className="mt-4 flex gap-2 overflow-x-auto pb-1"
                                    >
                                        {savedTabs.map(
                                            ({ label, slug, icon: Icon }) => (
                                                <button
                                                    key={slug}
                                                    type="button"
                                                    role="tab"
                                                    aria-selected={
                                                        savedTab === slug
                                                    }
                                                    aria-controls="saved-items-panel"
                                                    onClick={() =>
                                                        loadSavedItems(slug)
                                                    }
                                                    className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-serif text-sm transition focus-visible:ring-2 focus-visible:ring-[#9a672d] focus-visible:outline-none ${
                                                        savedTab === slug
                                                            ? 'bg-[#1d1e1a] text-[#fffaf1]'
                                                            : 'bg-[#eee6da] hover:bg-[#e6dccd]'
                                                    }`}
                                                >
                                                    <Icon className="size-4 stroke-[1.6]" />
                                                    {label} (
                                                    {savedItemCounts[slug]})
                                                </button>
                                            ),
                                        )}
                                    </div>
                                    <div
                                        id="saved-items-panel"
                                        role="tabpanel"
                                        aria-busy={savedItemsLoading}
                                        className={`mt-5 transition-opacity ${savedItemsLoading ? 'pointer-events-none opacity-45' : 'opacity-100'}`}
                                    >
                                        {savedTab === 'bookmarks' &&
                                            (bookmarks.length ? (
                                                <div className="divide-y divide-[#e1d9ce] border-t border-[#e1d9ce]">
                                                    {bookmarks.map(
                                                        (bookmark) => (
                                                            <Link
                                                                key={
                                                                    bookmark.id
                                                                }
                                                                href={
                                                                    bookmark.readerUrl
                                                                }
                                                                className="group flex items-center gap-4 px-1 py-4 transition hover:bg-[#faf6ef] focus-visible:ring-2 focus-visible:ring-[#9a672d] focus-visible:outline-none sm:px-2"
                                                            >
                                                                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eee5d8] text-[#755b34]">
                                                                    <Bookmark className="size-5 fill-current stroke-[1.4]" />
                                                                </span>
                                                                <div className="min-w-0 flex-1 font-serif">
                                                                    <p className="truncate text-lg text-[#20211d]">
                                                                        {bookmark.title ||
                                                                            bookmark.reference}
                                                                    </p>
                                                                    <p className="mt-0.5 truncate text-sm text-[#6f685f]">
                                                                        {
                                                                            bookmark.reference
                                                                        }{' '}
                                                                        ·{' '}
                                                                        {
                                                                            bookmark.edition
                                                                        }
                                                                    </p>
                                                                </div>
                                                                {bookmark.createdAt && (
                                                                    <span className="hidden shrink-0 font-serif text-xs text-[#6f685f] sm:block">
                                                                        {
                                                                            bookmark.createdAt
                                                                        }
                                                                    </span>
                                                                )}
                                                                <ChevronRight className="size-4 shrink-0 text-[#8c8377] transition group-hover:translate-x-0.5" />
                                                            </Link>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-[#d9d0c4] bg-[#faf6ef]/55 px-6 text-center">
                                                    <Bookmark className="size-8 stroke-[#9b825d] stroke-[1.25]" />
                                                    <h3 className="mt-3 font-serif text-lg">
                                                        No bookmarks yet
                                                    </h3>
                                                    <p className="mt-1 max-w-sm font-serif text-sm leading-6 text-[#6f685f]">
                                                        Save a passage from the
                                                        reader and it will
                                                        appear here.
                                                    </p>
                                                    <Link
                                                        href="/read/JHN/1"
                                                        className="mt-4 rounded-full bg-[#ede4d6] px-5 py-2 font-serif text-sm hover:bg-[#e2d5c3]"
                                                    >
                                                        Start reading
                                                    </Link>
                                                </div>
                                            ))}
                                        {savedTab === 'highlights' &&
                                            (highlights.length ? (
                                                <div className="divide-y divide-[#e1d9ce] border-t border-[#e1d9ce]">
                                                    {highlights.map(
                                                        (highlight) => (
                                                            <Link
                                                                key={
                                                                    highlight.id
                                                                }
                                                                href={
                                                                    highlight.readerUrl
                                                                }
                                                                className="group flex items-center gap-4 px-1 py-4 transition hover:bg-[#faf6ef] focus-visible:ring-2 focus-visible:ring-[#9a672d] focus-visible:outline-none sm:px-2"
                                                            >
                                                                <span
                                                                    aria-hidden="true"
                                                                    className="size-11 shrink-0 rounded-xl"
                                                                    style={{
                                                                        backgroundColor:
                                                                            highlightColours[
                                                                                highlight
                                                                                    .color
                                                                            ],
                                                                    }}
                                                                />
                                                                <div className="min-w-0 flex-1 font-serif">
                                                                    <p className="truncate text-lg text-[#20211d]">
                                                                        “
                                                                        {
                                                                            highlight.selectedText
                                                                        }
                                                                        ”
                                                                    </p>
                                                                    <p className="mt-0.5 truncate text-sm text-[#6f685f]">
                                                                        {
                                                                            highlight.reference
                                                                        }{' '}
                                                                        ·{' '}
                                                                        {
                                                                            highlight.edition
                                                                        }
                                                                    </p>
                                                                    {highlightLabels[
                                                                        highlight
                                                                            .color
                                                                    ] && (
                                                                        <span className="mt-2 inline-flex rounded-full bg-[#eee5d8] px-2.5 py-1 font-sans text-[0.65rem] font-semibold text-[#675f55]">
                                                                            {
                                                                                highlightLabels[
                                                                                    highlight
                                                                                        .color
                                                                                ]
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {highlight.createdAt && (
                                                                    <span className="hidden shrink-0 font-serif text-xs text-[#6f685f] sm:block">
                                                                        {
                                                                            highlight.createdAt
                                                                        }
                                                                    </span>
                                                                )}
                                                                <ChevronRight className="size-4 shrink-0 text-[#8c8377] transition group-hover:translate-x-0.5" />
                                                            </Link>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-[#d9d0c4] bg-[#faf6ef]/55 px-6 text-center">
                                                    <Highlighter className="size-8 stroke-[#9b825d] stroke-[1.25]" />
                                                    <h3 className="mt-3 font-serif text-lg">
                                                        No highlights yet
                                                    </h3>
                                                    <p className="mt-1 max-w-sm font-serif text-sm leading-6 text-[#6f685f]">
                                                        Select words in the
                                                        reader and choose a
                                                        colour to save a
                                                        highlight.
                                                    </p>
                                                </div>
                                            ))}
                                        {savedTab === 'notes' &&
                                            (notes.length ? (
                                                <div className="divide-y divide-[#e1d9ce] border-t border-[#e1d9ce]">
                                                    {notes.map((note) => (
                                                        <article
                                                            key={note.id}
                                                            className="group flex items-center gap-2 px-1 py-1 transition hover:bg-[#faf6ef] sm:px-2"
                                                        >
                                                            <Link
                                                                href={
                                                                    note.noteUrl
                                                                }
                                                                className="flex min-w-0 flex-1 items-center gap-4 rounded-lg py-3 focus-visible:ring-2 focus-visible:ring-[#9a672d] focus-visible:outline-none"
                                                            >
                                                                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eee5d8] text-[#755b34]">
                                                                    <FileText className="size-5 stroke-[1.4]" />
                                                                </span>
                                                                <div className="min-w-0 flex-1 font-serif">
                                                                    <p className="truncate text-lg text-[#20211d]">
                                                                        {
                                                                            note.title
                                                                        }
                                                                    </p>
                                                                    <p className="mt-0.5 truncate text-sm text-[#6f685f]">
                                                                        {
                                                                            note.reference
                                                                        }{' '}
                                                                        ·{' '}
                                                                        {
                                                                            note.edition
                                                                        }
                                                                    </p>
                                                                </div>
                                                                {note.updatedAt && (
                                                                    <span className="hidden shrink-0 font-serif text-xs text-[#6f685f] sm:block">
                                                                        {
                                                                            note.updatedAt
                                                                        }
                                                                    </span>
                                                                )}
                                                                <ChevronRight className="size-4 shrink-0 text-[#8c8377] transition group-hover:translate-x-0.5" />
                                                            </Link>
                                                            <Link
                                                                href={
                                                                    note.editUrl
                                                                }
                                                                aria-label={`Edit ${note.title}`}
                                                                className="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 font-serif text-sm text-[#6f6559] hover:bg-[#eee5d8] hover:text-[#211f1b] focus-visible:ring-2 focus-visible:ring-[#9a672d] focus-visible:outline-none"
                                                            >
                                                                <Pencil className="size-4" />
                                                                <span className="hidden lg:inline">
                                                                    Edit
                                                                </span>
                                                            </Link>
                                                        </article>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-[#d9d0c4] bg-[#faf6ef]/55 px-6 text-center">
                                                    <FileText className="size-8 stroke-[#9b825d] stroke-[1.25]" />
                                                    <h3 className="mt-3 font-serif text-lg">
                                                        No notes yet
                                                    </h3>
                                                    <p className="mt-1 max-w-sm font-serif text-sm leading-6 text-[#6f685f]">
                                                        Add a note beside a
                                                        verse or section, or
                                                        attach one to selected
                                                        text.
                                                    </p>
                                                    <Link
                                                        href="/read/JHN/1"
                                                        className="mt-4 rounded-full bg-[#ede4d6] px-5 py-2 font-serif text-sm hover:bg-[#e2d5c3]"
                                                    >
                                                        Start reading
                                                    </Link>
                                                </div>
                                            ))}
                                        {savedItems.lastPage > 1 && (
                                            <nav
                                                aria-label={`${savedTab} pagination`}
                                                className="mt-5 flex items-center justify-between gap-3 border-t border-[#e1d9ce] pt-4"
                                            >
                                                <button
                                                    type="button"
                                                    disabled={
                                                        savedItems.currentPage ===
                                                            1 ||
                                                        savedItemsLoading
                                                    }
                                                    onClick={() =>
                                                        loadSavedItems(
                                                            savedTab,
                                                            savedItems.currentPage -
                                                                1,
                                                        )
                                                    }
                                                    className="cursor-pointer rounded-full bg-[#eee6da] px-4 py-2 font-serif text-sm transition hover:bg-[#e2d6c4] disabled:cursor-not-allowed disabled:opacity-45"
                                                >
                                                    Previous
                                                </button>
                                                <span className="font-serif text-sm text-[#71695e]">
                                                    Page{' '}
                                                    {savedItems.currentPage} of{' '}
                                                    {savedItems.lastPage}
                                                </span>
                                                <button
                                                    type="button"
                                                    disabled={
                                                        savedItems.currentPage ===
                                                            savedItems.lastPage ||
                                                        savedItemsLoading
                                                    }
                                                    onClick={() =>
                                                        loadSavedItems(
                                                            savedTab,
                                                            savedItems.currentPage +
                                                                1,
                                                        )
                                                    }
                                                    className="cursor-pointer rounded-full bg-[#eee6da] px-4 py-2 font-serif text-sm transition hover:bg-[#e2d6c4] disabled:cursor-not-allowed disabled:opacity-45"
                                                >
                                                    Next
                                                </button>
                                            </nav>
                                        )}
                                    </div>
                                </Panel>
                            </div>

                            <div className="grid content-start gap-4">
                                <Panel className="p-6">
                                    <SectionHeading
                                        action={
                                            <span className="font-serif text-sm text-[#6f685f]">
                                                No history yet
                                            </span>
                                        }
                                    >
                                        Recently viewed
                                    </SectionHeading>
                                    <Link
                                        href="/read/JHN/1"
                                        className="mt-5 flex items-center gap-4 rounded-xl border border-[#e5ded4] p-3 transition hover:bg-[#f5eee4] focus-visible:ring-2 focus-visible:ring-[#9a672d] focus-visible:outline-none"
                                    >
                                        <img
                                            src="/images/scripture/john-olive-branch.png"
                                            alt=""
                                            className="h-16 w-24 rounded-lg object-cover"
                                        />
                                        <div className="min-w-0 font-serif">
                                            <p className="text-base">
                                                Begin with John
                                            </p>
                                            <p className="mt-1 truncate text-sm text-[#6f685f]">
                                                The Word becomes flesh
                                            </p>
                                        </div>
                                        <ChevronRight className="ml-auto size-4 shrink-0" />
                                    </Link>
                                </Panel>

                                <Panel id="preferences" className="p-6">
                                    <SectionHeading>Preferences</SectionHeading>
                                    <div className="mt-4 grid sm:grid-cols-2">
                                        <div className="flex items-center gap-3 border-b border-[#e1d9ce] py-4 pr-3 sm:border-r">
                                            <BookOpen className="size-6 stroke-[1.4]" />
                                            <div className="min-w-0 flex-1 font-serif">
                                                <p className="text-sm">
                                                    Default translation
                                                </p>
                                                <CustomSelect
                                                    label="Default translation"
                                                    value={defaultEditionSlug}
                                                    options={availableEditions.map((available) => ({
                                                        value: available.slug,
                                                        label: `${available.name} (${available.abbreviation})`,
                                                    }))}
                                                    onChange={(translation) =>
                                                        router.patch(
                                                            '/settings/default-translation',
                                                            { translation },
                                                            { preserveScroll: true },
                                                        )
                                                    }
                                                    className="mt-1"
                                                    triggerClassName="!border-0 !bg-transparent !p-0 !text-xs !text-[#6f685f] !shadow-none focus-visible:!ring-0"
                                                />
                                            </div>
                                        </div>
                                        <a
                                            href="#saved-items"
                                            className="flex items-center gap-3 border-b border-[#e1d9ce] py-4 sm:pl-4"
                                        >
                                            <span className="font-serif text-2xl">
                                                Aa
                                            </span>
                                            <div className="font-serif">
                                                <p className="text-sm">
                                                    Text size
                                                </p>
                                                <p className="text-xs text-[#6f685f]">
                                                    Medium
                                                </p>
                                            </div>
                                            <ChevronRight className="ml-auto size-4" />
                                        </a>
                                        <Link
                                            href={editAppearance()}
                                            className="flex items-center gap-3 py-4 pr-3 sm:border-r sm:border-[#e1d9ce]"
                                        >
                                            <Settings2 className="size-6 stroke-[1.4]" />
                                            <div className="font-serif">
                                                <p className="text-sm">Theme</p>
                                                <p className="text-xs text-[#6f685f] first-letter:uppercase">
                                                    {appearance}
                                                </p>
                                            </div>
                                            <ChevronRight className="ml-auto size-4" />
                                        </Link>
                                        <Link
                                            href={editProfile()}
                                            className="flex items-center gap-3 border-t border-[#e1d9ce] py-4 sm:border-t-0 sm:pl-4"
                                        >
                                            <Globe2 className="size-6 stroke-[1.4]" />
                                            <div className="font-serif">
                                                <p className="text-sm">
                                                    Language
                                                </p>
                                                <p className="text-xs text-[#6f685f]">
                                                    English (UK)
                                                </p>
                                            </div>
                                            <ChevronRight className="ml-auto size-4" />
                                        </Link>
                                    </div>
                                    <div className="flex items-center gap-3 border-t border-[#e1d9ce] py-4">
                                        <Quote className="size-6 shrink-0 stroke-[1.4] text-[#a33a32]" />
                                        <div className="min-w-0 flex-1 font-serif">
                                            <p className="text-sm">
                                                Words of Jesus
                                            </p>
                                            <p className="mt-0.5 text-xs leading-5 text-[#6f685f]">
                                                Use red lettering where the translation provides it.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={redLetterWordsEnabled}
                                            aria-label="Show the words of Jesus in red"
                                            disabled={redLetterWordsSaving}
                                            onClick={toggleRedLetterWords}
                                            className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full border transition focus-visible:ring-2 focus-visible:ring-[#a33a32]/45 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60 ${redLetterWordsEnabled ? 'border-[#8f302b] bg-[#a33a32]' : 'border-[#c8beb1] bg-[#d8d0c5]'}`}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`absolute top-1/2 left-0.5 size-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform ${redLetterWordsEnabled ? 'translate-x-[1.375rem]' : 'translate-x-0'}`}
                                            />
                                        </button>
                                    </div>
                                    <form
                                        className="mt-2 border-t border-[#e1d9ce] pt-5"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            saveHighlightLabels();
                                        }}
                                    >
                                        <div>
                                            <div>
                                                <h3 className="font-serif text-base font-semibold">
                                                    Highlight labels
                                                </h3>
                                                <p className="mt-1 max-w-md font-serif text-xs leading-5 text-[#6f685f]">
                                                    Give each colour a personal meaning. These labels appear when choosing and reviewing highlights.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            {(
                                                [
                                                    ['yellow', 'Gold'],
                                                    ['green', 'Green'],
                                                    ['blue', 'Blue'],
                                                    ['rose', 'Red'],
                                                ] as const
                                            ).map(([colour, fallback]) => (
                                                <label
                                                    key={colour}
                                                    className="flex items-center gap-3 rounded-xl border border-[#e1d9ce] bg-[#fffaf2]/55 px-3 py-2.5"
                                                >
                                                    <span
                                                        aria-hidden="true"
                                                        className="size-7 shrink-0 rounded-lg"
                                                        style={{
                                                            backgroundColor:
                                                                highlightColours[
                                                                    colour
                                                                ],
                                                        }}
                                                    />
                                                    <span className="sr-only">
                                                        Label for {fallback}{' '}
                                                        highlights
                                                    </span>
                                                    <input
                                                        value={
                                                            editableHighlightLabels[
                                                                colour
                                                            ]
                                                        }
                                                        onChange={(event) =>
                                                            setEditableHighlightLabels(
                                                                (current) => ({
                                                                    ...current,
                                                                    [colour]:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        maxLength={48}
                                                        placeholder={`${fallback} label`}
                                                        className="min-w-0 flex-1 bg-transparent font-serif text-sm outline-none placeholder:text-[#9a9287] focus-visible:border-b focus-visible:border-[#3f6b50]"
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={highlightLabelsSaving}
                                                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#3f6b50] px-4 py-2 font-serif text-sm font-semibold text-white transition hover:bg-[#345a43] focus-visible:ring-2 focus-visible:ring-[#3f6b50] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
                                            >
                                                <Save className="size-4" />
                                                {highlightLabelsSaving
                                                    ? 'Saving…'
                                                    : 'Save labels'}
                                            </button>
                                        </div>
                                    </form>
                                </Panel>

                                <Panel>
                                    <Link
                                        href={logout()}
                                        as="button"
                                        className="flex w-full items-center gap-4 rounded-2xl px-7 py-6 font-serif text-lg text-[#a33b20] transition hover:bg-[#fff7ee] focus-visible:ring-2 focus-visible:ring-[#a33b20] focus-visible:outline-none"
                                    >
                                        <LogOut className="size-5 stroke-[1.5]" />
                                        Sign out
                                    </Link>
                                </Panel>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}
