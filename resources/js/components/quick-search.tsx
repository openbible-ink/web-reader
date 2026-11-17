import { Link, router } from '@inertiajs/react';
import { ArrowRight, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type QuickResult = {
    id: number | string;
    kind?: 'verse' | 'section' | 'note';
    title?: string;
    bookName: string;
    chapter: string;
    verse: string;
    reference?: string;
    sectionTitle: string | null;
    text: string;
    url: string;
};

type SearchPayload = {
    props?: {
        results?: { data: QuickResult[] } | null;
        reference?: { label: string; url: string } | null;
        regexError?: string | null;
    };
};

export default function QuickSearch() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<QuickResult[]>([]);
    const [reference, setReference] = useState<{ label: string; url: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const requestRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setOpen(true);
            }
            if (event.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, []);

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.requestAnimationFrame(() => inputRef.current?.focus());
        return () => { document.body.style.overflow = previousOverflow; };
    }, [open]);

    useEffect(() => {
        if (!open || query.trim().length < 2) {
            requestRef.current?.abort();
            setResults([]);
            setReference(null);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const timer = window.setTimeout(async () => {
            requestRef.current?.abort();
            const controller = new AbortController();
            requestRef.current = controller;
            try {
                const response = await fetch(`/search?quick=1&q=${encodeURIComponent(query.trim())}`, {
                    signal: controller.signal,
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                });
                if (!response.ok) throw new Error('Search unavailable');
                const payload = await response.json() as SearchPayload;
                setResults(payload.props?.results?.data?.slice(0, 12) ?? []);
                setReference(payload.props?.reference ?? null);
                setError(payload.props?.regexError ?? null);
            } catch (searchError) {
                if ((searchError as Error).name !== 'AbortError') setError('Search is unavailable right now.');
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 240);

        return () => window.clearTimeout(timer);
    }, [open, query]);

    const close = () => setOpen(false);
    const visit = (url: string) => {
        close();
        setQuery('');
        setResults([]);
        setReference(null);
        setError(null);
        router.visit(url);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh]" role="dialog" aria-modal="true" aria-label="Quick scripture search">
            <button type="button" onClick={close} className="absolute inset-0 cursor-default bg-[#201b16]/30 backdrop-blur-[3px]" aria-label="Close search" />
            <div className="relative w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-white/70 bg-[#fbf8f2]/98 shadow-[0_28px_90px_rgba(28,21,15,0.38)]">
                <div className="flex items-center justify-between gap-4 px-5 pt-4 text-sm sm:px-6">
                    <span className="font-serif text-[#756b60]">Search the Bible</span>
                    {query.trim() && <Link href={`/search?q=${encodeURIComponent(query.trim())}`} onClick={close} className="font-serif font-semibold text-[#96572d] underline decoration-[#c9a17e] underline-offset-4 hover:text-[#713c1d] focus-visible:ring-2 focus-visible:ring-[#a95624] focus-visible:outline-none">See all results</Link>}
                </div>
                <div className="p-4 sm:p-5">
                    <label className="flex h-16 items-center gap-3 rounded-2xl border border-[#d2c5b5] bg-white px-4 shadow-[0_10px_30px_rgba(45,34,23,0.1)] focus-within:ring-2 focus-within:ring-[#a95624]/30">
                        <Search className="size-5 shrink-0 text-[#a45e2e]" aria-hidden="true" />
                        <span className="sr-only">Search scripture</span>
                        <input ref={inputRef} type="text" inputMode="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && query.trim()) visit(`/search?q=${encodeURIComponent(query.trim())}`); }} placeholder="Search scripture or enter a reference…" className="min-w-0 flex-1 bg-transparent font-serif text-lg outline-none placeholder:text-[#9b9186]" />
                        <kbd className="hidden rounded-md border border-[#ddd3c6] bg-[#f4efe7] px-2 py-1 font-sans text-[0.68rem] text-[#7c7267] sm:block">ESC</kbd>
                        <button type="button" onClick={close} aria-label="Close search" className="cursor-pointer rounded-full p-1.5 text-[#776d62] transition hover:bg-[#eee7dc] hover:text-[#332d27] focus-visible:ring-2 focus-visible:ring-[#a95624] focus-visible:outline-none"><X className="size-4" /></button>
                    </label>

                    <div className="mt-3 max-h-[23rem] overflow-y-auto overscroll-contain p-1" aria-live="polite">
                        {loading && <div role="status" className="grid gap-2 p-1 motion-safe:animate-pulse"><span className="sr-only">Searching…</span>{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-[5.25rem] rounded-xl border border-[#e3dbcf] bg-white/65 p-4"><div className="h-3 w-28 rounded-full bg-[#c7bbac]/40" /><div className="mt-3 h-2.5 w-4/5 rounded-full bg-[#c7bbac]/30" /></div>)}</div>}
                        {!loading && error && <p role="alert" className="rounded-xl border border-[#dfc5b7] bg-[#fff4ed] px-4 py-3 font-serif text-sm text-[#82472e]">{error}</p>}
                        {!loading && reference && <button type="button" onClick={() => visit(reference.url)} className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-[#ddd2c4] bg-white px-4 py-4 text-left transition hover:border-[#bd9169] hover:bg-[#fffaf3]"><span className="min-w-0 flex-1"><span className="block text-[0.65rem] font-semibold tracking-[0.16em] text-[#8c7968] uppercase">Go directly to</span><span className="mt-1 block font-serif text-lg font-bold">{reference.label}</span></span><ArrowRight className="size-4 text-[#9a572a] transition-transform group-hover:translate-x-1" /></button>}
                        {!loading && !error && !reference && results.length > 0 && <div className="divide-y divide-[#e7ded2] overflow-hidden rounded-xl border border-[#ddd3c7] bg-white/85">{results.map((result) => <button type="button" key={result.id} onClick={() => visit(result.url)} className="group flex min-h-[5.25rem] w-full cursor-pointer items-center gap-4 px-4 py-3 text-left transition hover:bg-[#f6eee2] focus-visible:bg-[#f6eee2] focus-visible:outline-none"><span className="min-w-0 flex-1"><span className="block font-serif font-bold text-[#29251f]">{result.kind === 'note' ? result.title : result.kind === 'section' ? result.sectionTitle : `${result.bookName} ${result.chapter}:${result.verse}`}</span><span className="mt-1 block truncate font-serif text-sm text-[#746a60]">{result.kind === 'section' ? result.reference : result.kind === 'note' ? `${result.reference} · ${result.text}` : result.text}</span></span><ArrowRight className="size-4 shrink-0 text-[#a16337] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" /></button>)}</div>}
                        {!loading && !error && !reference && query.trim().length >= 2 && results.length === 0 && <p className="rounded-xl border border-dashed border-[#d7ccbd] px-4 py-6 text-center font-serif text-sm text-[#756c62]">No matching passages</p>}
                        {!loading && query.trim().length < 2 && <p className="px-4 py-6 text-center font-serif text-sm leading-6 text-[#81776c]">Search words, quoted phrases, regex, references, or filters such as <code className="rounded bg-[#ece7df] px-1.5 py-0.5 font-mono text-xs">in:footnotes</code>.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
