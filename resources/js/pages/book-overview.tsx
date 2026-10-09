import { Head, Link } from '@inertiajs/react';
import { ArrowRight, BookOpen } from 'lucide-react';

export default function BookOverview() {
    return (
        <>
            <Head title="John — Book overview" />
            <main className="grid min-h-screen place-items-center bg-[#f4efe5] px-6 text-[#25221e]">
                <section className="w-full max-w-2xl rounded-[2rem] bg-[#fffdf9] p-9 shadow-[0_22px_70px_-42px_rgba(41,37,36,0.45)] sm:p-14">
                    <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-[#a95624] uppercase">
                        <BookOpen className="size-5" /> Book overview
                    </div>
                    <p className="mt-10 text-xs font-semibold tracking-[0.28em] uppercase">
                        The Gospel according to
                    </p>
                    <h1 className="mt-2 font-serif text-7xl font-semibold tracking-tight">
                        John
                    </h1>
                    <p className="mt-7 max-w-lg text-stone-600">
                        This is the future overview for John. Its structure,
                        introductory material and chapter navigation will be
                        designed separately.
                    </p>
                    <Link
                        href="/"
                        className="mt-10 inline-flex items-center gap-3 rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white"
                    >
                        Continue reading <ArrowRight className="size-4" />
                    </Link>
                </section>
            </main>
        </>
    );
}
