import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
    Bold,
    BookOpenText,
    Heading2,
    Heading3,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    Quote,
    Redo2,
    Undo2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FlowNode } from 'usfm-parser';
import CustomSelect from '@/components/custom-select';
import { loadScriptureChapter } from '@/lib/scripture-chapter-cache';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';

export interface ScriptureLinkBook {
    code: string;
    name: string;
    chapterCount: number;
    editionSlug: string;
}

interface NoteEditorProps {
    value: string;
    onChange: (markdown: string) => void;
    disabled?: boolean;
    expanded?: boolean;
    scriptureBooks?: ScriptureLinkBook[];
}

export default function NoteEditor({
    value,
    onChange,
    disabled = false,
    expanded = false,
    scriptureBooks = [],
}: NoteEditorProps) {
    const lastEditorValue = useRef(value);
    const savedSelection = useRef<{ from: number; to: number } | undefined>(
        undefined,
    );
    const [scriptureLinkOpen, setScriptureLinkOpen] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('https://');
    const [editingLink, setEditingLink] = useState(false);
    const [linkBookCode, setLinkBookCode] = useState('');
    const [linkChapter, setLinkChapter] = useState('');
    const [linkVerseStart, setLinkVerseStart] = useState('');
    const [linkVerseEnd, setLinkVerseEnd] = useState('');
    const [linkVerses, setLinkVerses] = useState<string[]>([]);
    const [loadingVerses, setLoadingVerses] = useState(false);
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                link: {
                    autolink: true,
                    defaultProtocol: 'https',
                    openOnClick: false,
                },
            }),
            Markdown,
            Placeholder.configure({
                placeholder: 'Write your note… Markdown shortcuts work here.',
            }),
        ],
        content: value,
        contentType: 'markdown',
        editable: !disabled,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                'aria-label': 'Note body',
                class: 'tiptap min-h-64 px-5 py-4 font-serif text-[1.05rem] leading-7 outline-none',
            },
        },
        onUpdate: ({ editor: currentEditor }) => {
            const markdown = currentEditor.getMarkdown();
            lastEditorValue.current = markdown;
            onChange(markdown);
        },
    });

    useEffect(() => {
        if (!editor || value === lastEditorValue.current) return;

        editor.commands.setContent(value, {
            contentType: 'markdown',
            emitUpdate: false,
        });
        lastEditorValue.current = value;
    }, [editor, value]);

    useEffect(() => {
        editor?.setEditable(!disabled);
    }, [disabled, editor]);

    const addLink = () => {
        if (!editor) return;

        const existingUrl = editor.getAttributes('link').href as
            string | undefined;
        const editingExistingLink = editor.isActive('link');
        if (editor.state.selection.empty && !editingExistingLink) {
            toast.error('Select the words you want to turn into a link.');
            return;
        }

        savedSelection.current = {
            from: editor.state.selection.from,
            to: editor.state.selection.to,
        };
        setEditingLink(editingExistingLink);
        setLinkUrl(existingUrl ?? 'https://');
        setLinkOpen(true);
    };

    const applyLink = () => {
        if (!editor || !savedSelection.current || !linkUrl.trim()) return;

        editor
            .chain()
            .focus()
            .setTextSelection(savedSelection.current)
            .extendMarkRange('link')
            .setLink({ href: linkUrl.trim() })
            .run();
        setLinkOpen(false);
    };

    const removeLink = () => {
        if (!editor || !savedSelection.current) return;

        editor
            .chain()
            .focus()
            .setTextSelection(savedSelection.current)
            .extendMarkRange('link')
            .unsetLink()
            .run();
        setLinkOpen(false);
    };

    const scriptureLinkBooks = useMemo(
        () =>
            Array.from(
                new Map(
                    scriptureBooks.map((book) => [book.code, book]),
                ).values(),
            ),
        [scriptureBooks],
    );
    const linkBook = scriptureLinkBooks.find(
        (book) => book.code === linkBookCode,
    );
    const linkBookEditionSlug = linkBook?.editionSlug;

    useEffect(() => {
        if (
            !scriptureLinkOpen ||
            !linkBookCode ||
            !linkBookEditionSlug ||
            !linkChapter
        ) {
            setLinkVerses([]);
            return;
        }

        let active = true;
        setLoadingVerses(true);
        setLinkVerses([]);
        loadScriptureChapter(
            `/api/v1/editions/${linkBookEditionSlug}/books/${linkBookCode}/chapters/${linkChapter}`,
        )
            .then(({ document }) => {
                if (!active) return;
                const verses: string[] = [];
                const visit = (node: FlowNode) => {
                    if (
                        node.type === 'verseStart' &&
                        !verses.includes(node.number)
                    ) {
                        verses.push(node.number);
                    }
                    if ('children' in node && Array.isArray(node.children)) {
                        node.children.forEach((child) =>
                            visit(child as FlowNode),
                        );
                    }
                };
                document.children.forEach(visit);
                setLinkVerses(verses);
                setLinkVerseStart(verses[0] ?? '');
                setLinkVerseEnd('');
            })
            .catch(() => toast.error('Unable to load the chapter’s verses.'))
            .finally(() => {
                if (active) setLoadingVerses(false);
            });

        return () => {
            active = false;
        };
    }, [linkBookCode, linkBookEditionSlug, linkChapter, scriptureLinkOpen]);

    useEffect(() => {
        if (!scriptureLinkOpen && !linkOpen) return;
        const close = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            setScriptureLinkOpen(false);
            setLinkOpen(false);
        };
        window.addEventListener('keydown', close);
        return () => window.removeEventListener('keydown', close);
    }, [linkOpen, scriptureLinkOpen]);

    const openScriptureLink = () => {
        if (!editor || editor.state.selection.empty) {
            toast.error(
                'Select the words you want to turn into a scripture link.',
            );
            return;
        }
        savedSelection.current = {
            from: editor.state.selection.from,
            to: editor.state.selection.to,
        };
        const firstBook = scriptureLinkBooks[0];
        setLinkBookCode(firstBook?.code ?? '');
        setLinkChapter('');
        setLinkVerseStart('');
        setLinkVerseEnd('');
        setScriptureLinkOpen(true);
    };

    const applyScriptureLink = () => {
        if (
            !editor ||
            !savedSelection.current ||
            !linkBook ||
            !linkChapter ||
            !linkVerseStart
        )
            return;

        const end = linkVerseEnd || linkVerseStart;
        const verses =
            end === linkVerseStart
                ? linkVerseStart
                : `${linkVerseStart}-${end}`;
        editor
            .chain()
            .focus()
            .setTextSelection(savedSelection.current)
            .setLink({
                href: `/read/${linkBook.code}/${linkChapter}?verses=${verses}`,
            })
            .run();
        setScriptureLinkOpen(false);
    };

    const buttonClass =
        'grid size-9 cursor-pointer place-items-center rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-950 focus-visible:outline-2 focus-visible:outline-[#a45a2a] disabled:cursor-not-allowed disabled:opacity-50';

    const formattingControls = [
        {
            label: 'Bold',
            icon: Bold,
            run: () => editor?.chain().focus().toggleBold().run(),
        },
        {
            label: 'Italic',
            icon: Italic,
            run: () => editor?.chain().focus().toggleItalic().run(),
        },
        {
            label: 'Add link',
            icon: LinkIcon,
            run: addLink,
        },
        {
            label: 'Link to scripture',
            icon: BookOpenText,
            run: openScriptureLink,
        },
        {
            label: 'Quote',
            icon: Quote,
            run: () => editor?.chain().focus().toggleBlockquote().run(),
        },
        {
            label: 'Heading 2',
            icon: Heading2,
            run: () =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
            label: 'Heading 3',
            icon: Heading3,
            run: () =>
                editor?.chain().focus().toggleHeading({ level: 3 }).run(),
        },
        {
            label: 'Bullet list',
            icon: List,
            run: () => editor?.chain().focus().toggleBulletList().run(),
        },
        {
            label: 'Numbered list',
            icon: ListOrdered,
            run: () => editor?.chain().focus().toggleOrderedList().run(),
        },
    ];

    const historyControls = [
        {
            label: 'Undo',
            icon: Undo2,
            run: () => editor?.chain().focus().undo().run(),
        },
        {
            label: 'Redo',
            icon: Redo2,
            run: () => editor?.chain().focus().redo().run(),
        },
    ];

    return (
        <div
            className={`overflow-hidden rounded-2xl border border-stone-300 bg-white/65 focus-within:border-[#a45a2a] focus-within:ring-2 focus-within:ring-[#a45a2a]/15 ${expanded ? 'shadow-[0_24px_70px_rgba(70,50,30,0.08)]' : ''}`}
        >
            <div
                className="flex flex-wrap gap-1 border-b border-stone-200 bg-stone-50/80 p-2"
                role="toolbar"
                aria-label="Note formatting"
            >
                {formattingControls.map(({ label, icon: Icon, run }) => (
                    <button
                        key={label}
                        type="button"
                        disabled={disabled || !editor}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={run}
                        aria-label={label}
                        title={label}
                        className={buttonClass}
                    >
                        <Icon className="size-4" />
                    </button>
                ))}
                <div className="ms-auto flex items-center gap-1 border-s border-stone-300 ps-2">
                    {historyControls.map(({ label, icon: Icon, run }) => (
                        <button
                            key={label}
                            type="button"
                            disabled={disabled || !editor}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={run}
                            aria-label={label}
                            title={label}
                            className={buttonClass}
                        >
                            <Icon className="size-4" />
                        </button>
                    ))}
                </div>
            </div>
            <EditorContent
                editor={editor}
                className={`note-rich-editor ${expanded ? '[&_.tiptap]:min-h-[calc(100vh-23rem)]' : ''}`}
            />
            {linkOpen &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[80] grid place-items-center bg-stone-950/25 p-4 backdrop-blur-[2px]"
                        role="presentation"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget)
                                setLinkOpen(false);
                        }}
                    >
                        <form
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="note-link-title"
                            className="w-full max-w-md rounded-3xl border border-stone-200 bg-[#fffdf9] p-6 shadow-[0_28px_80px_rgba(55,40,25,0.24)]"
                            onSubmit={(event) => {
                                event.preventDefault();
                                applyLink();
                            }}
                        >
                            <h2
                                id="note-link-title"
                                className="font-display text-2xl font-bold text-stone-950"
                            >
                                {editingLink ? 'Edit link' : 'Add link'}
                            </h2>
                            <p className="mt-1 text-sm text-stone-600">
                                Enter the web address the selected text should
                                open.
                            </p>
                            <label className="mt-5 block">
                                <span className="mb-2 block text-xs font-semibold tracking-[0.16em] text-stone-600 uppercase">
                                    Web address
                                </span>
                                <input
                                    autoFocus
                                    type="text"
                                    inputMode="url"
                                    value={linkUrl}
                                    onChange={(event) =>
                                        setLinkUrl(event.target.value)
                                    }
                                    className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-950 outline-none transition focus:border-[#a45a2a] focus:ring-2 focus:ring-[#a45a2a]/15"
                                    placeholder="https://example.com"
                                    aria-label="Link web address"
                                />
                            </label>
                            <div className="mt-6 flex items-center justify-end gap-3 border-t border-stone-200 pt-5">
                                {editingLink && (
                                    <button
                                        type="button"
                                        onClick={removeLink}
                                        className="me-auto cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold text-[#9b3f29] hover:bg-[#f5e6df]"
                                    >
                                        Remove link
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setLinkOpen(false)}
                                    className="cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!linkUrl.trim()}
                                    className="cursor-pointer rounded-full bg-[#28704b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#205d3e] disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    {editingLink ? 'Update link' : 'Add link'}
                                </button>
                            </div>
                        </form>
                    </div>,
                    document.body,
                )}
            {scriptureLinkOpen &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[80] grid place-items-center bg-stone-950/25 p-4 backdrop-blur-[2px]"
                        role="presentation"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget)
                                setScriptureLinkOpen(false);
                        }}
                    >
                        <section
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="scripture-link-title"
                            className="w-full max-w-lg rounded-3xl border border-stone-200 bg-[#fffdf9] p-6 shadow-[0_28px_80px_rgba(55,40,25,0.24)]"
                        >
                            <div className="mb-5">
                                <h2
                                    id="scripture-link-title"
                                    className="font-display text-2xl font-bold text-stone-950"
                                >
                                    Link to scripture
                                </h2>
                                <p className="mt-1 text-sm text-stone-600">
                                    Choose the passage the selected text should
                                    open.
                                </p>
                            </div>
                            <div className="grid gap-4">
                                <CustomSelect
                                    label="Book"
                                    value={linkBookCode}
                                    onChange={(code) => {
                                        setLinkBookCode(code);
                                        setLinkChapter('');
                                    }}
                                    options={scriptureLinkBooks.map((book) => ({
                                        value: book.code,
                                        label: book.name,
                                    }))}
                                    placeholder="Choose a book"
                                />
                                <CustomSelect
                                    label="Chapter"
                                    value={linkChapter}
                                    onChange={setLinkChapter}
                                    options={Array.from(
                                        { length: linkBook?.chapterCount ?? 0 },
                                        (_, index) => ({
                                            value: String(index + 1),
                                            label: String(index + 1),
                                            triggerLabel: `Chapter ${index + 1}`,
                                        }),
                                    )}
                                    layout="chapter-grid"
                                    gridColumns={10}
                                    gridMinWidth={420}
                                    disabled={!linkBook}
                                    placeholder="Choose a chapter"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <CustomSelect
                                        label="Start verse"
                                        value={linkVerseStart}
                                        onChange={(verse) => {
                                            setLinkVerseStart(verse);
                                            if (
                                                linkVerseEnd &&
                                                linkVerses.indexOf(
                                                    linkVerseEnd,
                                                ) < linkVerses.indexOf(verse)
                                            )
                                                setLinkVerseEnd('');
                                        }}
                                        options={linkVerses.map((verse) => ({
                                            value: verse,
                                            label: verse,
                                            triggerLabel: `Verse ${verse}`,
                                        }))}
                                        layout="chapter-grid"
                                        gridColumns={8}
                                        gridMinWidth={360}
                                        disabled={loadingVerses || !linkChapter}
                                        placeholder={
                                            loadingVerses
                                                ? 'Loading…'
                                                : 'Start verse'
                                        }
                                    />
                                    <CustomSelect
                                        label="End verse"
                                        value={linkVerseEnd}
                                        onChange={setLinkVerseEnd}
                                        options={linkVerses
                                            .slice(
                                                Math.max(
                                                    0,
                                                    linkVerses.indexOf(
                                                        linkVerseStart,
                                                    ),
                                                ),
                                            )
                                            .map((verse) => ({
                                                value: verse,
                                                label: verse,
                                                triggerLabel: `Verse ${verse}`,
                                            }))}
                                        layout="chapter-grid"
                                        gridColumns={8}
                                        gridMinWidth={360}
                                        disabled={
                                            loadingVerses || !linkVerseStart
                                        }
                                        placeholder="Same as start"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3 border-t border-stone-200 pt-5">
                                <button
                                    type="button"
                                    onClick={() => setScriptureLinkOpen(false)}
                                    className="cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={applyScriptureLink}
                                    disabled={!linkVerseStart}
                                    className="cursor-pointer rounded-full bg-[#28704b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#205d3e] disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    Add scripture link
                                </button>
                            </div>
                        </section>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
