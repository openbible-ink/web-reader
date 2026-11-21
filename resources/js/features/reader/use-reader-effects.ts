import { useEffect, type RefObject } from 'react';
import { rangeForHighlightSegment } from './selection-ranges';
import type {
    HighlightColor,
    ScriptureHighlight,
    ScriptureNote,
} from './types';

export function useReaderParallax(
    artworkRef: RefObject<HTMLElement | null>,
    textRef: RefObject<HTMLElement | null>,
    artworkKey: unknown,
) {
    useEffect(() => {
        const artwork = artworkRef.current;
        const text = textRef.current;
        if (!artwork && !text) return;

        const reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        );
        let animationFrame: number | undefined;

        const update = () => {
            animationFrame = undefined;
            if (reducedMotion.matches) {
                if (artwork) artwork.style.transform = '';
                if (text) text.style.transform = '';
                return;
            }

            const banner = (artwork ?? text)?.parentElement;
            if (!banner) return;
            const distance = Math.min(
                Math.max(0, -banner.getBoundingClientRect().top),
                banner.offsetHeight * 1.25,
            );
            if (artwork) {
                artwork.style.transform = `translate3d(0, ${distance * 0.52}px, 0)`;
            }
            if (text) {
                text.style.transform = `translate3d(0, ${distance * 0.24}px, 0)`;
            }
        };

        const scheduleUpdate = () => {
            if (animationFrame !== undefined) return;
            animationFrame = window.requestAnimationFrame(update);
        };

        scheduleUpdate();
        window.addEventListener('scroll', scheduleUpdate, { passive: true });
        window.addEventListener('resize', scheduleUpdate);
        reducedMotion.addEventListener('change', scheduleUpdate);

        return () => {
            window.removeEventListener('scroll', scheduleUpdate);
            window.removeEventListener('resize', scheduleUpdate);
            reducedMotion.removeEventListener('change', scheduleUpdate);
            if (animationFrame !== undefined) {
                window.cancelAnimationFrame(animationFrame);
            }
        };
    }, [artworkKey, artworkRef, textRef]);
}

export function useReaderHighlights(
    articleRef: RefObject<HTMLElement | null>,
    contentKey: unknown,
    highlights: ScriptureHighlight[],
    notes: ScriptureNote[],
    colors: readonly HighlightColor[],
) {
    useEffect(() => {
        const registry = (
            CSS as unknown as {
                highlights?: {
                    set: (name: string, highlight: unknown) => void;
                    delete: (name: string) => void;
                };
            }
        ).highlights;
        const HighlightConstructor = (
            window as unknown as {
                Highlight?: new (...ranges: Range[]) => unknown;
            }
        ).Highlight;
        if (!registry || !HighlightConstructor) return;

        const noteSelectionName = 'open-bible-note-selection';
        const names = [
            ...colors.map((color) => `open-bible-${color}`),
            noteSelectionName,
        ];
        names.forEach((name) => registry.delete(name));

        const ranges = new Map<HighlightColor, Range[]>();
        colors.forEach((color) => ranges.set(color, []));
        highlights.forEach((highlight) => {
            highlight.segments.forEach((segment) => {
                const verseElement =
                    articleRef.current?.querySelector<HTMLElement>(
                        `[data-verse-number="${CSS.escape(segment.verse)}"]`,
                    );
                if (!verseElement) return;
                const range = rangeForHighlightSegment(verseElement, segment);
                if (range) ranges.get(highlight.color)?.push(range);
            });
        });

        ranges.forEach((colorRanges, color) => {
            if (colorRanges.length) {
                registry.set(
                    `open-bible-${color}`,
                    new HighlightConstructor(...colorRanges),
                );
            }
        });

        const noteRanges = notes.flatMap((note) => {
            if (note.anchorType !== 'selection') return [];
            return note.segments.flatMap((segment) => {
                const verseElement =
                    articleRef.current?.querySelector<HTMLElement>(
                        `[data-verse-number="${CSS.escape(segment.verse)}"]`,
                    );
                if (!verseElement) return [];
                const range = rangeForHighlightSegment(verseElement, segment);
                return range ? [range] : [];
            });
        });
        if (noteRanges.length) {
            registry.set(
                noteSelectionName,
                new HighlightConstructor(...noteRanges),
            );
        }

        return () => names.forEach((name) => registry.delete(name));
    }, [articleRef, colors, contentKey, highlights, notes]);
}
