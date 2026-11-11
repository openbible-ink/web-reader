import SavedItemsPageShell from '@/components/saved-items-page-shell';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';

interface BooksProps {
    books: Array<{
        code: string;
        name: string;
        longName?: string | null;
        testament: 'old' | 'new';
    }>;
}

export default function Books({ books }: BooksProps) {
    const sections = [
        { key: 'old', label: 'Old Testament' },
        { key: 'new', label: 'New Testament' },
    ] as const;

    return (
        <>
            <Head title="Books" />
            <SavedItemsPageShell active="read">
                <main className="min-h-[calc(100svh-5rem)] bg-[#f4efe5] px-6 py-12 text-[#25221e] lg:min-h-svh lg:px-12">
                    <div className="mx-auto max-w-5xl">
                        <p className="text-xs font-semibold tracking-[0.28em] uppercase">
                            Library
                        </p>
                        <h1 className="mt-2 font-serif text-6xl font-black tracking-tight">
                            Books
                        </h1>

                        <div className="mt-12 grid gap-12">
                            {sections.map((section) => (
                                <section key={section.key}>
                                    <h2 className="font-serif text-2xl font-semibold">
                                        {section.label}
                                    </h2>
                                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {books
                                            .filter(
                                                (book) =>
                                                    book.testament ===
                                                    section.key,
                                            )
                                            .map((book) => (
                                                <Link
                                                    key={book.code}
                                                    href={`/books/${book.code}`}
                                                    className="group flex items-center justify-between gap-4 rounded-2xl border border-[#ded5c8] bg-[#fffdf9] px-5 py-4 transition hover:border-[#cba988] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#a95624]/45 focus-visible:outline-none"
                                                >
                                                    <span className="font-serif text-lg font-semibold">
                                                        {book.name}
                                                    </span>
                                                    <ArrowRight className="size-4 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-[#a95624]" />
                                                </Link>
                                            ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>
                </main>
            </SavedItemsPageShell>
        </>
    );
}
