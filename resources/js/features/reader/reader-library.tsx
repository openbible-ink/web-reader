import { Link } from '@inertiajs/react';
import { Bookmark, BookOpen, Highlighter, NotebookPen, X } from 'lucide-react';
import type { ReaderProps } from './types';

function DashboardIcon({
    className = '',
    strokeWidth = 1.6,
}: {
    className?: string;
    strokeWidth?: number;
}) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
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

export function ReaderBrand() {
    return (
        <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-md text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a95624]"
        >
            <img
                src="/images/brand/open-bible-mark-dark-128.png"
                alt=""
                aria-hidden="true"
                className="size-8 object-contain"
                width="32"
                height="32"
            />
            <span className="font-serif text-[1.08rem] font-semibold">
                Open Bible
            </span>
        </Link>
    );
}

export function ReaderLibrary({
    activeBookCode,
    books,
    close,
}: {
    activeBookCode: string;
    books: ReaderProps['libraryBooks'];
    close?: () => void;
}) {
    const navItems = [
        { icon: DashboardIcon, label: 'Dashboard', href: '/dashboard' },
        { icon: BookOpen, label: 'Read' },
        { icon: NotebookPen, label: 'Notes', href: '/notes' },
        { icon: Highlighter, label: 'Highlights', href: '/highlights' },
        { icon: Bookmark, label: 'Bookmarks', href: '/bookmarks' },
    ] as const;

    return (
        <div className="flex h-full flex-col bg-[#faf8f3]">
            <div className="flex items-center justify-between px-8 pt-7 pb-8">
                <ReaderBrand />
                {close && (
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Close library"
                    >
                        <X className="size-5" />
                    </button>
                )}
            </div>
            <nav className="px-5 font-serif text-[0.98rem] text-stone-700">
                {navItems.map(({ icon: Icon, label, ...item }) => {
                    const className = `mb-1 flex w-full cursor-pointer items-center gap-4 rounded-r-xl border-l-2 px-5 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a95624] ${label === 'Read' ? 'border-[#b85f28] bg-[#f2ece3] text-[#94491e]' : 'border-transparent'}`;
                    const content = (
                        <>
                            <Icon className="size-5" strokeWidth={1.6} />
                            {label}
                        </>
                    );

                    return 'href' in item ? (
                        <Link
                            key={label}
                            href={item.href}
                            className={className}
                        >
                            {content}
                        </Link>
                    ) : (
                        <button key={label} type="button" className={className}>
                            {content}
                        </button>
                    );
                })}
            </nav>
            <div className="mx-10 my-5 border-t border-stone-200" />
            <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-10">
                {(['old', 'new'] as const).map((testament) => {
                    const testamentBooks = books.filter(
                        (book) => book.testament === testament,
                    );
                    if (testamentBooks.length === 0) return null;

                    return (
                        <section key={testament}>
                            <p className="sticky top-0 z-10 mb-2 bg-[#faf8f3] py-2 text-[0.63rem] font-semibold tracking-[0.26em] text-stone-500 uppercase">
                                {testament === 'old'
                                    ? 'Old Testament'
                                    : 'New Testament'}
                            </p>
                            <div className="mb-4 font-serif text-[0.93rem] leading-[1.9] text-stone-600">
                                {testamentBooks.map((book) => (
                                    <Link
                                        key={book.code}
                                        href={book.readerUrl}
                                        onClick={close}
                                        className={`block w-full rounded-lg px-1 text-left ${book.code === activeBookCode ? 'font-semibold text-stone-950' : 'hover:text-stone-950'}`}
                                    >
                                        {book.name}
                                    </Link>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
