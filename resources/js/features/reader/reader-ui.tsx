import { NotebookPen } from 'lucide-react';
import CustomSelect from '@/components/custom-select';
import type { ScriptureNote } from './types';

export function FilledHighlighter({ className = '' }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4Z" />
            <path d="m8.25 13.05-5.5 5.5V21h8.5l2.55-2.55Z" />
        </svg>
    );
}

export function SwapTranslationsIcon({
    className = '',
}: {
    className?: string;
}) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
    );
}

const readerSkeletonRows = [
    ['88%', '64%'],
    ['96%', '78%'],
    ['82%', '55%'],
    ['92%', '70%'],
    ['76%', '48%'],
] as const;

export function ReaderTextSkeleton({
    comparison = false,
}: {
    comparison?: boolean;
}) {
    const column = (suffix = '') => (
        <div className="space-y-5" aria-hidden="true">
            <div className="ml-[1.75rem] h-2 w-40 rounded-full bg-current opacity-[0.09]" />
            {readerSkeletonRows.map((widths, index) => (
                <div
                    key={`${suffix}-${index}`}
                    className="grid grid-cols-[1.25rem_minmax(0,1fr)_2rem] items-start gap-x-2"
                >
                    <span className="mt-1.5 h-2 w-2 justify-self-end rounded-full bg-current opacity-[0.1]" />
                    <span className="space-y-2.5">
                        {widths.map((width) => (
                            <span
                                key={width}
                                className="block h-[0.72rem] rounded-full bg-current opacity-[0.085]"
                                style={{ width }}
                            />
                        ))}
                    </span>
                    <span className="mt-0.5 size-6 rounded-full bg-current opacity-[0.055]" />
                </div>
            ))}
        </div>
    );

    return (
        <div
            role="status"
            aria-label={
                comparison
                    ? 'Preparing the comparison text'
                    : 'Preparing the scripture text'
            }
            className="motion-safe:animate-pulse"
        >
            <span className="sr-only">
                {comparison
                    ? 'Preparing the comparison text…'
                    : 'Preparing the scripture text…'}
            </span>
            {comparison ? (
                <div className="grid gap-10 md:ml-[4.5rem] md:grid-cols-2 md:gap-8">
                    {column('primary')}
                    <div className="hidden md:block">{column('secondary')}</div>
                </div>
            ) : (
                <div className="relative">
                    <span
                        aria-hidden="true"
                        className="absolute top-5 left-0 h-14 w-10 rounded-xl bg-[var(--reader-accent)] opacity-[0.14]"
                    />
                    <div className="ml-[4.5rem]">{column('reader')}</div>
                </div>
            )}
        </div>
    );
}

export function notePreview(markdown: string): string {
    return markdown
        .replace(/[#>*_`[\]()!-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function NoteMarker({
    notes,
    onClick,
    variant = 'verse',
    className = '',
}: {
    notes: ScriptureNote[];
    onClick: () => void;
    variant?: 'verse' | 'section';
    className?: string;
}) {
    const isSection = variant === 'section';

    return (
        <span
            className={`group/note relative flex justify-end pt-0.5 font-sans ${className}`}
        >
            <button
                type="button"
                onClick={onClick}
                aria-label={
                    notes.length
                        ? `Open ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`
                        : 'Add note'
                }
                className={`relative inline-grid size-8 cursor-pointer place-items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--reader-accent)] ${notes.length ? (isSection ? 'text-black opacity-100' : 'text-[var(--reader-accent)] opacity-100') : 'text-stone-400 opacity-0 group-focus-within/verse:opacity-100 group-hover/verse:opacity-100 hover:text-[var(--reader-accent)] focus:opacity-100'}`}
            >
                <NotebookPen
                    className={`size-4 ${notes.length ? (isSection ? 'fill-stone-500/35' : 'fill-current/15') : ''}`}
                />
                {notes.length > 1 && (
                    <span
                        className={`absolute -top-1 -right-1 grid size-4 place-items-center rounded-full text-[0.62rem] font-bold text-white tabular-nums ${isSection ? 'bg-stone-950' : 'bg-[var(--reader-accent)]'}`}
                    >
                        {notes.length}
                    </span>
                )}
            </button>
            {notes.length > 0 && (
                <span
                    role="tooltip"
                    className="pointer-events-none absolute top-8 right-0 z-40 hidden w-72 rounded-xl border border-stone-200 bg-[#fffdf9] p-4 text-left text-stone-800 shadow-xl group-focus-within/note:block group-hover/note:block"
                >
                    {notes.slice(0, 3).map((note) => (
                        <span
                            key={note.id}
                            className="block border-b border-dotted border-stone-300 py-2 last:border-0"
                        >
                            <span className="block text-xs font-semibold">
                                {note.title}
                            </span>
                            <span className="mt-1 line-clamp-3 block font-serif text-sm leading-5 text-stone-600">
                                {notePreview(note.bodyMarkdown)}
                            </span>
                        </span>
                    ))}
                </span>
            )}
        </span>
    );
}

export function PreferenceSelect({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
}) {
    return (
        <div className="grid gap-1.5 text-xs tracking-wide text-stone-500 uppercase">
            <span>{label}</span>
            <CustomSelect
                label={label}
                value={value}
                onChange={onChange}
                options={options}
                triggerClassName="rounded-lg text-sm tracking-normal normal-case"
            />
        </div>
    );
}

export function TypographyChoice<Value extends string>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: Value;
    options: Array<{ value: Value; label: string }>;
    onChange: (value: Value) => void;
}) {
    return (
        <fieldset>
            <legend className="mb-2 text-xs font-semibold tracking-[0.16em] text-stone-500 uppercase">
                {label}
            </legend>
            <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-stone-100 p-1">
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={value === option.value}
                        onClick={() => onChange(option.value)}
                        className={`cursor-pointer rounded-lg px-2 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#a95624] ${value === option.value ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-600 hover:bg-white/60 hover:text-stone-950'}`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </fieldset>
    );
}
