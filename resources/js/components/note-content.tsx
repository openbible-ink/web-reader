import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { type MouseEvent, useEffect, useRef } from 'react';

export default function NoteContent({
    markdown,
    onScriptureLink,
}: {
    markdown: string;
    onScriptureLink?: (href: string) => void;
}) {
    const scriptureLinkHandler = useRef(onScriptureLink);
    useEffect(() => {
        scriptureLinkHandler.current = onScriptureLink;
    }, [onScriptureLink]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                link: {
                    autolink: true,
                    defaultProtocol: 'https',
                    openOnClick: false,
                    HTMLAttributes: {
                        target: null,
                        rel: null,
                    },
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

    const interceptScriptureLink = (event: MouseEvent<HTMLDivElement>) => {
        const target = event.target;
        const link = target instanceof Element ? target.closest('a') : null;
        const href = link?.getAttribute('href');
        if (!href || !scriptureLinkHandler.current) return;

        let url: URL;
        try {
            url = new URL(href, window.location.origin);
        } catch {
            return;
        }
        if (
            url.origin !== window.location.origin ||
            !/^\/read\/[A-Za-z0-9]{3}\/\d+$/.test(url.pathname)
        )
            return;

        event.preventDefault();
        event.stopPropagation();
        scriptureLinkHandler.current(`${url.pathname}${url.search}`);
    };

    return (
        <div onClickCapture={interceptScriptureLink}>
            <EditorContent editor={editor} className="note-article-prose" />
        </div>
    );
}
