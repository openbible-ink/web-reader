import { useEffect, useState } from 'react';
import { loadScriptureChapter } from '@/lib/scripture-chapter-cache';
import type { BibleDocument } from 'usfm-parser';
import type { OebVariantOptions } from 'usfm-parser/oeb';

export interface ReaderEditionIdentity {
    slug: string;
    name: string;
    abbreviation: string;
    language: string;
    variantProfile?: string | null;
}

export interface ReaderScriptureSource {
    chapterUrl: string;
    chapter: string;
    sourceUrl: string;
    bookCode: string;
    bookName: string;
    edition: ReaderEditionIdentity;
}

export const defaultReaderPreferences: OebVariantOptions = {
    spelling: 'cth',
    gender: 'neut',
    versification: 'nrsv',
    gehenna: 'gehenna',
    ioudaioi: 'ioudaioi',
};

const documentCache = new Map<string, BibleDocument>();
const maximumCachedDocuments = 48;

function rememberDocument(key: string, document: BibleDocument): BibleDocument {
    documentCache.delete(key);
    documentCache.set(key, document);
    const oldestKey = documentCache.keys().next().value;
    if (documentCache.size > maximumCachedDocuments && oldestKey) {
        documentCache.delete(oldestKey);
    }
    return document;
}

function preferencesMatchDefaults(preferences: OebVariantOptions): boolean {
    return (
        preferences.spelling === defaultReaderPreferences.spelling &&
        preferences.gender === defaultReaderPreferences.gender &&
        preferences.versification === defaultReaderPreferences.versification &&
        preferences.gehenna === defaultReaderPreferences.gehenna &&
        preferences.ioudaioi === defaultReaderPreferences.ioudaioi
    );
}

function afterReaderLayout(callback: () => void): () => void {
    let active = true;
    let frame: number;
    const wait = () => {
        if (!active) return;
        if (
            window.document.documentElement.dataset.bookReadingTransition !==
            undefined
        ) {
            frame = window.requestAnimationFrame(wait);
            return;
        }
        frame = window.requestAnimationFrame(() => {
            frame = window.requestAnimationFrame(() => {
                if (active) callback();
            });
        });
    };
    frame = window.requestAnimationFrame(wait);
    return () => {
        active = false;
        window.cancelAnimationFrame(frame);
    };
}

export function readerPreferencesKey(editionSlug: string): string {
    return `bible-reader:${editionSlug}:preferences`;
}

export function savedReaderPreferences(editionSlug: string): OebVariantOptions {
    if (typeof window === 'undefined') return defaultReaderPreferences;
    try {
        const saved = window.localStorage.getItem(
            readerPreferencesKey(editionSlug),
        );
        return saved
            ? { ...defaultReaderPreferences, ...JSON.parse(saved) }
            : defaultReaderPreferences;
    } catch {
        return defaultReaderPreferences;
    }
}

async function loadProjectedDocument(
    config: ReaderScriptureSource,
    preferences: OebVariantOptions,
): Promise<BibleDocument> {
    const [{ loadScriptureSource }, { parseOeb }] = await Promise.all([
        import('@/lib/scripture-source-cache'),
        import('usfm-parser/oeb'),
    ]);
    const source = await loadScriptureSource(config.sourceUrl);
    const fullDocument = parseOeb(source, { variants: preferences });
    const chapterStartIndex = fullDocument.children.findIndex(
        (node) =>
            node.type === 'chapterStart' && node.number === config.chapter,
    );
    const nextChapterIndex = fullDocument.children.findIndex(
        (node, index) =>
            index > chapterStartIndex && node.type === 'chapterStart',
    );
    let contentStart = chapterStartIndex;
    while (contentStart > 0) {
        const node = fullDocument.children[contentStart - 1];
        if (
            node?.type !== 'block' ||
            (!node.style.startsWith('s') && !node.style.startsWith('ms'))
        ) {
            break;
        }
        contentStart -= 1;
    }
    let contentEnd =
        nextChapterIndex === -1
            ? fullDocument.children.length
            : nextChapterIndex;
    while (contentEnd > chapterStartIndex + 1) {
        const node = fullDocument.children[contentEnd - 1];
        if (
            node?.type !== 'block' ||
            (!node.style.startsWith('s') && !node.style.startsWith('ms'))
        ) {
            break;
        }
        contentEnd -= 1;
    }
    const children =
        chapterStartIndex === -1
            ? []
            : fullDocument.children.slice(contentStart, contentEnd);
    return {
        ...fullDocument,
        id: `${fullDocument.id}.chapter.${config.chapter}`,
        children,
        indexes: undefined,
    };
}

export function useReaderScripture(
    config: ReaderScriptureSource | undefined,
    preferences?: OebVariantOptions,
): { document?: BibleDocument; loadError?: string } {
    const [document, setDocument] = useState<BibleDocument>();
    const [loadError, setLoadError] = useState<string>();

    useEffect(() => {
        if (!config) {
            setDocument(undefined);
            setLoadError(undefined);
            return;
        }

        let active = true;
        let cancelLayoutWait: () => void = () => undefined;
        const effectivePreferences =
            preferences ?? savedReaderPreferences(config.edition.slug);
        const needsOebProjection =
            config.edition.variantProfile === 'oeb' &&
            !preferencesMatchDefaults(effectivePreferences);
        const cacheKey = needsOebProjection
            ? JSON.stringify({
                  sourceUrl: config.sourceUrl,
                  chapter: config.chapter,
                  preferences: effectivePreferences,
              })
            : config.chapterUrl;
        const cached = documentCache.get(cacheKey);

        setLoadError(undefined);
        if (cached) {
            setDocument(rememberDocument(cacheKey, cached));
            return;
        }
        setDocument(undefined);

        const request = needsOebProjection
            ? loadProjectedDocument(config, effectivePreferences)
            : loadScriptureChapter(config.chapterUrl).then(
                  (payload) => payload.document,
              );
        void request
            .then((loadedDocument) => {
                if (!active) return;
                cancelLayoutWait = afterReaderLayout(() => {
                    if (active) {
                        setDocument(rememberDocument(cacheKey, loadedDocument));
                    }
                });
            })
            .catch((error: unknown) => {
                if (!active) return;
                setLoadError(
                    error instanceof Error
                        ? error.message.replace(
                              'Scripture chapter',
                              config.bookName,
                          )
                        : `Unable to load ${config.bookName}`,
                );
            });

        return () => {
            active = false;
            cancelLayoutWait();
        };
    }, [config, preferences]);

    return { document, loadError };
}
