import { X } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';

export default function NoteTagsInput({
    value,
    onChange,
    suggestions = [],
    disabled = false,
}: {
    value: string[];
    onChange: (tags: string[]) => void;
    suggestions?: string[];
    disabled?: boolean;
}) {
    const [draft, setDraft] = useState('');
    const add = (raw: string) => {
        const next = raw.trim().replace(/^#/, '');
        if (
            !next ||
            value.some((tag) => tag.toLowerCase() === next.toLowerCase()) ||
            value.length >= 12
        )
            return;
        onChange([...value, next]);
        setDraft('');
    };
    const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            add(draft);
        } else if (event.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
        }
    };

    return (
        <div>
            <span className="mb-1.5 block font-sans text-xs font-semibold tracking-wide text-stone-500 uppercase">
                Tags
            </span>
            <div className="flex min-h-[54px] flex-wrap items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2 focus-within:border-[#9a5428] focus-within:ring-2 focus-within:ring-[#9a5428]/15">
                {value.map((tag) => (
                    <span
                        key={tag.toLowerCase()}
                        className="inline-flex items-center gap-1 rounded-full bg-[#eee5d8] px-2.5 py-1 font-sans text-xs text-[#684c30]"
                    >
                        {tag}
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                                onChange(value.filter((item) => item !== tag))
                            }
                            className="cursor-pointer rounded-full p-0.5 hover:bg-black/5"
                            aria-label={`Remove ${tag} tag`}
                        >
                            <X className="size-3" />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={draft}
                    disabled={disabled || value.length >= 12}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={keyDown}
                    onBlur={() => add(draft)}
                    list="note-tag-suggestions"
                    placeholder={value.length ? 'Add another…' : 'Add tags…'}
                    className="min-w-28 flex-1 bg-transparent py-1 font-serif text-sm outline-none placeholder:text-stone-400"
                />
                <datalist id="note-tag-suggestions">
                    {suggestions
                        .filter((tag) => !value.includes(tag))
                        .map((tag) => (
                            <option key={tag} value={tag} />
                        ))}
                </datalist>
            </div>
            <p className="mt-1.5 font-sans text-xs text-stone-500">
                Press Enter or comma to add a tag.
            </p>
        </div>
    );
}
