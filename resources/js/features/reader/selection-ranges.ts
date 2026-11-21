import type { HighlightSegment, PendingHighlight } from './types';

export function textOffset(
    root: HTMLElement,
    boundaryNode: Node,
    boundaryOffset: number,
): number {
    const range = window.document.createRange();
    range.selectNodeContents(root);
    range.setEnd(boundaryNode, boundaryOffset);

    return range.toString().length;
}

export function captureHighlightSelection(
    article: HTMLElement,
): PendingHighlight | undefined {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        return undefined;
    }

    const range = selection.getRangeAt(0);
    if (!article.contains(range.commonAncestorContainer)) return undefined;

    const segments = Array.from(
        article.querySelectorAll<HTMLElement>('[data-verse-number]'),
    ).flatMap((verseElement) => {
        if (!range.intersectsNode(verseElement)) return [];

        const text = verseElement.textContent ?? '';
        const startsHere = verseElement.contains(range.startContainer);
        const endsHere = verseElement.contains(range.endContainer);
        const startOffset = startsHere
            ? textOffset(verseElement, range.startContainer, range.startOffset)
            : 0;
        const endOffset = endsHere
            ? textOffset(verseElement, range.endContainer, range.endOffset)
            : text.length;
        if (endOffset <= startOffset) return [];

        const exactText = text.slice(startOffset, endOffset);
        if (!exactText.trim()) return [];

        return [
            {
                verse: verseElement.dataset.verseNumber!,
                startOffset,
                endOffset,
                exactText,
                prefix: text.slice(Math.max(0, startOffset - 32), startOffset),
                suffix: text.slice(endOffset, endOffset + 32),
            },
        ];
    });

    if (!segments.length) return undefined;
    const rect = range.getBoundingClientRect();

    return {
        selectedText: selection.toString().trim(),
        segments,
        position: {
            top: rect.bottom + 10,
            left: rect.left + rect.width / 2,
        },
    };
}

function pointAtTextOffset(root: HTMLElement, requestedOffset: number) {
    const walker = window.document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let remaining = requestedOffset;
    let node = walker.nextNode();

    while (node) {
        const length = node.textContent?.length ?? 0;
        if (remaining <= length) return { node, offset: remaining };
        remaining -= length;
        node = walker.nextNode();
    }

    return { node: root, offset: root.childNodes.length };
}

export function rangeForHighlightSegment(
    verseElement: HTMLElement,
    segment: HighlightSegment,
): Range | undefined {
    const text = verseElement.textContent ?? '';
    let startOffset = segment.startOffset;
    let endOffset = segment.endOffset;

    if (text.slice(startOffset, endOffset) !== segment.exactText) {
        const matches: number[] = [];
        let match = text.indexOf(segment.exactText);
        while (match !== -1) {
            matches.push(match);
            match = text.indexOf(segment.exactText, match + 1);
        }
        const anchored = matches.find((index) => {
            const prefixMatches = segment.prefix
                ? text.slice(
                      Math.max(0, index - segment.prefix.length),
                      index,
                  ) === segment.prefix
                : true;
            const suffixMatches = segment.suffix
                ? text.slice(
                      index + segment.exactText.length,
                      index + segment.exactText.length + segment.suffix.length,
                  ) === segment.suffix
                : true;

            return prefixMatches && suffixMatches;
        });
        const fallback = anchored ?? matches.at(0);
        if (fallback === undefined) return undefined;
        startOffset = fallback;
        endOffset = fallback + segment.exactText.length;
    }

    const start = pointAtTextOffset(verseElement, startOffset);
    const end = pointAtTextOffset(verseElement, endOffset);
    const range = window.document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);

    return range;
}
