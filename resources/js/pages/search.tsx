import CustomSelect from '@/components/custom-select';
import SavedItemsPageShell from '@/components/saved-items-page-shell';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Search as SearchIcon, Sparkles } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';

type Edition = { slug: string; name: string; abbreviation: string };
type Book = { code: string; name: string };
type SearchResult = { id: number; bookCode: string; bookName: string; chapter: string; verse: string; sectionTitle: string | null; text: string; url: string };
type Pagination = { data: SearchResult[]; current_page: number; last_page: number; total: number; prev_page_url: string | null; next_page_url: string | null };
type Reference = { label: string; url: string };

function Highlighted({ text, query }: { text: string; query: string }) {
    const terms = query.trim().split(/\s+/).filter((term) => term.length > 1);
    if (!terms.length) return text;
    const expression = new RegExp(`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return text.split(expression).map((part, index) =>
        terms.some((term) => term.toLowerCase() === part.toLowerCase())
            ? <mark key={`${part}-${index}`} className="rounded-sm bg-[#eacb91]/55 px-0.5 text-inherit">{part}</mark>
            : <span key={`${part}-${index}`}>{part}</span>,
    );
}

export default function Search({ query, edition, editions, books, selectedBook, reference, results, indexReady }: {
    query: string; edition: Edition; editions: Edition[]; books: Book[]; selectedBook: string;
    reference: Reference | null; results: Pagination | null; indexReady: boolean;
}) {
    const [search, setSearch] = useState(query);
    const [translation, setTranslation] = useState(edition.slug);
    const [book, setBook] = useState(selectedBook);

    const visit = (nextTranslation = translation, nextBook = book) => {
        router.get('/search', { q: search, translation: nextTranslation, book: nextBook || undefined }, { preserveState: true, replace: true });
    };
    const submit = (event: FormEvent) => { event.preventDefault(); visit(); };

    return (
        <SavedItemsPageShell active="search">
            <Head title={query ? `Search: ${query}` : 'Search'} />
            <main className="min-h-svh px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
                <div className="mx-auto max-w-6xl">
                    <header className="relative overflow-hidden rounded-[2rem] border border-[#dfd5c7] bg-[#fbf7ef] px-6 py-10 shadow-[0_24px_70px_-50px_rgba(45,34,22,0.55)] sm:px-10 lg:px-14">
                        <div aria-hidden="true" className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_30%,rgba(191,113,52,0.18),transparent_52%),linear-gradient(135deg,transparent,rgba(87,102,76,0.12))]" />
                        <div className="relative max-w-3xl">
                            <p className="text-xs font-semibold tracking-[0.28em] text-[#9a672d] uppercase">Explore scripture</p>
                            <h1 className="mt-3 font-serif text-5xl font-black tracking-[-0.035em] sm:text-6xl">Search the Bible</h1>
                            <p className="mt-3 max-w-xl font-serif text-base leading-7 text-[#6f685f]">Search the wording of your chosen translation, or enter a reference such as John 3:16.</p>
                        </div>
                        <form onSubmit={submit} role="search" className="relative mt-8">
                            <label className="flex min-h-16 items-center gap-4 rounded-2xl border border-[#cfc3b3] bg-white/90 px-5 shadow-[0_10px_34px_rgba(49,38,25,0.09)] focus-within:ring-2 focus-within:ring-[#a95624]/30">
                                <SearchIcon className="size-6 shrink-0 stroke-[1.6] text-[#a95624]" aria-hidden="true" />
                                <span className="sr-only">Search scripture</span>
                                <input type="search" name="q" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try “light of the world” or “John 3:16”" className="min-w-0 flex-1 bg-transparent font-serif text-lg outline-none placeholder:text-[#948b80]" autoFocus />
                                <button type="submit" className="hidden cursor-pointer items-center gap-2 rounded-full bg-[#282821] px-5 py-2.5 font-serif text-sm font-semibold text-white transition hover:bg-[#464238] focus-visible:ring-2 focus-visible:ring-[#a95624] focus-visible:ring-offset-2 focus-visible:outline-none sm:inline-flex">Search <ArrowRight className="size-4" /></button>
                            </label>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
                                <CustomSelect value={translation} options={editions.map((item) => ({ value: item.slug, label: `${item.name} (${item.abbreviation})` }))} onChange={(value) => { setTranslation(value); setBook(''); visit(value, ''); }} label="Translation" variant="inline" triggerClassName="bg-[#fffaf2]/70" />
                                <CustomSelect value={book} options={[{ value: '', label: 'All books' }, ...books.map((item) => ({ value: item.code, label: item.name }))]} onChange={(value) => { setBook(value); visit(translation, value); }} label="Book" variant="inline" triggerClassName="bg-[#fffaf2]/70" />
                            </div>
                        </form>
                    </header>

                    <section className="mt-8" aria-live="polite">
                        {!indexReady && <div className="rounded-2xl border border-[#d8c8b3] bg-[#fff8eb] p-6 font-serif text-[#665744]">This translation is being prepared for search. Try another translation for now.</div>}
                        {indexReady && reference && (
                            <Link href={reference.url} className="group flex items-center gap-5 rounded-2xl border border-[#d9cdbd] bg-[#fffdf8] p-6 shadow-sm transition hover:border-[#b98555] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#a95624] focus-visible:outline-none">
                                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#eee1cd] text-[#9a572a]"><BookOpen className="size-6 stroke-[1.5]" /></span>
                                <span className="min-w-0 flex-1"><span className="block text-[0.68rem] font-semibold tracking-[0.2em] text-[#8a7968] uppercase">Go directly to</span><span className="mt-1 block font-serif text-2xl font-bold">{reference.label}</span></span>
                                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                            </Link>
                        )}
                        {indexReady && results && (
                            <>
                                <div className="flex flex-wrap items-end justify-between gap-3">
                                    <div><p className="text-xs font-semibold tracking-[0.2em] text-[#8a7968] uppercase">{edition.name}</p><h2 className="mt-1 font-serif text-3xl font-bold">{results.total.toLocaleString()} {results.total === 1 ? 'result' : 'results'}</h2></div>
                                    {selectedBook && <Link href={`/search?q=${encodeURIComponent(query)}&translation=${edition.slug}`} className="font-serif text-sm text-[#8f542c] underline decoration-[#caa27f] underline-offset-4">Clear book filter</Link>}
                                </div>
                                {results.data.length ? (
                                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                        {results.data.map((result) => (
                                            <Link key={result.id} href={result.url} className="group flex min-h-48 flex-col rounded-2xl border border-[#ded5c9] bg-[#fffdf9] p-6 shadow-[0_10px_35px_-28px_rgba(41,34,25,0.7)] transition hover:border-[#c9a887] hover:shadow-[0_16px_42px_-26px_rgba(41,34,25,0.7)] focus-visible:ring-2 focus-visible:ring-[#a95624] focus-visible:outline-none">
                                                <div className="flex items-start justify-between gap-4"><div><p className="font-serif text-xl font-bold">{result.bookName} {result.chapter}:{result.verse}</p>{result.sectionTitle && <p className="mt-1 text-xs font-semibold tracking-[0.14em] text-[#8b7d6e] uppercase">{result.sectionTitle}</p>}</div><span className="rounded-full bg-[#eee7dc] px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.12em] text-[#6d6257] uppercase">{edition.abbreviation}</span></div>
                                                <p className="mt-5 font-serif text-lg leading-8 text-[#37322c]"><Highlighted text={result.text} query={query} /></p>
                                                <span className="mt-auto pt-5 font-serif text-sm font-semibold text-[#9a572a]">Read in context <ArrowRight className="ml-1 inline size-4 transition-transform group-hover:translate-x-1" /></span>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-5 rounded-2xl border border-dashed border-[#cec2b3] bg-[#faf6ef] px-6 py-12 text-center"><Sparkles className="mx-auto size-7 text-[#a56b39]" /><h3 className="mt-3 font-serif text-xl font-bold">No matching verses</h3><p className="mt-2 font-serif text-sm text-[#766d62]">Try fewer words, a different book, or another translation.</p></div>
                                )}
                                {results.last_page > 1 && <nav aria-label="Search results pagination" className="mt-6 flex items-center justify-between border-t border-[#d9d0c3] pt-5"><PaginationLink href={results.prev_page_url}><ChevronLeft className="size-4" /> Previous</PaginationLink><span className="font-serif text-sm text-[#71695f]">Page {results.current_page} of {results.last_page}</span><PaginationLink href={results.next_page_url}>Next <ChevronRight className="size-4" /></PaginationLink></nav>}
                            </>
                        )}
                        {indexReady && !query && <div className="grid gap-4 sm:grid-cols-3">{['John 3:16', 'light of the world', 'love one another'].map((suggestion) => <Link key={suggestion} href={`/search?q=${encodeURIComponent(suggestion)}&translation=${edition.slug}`} className="rounded-2xl border border-[#ded5c9] bg-[#fffdf9] p-5 font-serif text-lg transition hover:border-[#bd9169] hover:shadow-sm">{suggestion}<ArrowRight className="mt-4 size-4 text-[#9a572a]" /></Link>)}</div>}
                    </section>
                </div>
            </main>
        </SavedItemsPageShell>
    );
}

function PaginationLink({ href, children }: { href: string | null; children: ReactNode }) {
    const classes = 'inline-flex min-w-24 items-center justify-center gap-2 rounded-full border border-[#d0c5b7] px-4 py-2 font-serif text-sm transition';
    return href ? <Link href={href} preserveScroll className={`${classes} hover:bg-[#fffaf2]`}>{children}</Link> : <span className={`${classes} opacity-35`}>{children}</span>;
}
