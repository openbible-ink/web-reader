import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
    Bold,
    Heading2,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    Quote,
    Redo2,
    Undo2,
} from 'lucide-react';
import { useEffect, useRef } from 'react';

interface NoteEditorProps {
    value: string;
    onChange: (markdown: string) => void;
    disabled?: boolean;
    expanded?: boolean;
}

export default function NoteEditor({
    value,
    onChange,
    disabled = false,
    expanded = false,
}: NoteEditorProps) {
    const lastEditorValue = useRef(value);
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
            | string
            | undefined;
        const url = window.prompt('Link URL', existingUrl ?? 'https://');
        if (url === null) return;

        if (!url.trim()) {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: url.trim() })
            .run();
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
            label: 'Quote',
            icon: Quote,
            run: () => editor?.chain().focus().toggleBlockquote().run(),
        },
        {
            label: 'Heading',
            icon: Heading2,
            run: () =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run(),
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
        </div>
    );
}
