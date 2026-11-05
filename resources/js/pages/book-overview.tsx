import { Head, Link } from '@inertiajs/react';
import { ArrowRight, BookOpen } from 'lucide-react';

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
    };
}

export default function BookOverview({
    edition,
    book,
    canonicalUrl,
}: BookOverviewProps) {
    const longNamePrefix = book.longName?.endsWith(book.name)
        ? book.longName.slice(0, -book.name.length).trim()
        : book.longName;
    const title = `${book.name} — ${edition.name}`;
    const description = `Read ${book.longName ?? book.name} online in the ${edition.name} (${edition.abbreviation}).`;

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
            <main className="grid min-h-screen place-items-center bg-[#f4efe5] px-6 text-[#25221e]">
                <section className="w-full max-w-2xl rounded-[2rem] bg-[#fffdf9] p-9 shadow-[0_22px_70px_-42px_rgba(41,37,36,0.45)] sm:p-14">
                    <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-[#a95624] uppercase">
                        <BookOpen className="size-5" /> {edition.name}
                    </div>
                    <p className="mt-10 text-xs font-semibold tracking-[0.28em] uppercase">
                        {longNamePrefix ?? 'Book overview'}
                    </p>
                    <h1 className="mt-2 font-serif text-7xl font-black tracking-tight">
                        {book.name}
                    </h1>
                    <p className="mt-7 max-w-lg text-stone-600">
                        This is the future overview for {book.name}. Its
                        structure, introductory material and chapter navigation
                        will be designed separately.
                    </p>
                    <Link
                        href={`/read/${book.code}/1`}
                        className="mt-10 inline-flex items-center gap-3 rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white"
                    >
                        Start reading <ArrowRight className="size-4" />
                    </Link>
                </section>
            </main>
        </>
    );
}
