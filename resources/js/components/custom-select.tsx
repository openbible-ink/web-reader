import { Check, ChevronDown } from 'lucide-react';
import {
    type KeyboardEvent,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';

export interface SelectOption<Value extends string = string> {
    value: Value;
    label: string;
    triggerLabel?: string;
}

interface CustomSelectProps<Value extends string = string> {
    value: Value;
    options: SelectOption<Value>[];
    onChange: (value: Value) => void;
    label: string;
    disabled?: boolean;
    name?: string;
    theme?: 'light' | 'sepia' | 'dark';
    variant?: 'card' | 'inline';
    layout?: 'list' | 'chapter-grid';
    className?: string;
    triggerClassName?: string;
    placeholder?: string;
}

export default function CustomSelect<Value extends string = string>({
    value,
    options,
    onChange,
    label,
    disabled = false,
    name,
    theme = 'light',
    variant = 'card',
    layout = 'list',
    className = '',
    triggerClassName = '',
    placeholder = 'Select an option',
}: CustomSelectProps<Value>) {
    const id = useId();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(() =>
        Math.max(
            0,
            options.findIndex((option) => option.value === value),
        ),
    );
    const [position, setPosition] = useState({
        left: 0,
        top: 0,
        width: 220,
    });
    const selected = options.find((option) => option.value === value);

    const palette = {
        light: {
            trigger:
                'border-stone-300 bg-[#fffdf9] text-stone-900 hover:border-[#c59570]',
            menu: 'border-stone-200 bg-[#fffdf9] text-stone-900',
            option: 'hover:bg-[#f5eadc] focus:bg-[#f5eadc]',
            active: 'bg-[#f5eadc]',
            muted: 'text-stone-500',
            inlineTrigger:
                'border-stone-300/75 bg-transparent text-stone-900 hover:border-[#c59570]',
            gridOption: 'bg-[#f5eadc] hover:bg-[#e5ceb1] focus:bg-[#e5ceb1]',
            gridActive: 'bg-[#dfc29e]',
            gridSelected: '!bg-[#b85c26] !text-white',
        },
        sepia: {
            trigger:
                'border-[#d1bea0] bg-[#fbf2e2] text-[#332b22] hover:border-[#b78d61]',
            menu: 'border-[#d1bea0] bg-[#fbf2e2] text-[#332b22]',
            option: 'hover:bg-[#ead9bd] focus:bg-[#ead9bd]',
            active: 'bg-[#ead9bd]',
            muted: 'text-[#7b6b58]',
            inlineTrigger:
                'border-[#d1bea0]/80 bg-transparent text-[#332b22] hover:border-[#b78d61]',
            gridOption: 'bg-[#ead9bd] hover:bg-[#d8bd94] focus:bg-[#d8bd94]',
            gridActive: 'bg-[#cfad7d]',
            gridSelected: '!bg-[#b85c26] !text-white',
        },
        dark: {
            trigger:
                'border-stone-600 bg-[#292621] text-[#f3ede3] hover:border-[#b58a68]',
            menu: 'border-stone-700 bg-[#292621] text-[#f3ede3]',
            option: 'hover:bg-white/10 focus:bg-white/10',
            active: 'bg-white/10',
            muted: 'text-stone-400',
            inlineTrigger:
                'border-stone-600/80 bg-transparent text-[#f3ede3] hover:border-[#b58a68]',
            gridOption: 'bg-white/10 hover:bg-white/20 focus:bg-white/20',
            gridActive: 'bg-white/25',
            gridSelected: '!bg-[#f29a5a] !text-[#201d19]',
        },
    }[theme];

    const updatePosition = () => {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (!rect) return;
        const width = Math.max(
            rect.width,
            layout === 'chapter-grid' ? 300 : 220,
        );
        setPosition({
            left: Math.min(
                Math.max(12, rect.left),
                window.innerWidth - width - 12,
            ),
            top: rect.bottom + 8,
            width,
        });
    };

    useLayoutEffect(() => {
        if (!open) return;
        updatePosition();
        const selectedIndex = options.findIndex(
            (option) => option.value === value,
        );
        setActiveIndex(Math.max(0, selectedIndex));
    }, [open, value]);

    useEffect(() => {
        if (!open) return;
        const dismiss = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (
                !buttonRef.current?.contains(target) &&
                !menuRef.current?.contains(target)
            )
                setOpen(false);
        };
        const reposition = () => updatePosition();
        window.document.addEventListener('pointerdown', dismiss);
        window.addEventListener('resize', reposition);
        window.addEventListener('scroll', reposition, true);
        window.requestAnimationFrame(() => menuRef.current?.focus());
        return () => {
            window.document.removeEventListener('pointerdown', dismiss);
            window.removeEventListener('resize', reposition);
            window.removeEventListener('scroll', reposition, true);
        };
    }, [open]);

    const choose = (option: SelectOption<Value>) => {
        onChange(option.value);
        setOpen(false);
        window.requestAnimationFrame(() => buttonRef.current?.focus());
    };

    const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape' || event.key === 'Tab') {
            setOpen(false);
            if (event.key === 'Escape') buttonRef.current?.focus();
            return;
        }
        if (
            event.key === 'ArrowDown' ||
            event.key === 'ArrowUp' ||
            (layout === 'chapter-grid' &&
                (event.key === 'ArrowLeft' || event.key === 'ArrowRight'))
        ) {
            event.preventDefault();
            const step =
                event.key === 'ArrowDown'
                    ? layout === 'chapter-grid'
                        ? 6
                        : 1
                    : event.key === 'ArrowUp'
                      ? layout === 'chapter-grid'
                          ? -6
                          : -1
                      : event.key === 'ArrowRight'
                        ? 1
                        : -1;
            setActiveIndex(
                (index) => (index + step + options.length) % options.length,
            );
        }
        if (event.key === 'Home') {
            event.preventDefault();
            setActiveIndex(0);
        }
        if (event.key === 'End') {
            event.preventDefault();
            setActiveIndex(options.length - 1);
        }
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const option = options[activeIndex];
            if (option) choose(option);
        }
    };

    return (
        <div className={`relative ${className}`}>
            <button
                ref={buttonRef}
                id={`${id}-button`}
                type="button"
                disabled={disabled}
                aria-label={label}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={`${id}-listbox`}
                onClick={() => setOpen((current) => !current)}
                onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                        event.preventDefault();
                        setOpen(true);
                    }
                }}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-[#a95624]/35 disabled:cursor-not-allowed disabled:opacity-45 ${variant === 'inline' ? `rounded-full border py-2 ps-4 pe-3 ${palette.inlineTrigger}` : `rounded-xl border px-3 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] ${palette.trigger}`} ${triggerClassName}`}
            >
                <span className="min-w-0 truncate">
                    {selected?.triggerLabel ?? selected?.label ?? placeholder}
                </span>
                <ChevronDown
                    className={`size-4 shrink-0 transition-transform ${palette.muted} ${open ? 'rotate-180' : ''}`}
                />
            </button>
            <select
                name={name}
                value={value}
                onChange={(event) => onChange(event.target.value as Value)}
                tabIndex={-1}
                aria-hidden="true"
                className="sr-only"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {open &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={menuRef}
                        id={`${id}-listbox`}
                        role="listbox"
                        aria-label={label}
                        aria-activedescendant={`${id}-option-${activeIndex}`}
                        tabIndex={-1}
                        onKeyDown={handleMenuKeyDown}
                        className={`fixed z-[120] max-h-72 overflow-y-auto rounded-2xl border shadow-[0_18px_55px_rgba(45,35,25,0.2)] backdrop-blur-xl outline-none ${layout === 'chapter-grid' ? 'grid grid-cols-6 gap-2 p-3' : 'p-1.5'} ${palette.menu}`}
                        style={{
                            left: position.left,
                            top: position.top,
                            width: position.width,
                        }}
                    >
                        {options.map((option, index) => {
                            const isSelected = option.value === value;
                            const isActive = index === activeIndex;
                            return (
                                <button
                                    id={`${id}-option-${index}`}
                                    key={option.value}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onPointerEnter={() => setActiveIndex(index)}
                                    onClick={() => choose(option)}
                                    className={`${layout === 'chapter-grid' ? `grid aspect-square w-full place-items-center rounded-lg text-sm font-semibold ${palette.gridOption} ${isSelected ? palette.gridSelected : isActive ? palette.gridActive : ''}` : `flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${palette.option} ${isActive ? palette.active : ''}`} cursor-pointer transition outline-none`}
                                >
                                    <span>{option.label}</span>
                                    {layout === 'list' && (
                                        <Check
                                            className={`size-4 shrink-0 text-[#b45f2d] ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>,
                    document.body,
                )}
        </div>
    );
}
