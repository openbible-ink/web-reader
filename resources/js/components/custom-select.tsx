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
    className?: string;
    triggerClassName?: string;
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
    className = '',
    triggerClassName = '',
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
    const selected =
        options.find((option) => option.value === value) ?? options[0];

    const palette = {
        light: {
            trigger:
                'border-stone-300 bg-[#fffdf9] text-stone-900 hover:border-[#c59570]',
            menu: 'border-stone-200 bg-[#fffdf9] text-stone-900',
            option: 'hover:bg-[#f5eadc] focus:bg-[#f5eadc]',
            active: 'bg-[#f5eadc]',
            muted: 'text-stone-500',
        },
        sepia: {
            trigger:
                'border-[#d1bea0] bg-[#fbf2e2] text-[#332b22] hover:border-[#b78d61]',
            menu: 'border-[#d1bea0] bg-[#fbf2e2] text-[#332b22]',
            option: 'hover:bg-[#ead9bd] focus:bg-[#ead9bd]',
            active: 'bg-[#ead9bd]',
            muted: 'text-[#7b6b58]',
        },
        dark: {
            trigger:
                'border-stone-600 bg-[#292621] text-[#f3ede3] hover:border-[#b58a68]',
            menu: 'border-stone-700 bg-[#292621] text-[#f3ede3]',
            option: 'hover:bg-white/10 focus:bg-white/10',
            active: 'bg-white/10',
            muted: 'text-stone-400',
        },
    }[theme];

    const updatePosition = () => {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (!rect) return;
        const width = Math.max(rect.width, 220);
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
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;
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
                className={`flex w-full cursor-pointer items-center justify-between gap-3 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-[#a95624]/35 disabled:cursor-not-allowed disabled:opacity-45 ${variant === 'inline' ? 'rounded-lg border border-transparent bg-transparent px-2 py-2' : `rounded-xl border px-3 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] ${palette.trigger}`} ${triggerClassName}`}
            >
                <span className="min-w-0 truncate">{selected?.label}</span>
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
                        className={`fixed z-[120] max-h-72 overflow-y-auto rounded-2xl border p-1.5 shadow-[0_18px_55px_rgba(45,35,25,0.2)] backdrop-blur-xl outline-none ${palette.menu}`}
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
                                    className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition outline-none ${palette.option} ${isActive ? palette.active : ''}`}
                                >
                                    <span>{option.label}</span>
                                    <Check
                                        className={`size-4 shrink-0 text-[#b45f2d] ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                                    />
                                </button>
                            );
                        })}
                    </div>,
                    document.body,
                )}
        </div>
    );
}
