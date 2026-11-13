import { Link } from '@inertiajs/react';
import {
    Bookmark,
    BookOpen,
    Highlighter,
    Menu,
    NotebookPen,
    Search,
    X,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

type SavedItemsSection = 'dashboard' | 'read' | 'search' | 'notes' | 'highlights' | 'bookmarks';

function DashboardIcon({ className = '' }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <rect x="3" y="3" width="7.5" height="4.5" rx="0.8" />
            <rect x="13.5" y="3" width="7.5" height="9.5" rx="0.8" />
            <rect x="3" y="10.5" width="7.5" height="10.5" rx="0.8" />
            <rect x="13.5" y="15.5" width="7.5" height="5.5" rx="0.8" />
        </svg>
    );
}

const navigation = [
    { key: 'dashboard', label: 'Dashboard', icon: DashboardIcon, href: '/dashboard' },
    { key: 'read', label: 'Read', icon: BookOpen, href: '/read/JHN/1' },
    { key: 'search', label: 'Search', icon: Search, href: '/search' },
    { key: 'notes', label: 'Notes', icon: NotebookPen, href: '/notes' },
    { key: 'highlights', label: 'Highlights', icon: Highlighter, href: '/highlights' },
    { key: 'bookmarks', label: 'Bookmarks', icon: Bookmark, href: '/bookmarks' },
] as const;

function SavedItemsNavigation({
    active,
    close,
}: {
    active: SavedItemsSection;
    close?: () => void;
}) {
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

            <nav aria-label="Primary navigation" className="grid gap-1.5">
                {navigation.map(({ key, label, icon: Icon, href }) => (
                    <Link
                        key={key}
                        href={href}
                        onClick={close}
                        aria-current={active === key ? 'page' : undefined}
                        className={`flex items-center gap-4 rounded-xl px-4 py-3 font-serif text-[15px] transition focus-visible:ring-2 focus-visible:ring-[#9a672d] focus-visible:outline-none ${
                            active === key
                                ? 'bg-[#ece3d5] text-[#171813]'
                                : 'hover:bg-[#f0e9de]'
                        }`}
                    >
                        <Icon className="size-[19px] stroke-[1.5]" />
                        {label}
                    </Link>
                ))}
            </nav>
        </div>
    );
}

export default function SavedItemsPageShell({
    active,
    children,
}: {
    active: SavedItemsSection;
    children: ReactNode;
}) {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    return (
        <div className="min-h-svh bg-[#f1ece3] text-[#211f1b]">
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-[184px] border-r border-[#ddd5c9] lg:block">
                <SavedItemsNavigation active={active} />
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
                        <SavedItemsNavigation
                            active={active}
                            close={() => setMobileNavOpen(false)}
                        />
                    </aside>
                </div>
            )}

            <div className="lg:pl-[184px]">
                <header className="flex h-20 items-center justify-between border-b border-[#ddd4c7] bg-[#faf7f0] px-5 sm:px-8 lg:hidden">
                    <button
                        type="button"
                        onClick={() => setMobileNavOpen(true)}
                        className="grid size-10 place-items-center rounded-full border border-[#d9d0c4] bg-white/55 focus-visible:ring-2 focus-visible:ring-[#9a672d] focus-visible:outline-none"
                        aria-label="Open navigation"
                    >
                        <Menu className="size-5" />
                    </button>
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
                    <span className="size-10" aria-hidden="true" />
                </header>
                {children}
            </div>
        </div>
    );
}
