import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

export default function NoteContent({ markdown }: { markdown: string }) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                link: {
                    autolink: true,
                    defaultProtocol: 'https',
                    openOnClick: true,
                },
            }),
            Markdown,
        ],
        content: markdown,
        contentType: 'markdown',
        editable: false,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                'aria-label': 'Note content',
                class: 'tiptap outline-none',
            },
        },
    });

    useEffect(() => {
        if (!editor) return;
        editor.commands.setContent(markdown, {
            contentType: 'markdown',
            emitUpdate: false,
        });
    }, [editor, markdown]);

    return <EditorContent editor={editor} className="note-article-prose" />;
}
