import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, BookOpen, Search as SearchIcon } from 'lucide-react';

export default function Search() {
    return (
        <>
            <Head title="Search" />
            <main className="min-h-screen bg-[#f4efe5] px-6 py-8 text-[#25221e]">
                <div className="mx-auto max-w-3xl">
                    <div className="flex items-center justify-between">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-950"
                        >
                            <ArrowLeft className="size-4" /> Back to reader
                        </Link>
                        <div className="flex items-center gap-2 font-serif font-semibold">
                            <BookOpen className="size-5" /> Open Bible
                        </div>
                    </div>
                    <section className="mt-24 rounded-[2rem] bg-[#fffdf9] p-8 shadow-[0_22px_70px_-42px_rgba(41,37,36,0.45)] sm:p-12">
                        <SearchIcon className="size-7 text-[#a95624]" />
                        <h1 className="mt-5 font-serif text-5xl font-semibold tracking-tight">
                            Search
                        </h1>
                        <p className="mt-4 max-w-lg text-stone-600">
                            Bible search will live here. We’ll design the search
                            experience and result presentation in a later pass.
                        </p>
                    </section>
                </div>
            </main>
        </>
    );
}
