import type { BibleDocument, NoteNode } from 'usfm-parser';

export interface ScriptureArtwork {
    id: string;
    imageUrl: string;
    title?: string;
    altText: string;
    caption?: string;
    approach: 'historical' | 'symbolic' | 'narrative' | 'artistic';
    attribution?: string;
    license?: string;
    focalPoint?: { x?: number; y?: number };
    reference: {
        book: string;
        chapter?: string | null;
        sectionKey?: string | null;
        verseStart?: string | null;
        verseEnd?: string | null;
    };
    role: 'hero' | 'inline' | 'background' | 'gallery';
}

export interface ChapterBookmark {
    id: string;
    title?: string | null;
    verseStart?: string | null;
    verseEnd?: string | null;
}

export interface FocusedPassage {
    label: string;
    verseStart: string;
    verseEnd: string;
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'rose';

export interface HighlightSegment {
    verse: string;
    startOffset: number;
    endOffset: number;
    exactText: string;
    prefix?: string | null;
    suffix?: string | null;
}

export interface PendingHighlight {
    selectedText: string;
    segments: HighlightSegment[];
    position: { top: number; left: number };
}

export interface ScriptureHighlight {
    id: string;
    color: HighlightColor;
    selectedText: string;
    segments: HighlightSegment[];
}

export type NoteAnchorType = 'verse' | 'range' | 'section' | 'selection';

export interface ScriptureNote {
    id: string;
    title: string;
    bodyMarkdown: string;
    anchorType: NoteAnchorType;
    selectedText?: string | null;
    sectionKey?: string | null;
    sectionTitle?: string | null;
    verseStart?: string | null;
    verseEnd?: string | null;
    segments: HighlightSegment[];
    tags: Array<{ id: string; name: string; slug: string }>;
}

export interface NoteAnchor {
    type: NoteAnchorType;
    verseStart?: string;
    verseEnd?: string;
    sectionKey?: string;
    sectionTitle?: string;
    selectedText?: string;
    segments?: HighlightSegment[];
}

export interface SelectionNotePreview {
    note: ScriptureNote;
    position: { top: number; left: number };
}

export interface FootnotePreview {
    note: NoteNode;
    position: { top: number; left: number; placement: 'above' | 'below' };
}

export interface WordStudyEntry {
    strong: string;
    language: 'Hebrew' | 'Greek';
    lemma?: string | null;
    transliteration?: string | null;
    pronunciation?: string | null;
    definition?: string | null;
    usage?: string | null;
    derivation?: string | null;
    occurrenceCount: number;
    occurrences: Array<{
        reference: string;
        text: string;
        url: string;
    }>;
    attribution: string;
}

export interface WordStudyPreview {
    strong: string;
    surface: string;
    position: { top: number; left: number; placement: 'above' | 'below' };
    entry?: WordStudyEntry;
    loading: boolean;
    error?: string;
}

export interface TypographyPreferences {
    fontSize: 'small' | 'medium' | 'large';
    lineSpacing: 'compact' | 'comfortable' | 'relaxed';
    theme: 'light' | 'dark' | 'sepia';
}

export interface ReaderProps {
    canonicalUrl: string;
    backUrl?: string | null;
    edition: {
        slug: string;
        name: string;
        abbreviation: string;
        language: string;
        licence?: string | null;
        attribution?: string | null;
        sourceFormat: string;
        variantProfile?: string | null;
    };
    book: {
        id: string;
        code: string;
        name: string;
        longName?: string | null;
        sourceUrl: string;
        chapterUrl: string;
        initialDocument?: BibleDocument | null;
        chapterCount: number;
    };
    chapter: string;
    focusedSectionKey?: string | null;
    availableEditions: Array<{
        slug: string;
        name: string;
        abbreviation: string;
        language: string;
        licence?: string | null;
        attribution?: string | null;
        bookCode: string;
    }>;
    defaultEditionSlug: string;
    redLetterWords: boolean;
    originalLanguageTools: boolean;
    comparison?: {
        edition: {
            slug: string;
            name: string;
            abbreviation: string;
            language: string;
            sourceFormat: string;
            variantProfile?: string | null;
        };
        book: {
            code: string;
            sourceUrl: string;
            chapterUrl: string;
            initialDocument?: BibleDocument | null;
        };
    } | null;
    libraryBooks: Array<{
        code: string;
        name: string;
        chapterCount: number;
        testament: 'old' | 'new';
        readerUrl: string;
    }>;
    artworks?: ScriptureArtwork[];
    bookmarks?: ChapterBookmark[];
    focusedBookmark?: ChapterBookmark | null;
    focusedPassage?: FocusedPassage | null;
    highlights?: ScriptureHighlight[];
    highlightLabels: Record<HighlightColor, string>;
    notes?: ScriptureNote[];
    noteTags?: string[];
    focusedNoteId?: string | null;
    focusedNoteExpanded?: boolean;
}
