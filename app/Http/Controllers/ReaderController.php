<?php

namespace App\Http\Controllers;

use App\Models\BibleBook;
use App\Models\BibleEdition;
use App\Models\Bookmark;
use App\Models\Highlight;
use App\Models\Note;
use App\Models\ScriptureArtworkPassage;
use App\Services\BibleEditionResolver;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReaderController extends Controller
{
    public function __invoke(Request $request, string $book, string $chapter, BibleEditionResolver $resolver): Response
    {
        $book = $resolver->resolveBook($request, $book);
        $edition = $book->edition;

        abort_unless(ctype_digit($chapter) && (int) $chapter >= 1 && (int) $chapter <= $book->chapter_count, 404);

        $focusedBookmark = null;
        if ($request->filled('bookmark')) {
            abort_unless($request->user() !== null, 404);
            $focusedBookmark = $request->user()->bookmarks()
                ->whereKey($request->string('bookmark')->toString())
                ->where(fn ($query) => $query
                    ->where('book_code', $book->book_code)
                    ->orWhere(fn ($legacy) => $legacy
                        ->whereNull('book_code')
                        ->where('bible_book_id', $book->id)))
                ->where('chapter', $chapter)
                ->firstOrFail();
        }

        $focusedNoteId = null;
        if ($request->filled('note')) {
            abort_unless($request->user() !== null, 404);
            $focusedNoteId = $request->user()->notes()
                ->whereKey($request->string('note')->toString())
                ->where(fn ($query) => $query
                    ->where('book_code', $book->book_code)
                    ->orWhere(fn ($legacy) => $legacy
                        ->whereNull('book_code')
                        ->where('bible_book_id', $book->id)))
                ->where(fn ($query) => $query
                    ->where('anchor_type', '!=', 'selection')
                    ->orWhere('bible_book_id', $book->id))
                ->where('chapter', $chapter)
                ->value('id');
            abort_unless($focusedNoteId, 404);
        }
        $focusedNoteExpanded = (bool) $focusedNoteId && $request->boolean('fullscreen');

        $placements = ScriptureArtworkPassage::query()
            ->with('artwork')
            ->where('book_code', $book->book_code)
            ->where('role', 'hero')
            ->where(fn ($query) => $query
                ->whereNull('edition_id')
                ->orWhere('edition_id', $edition->id))
            ->orderByRaw('case when edition_id = ? then 0 else 1 end', [$edition->id])
            ->orderByRaw('case when section_key is not null then 0 when verse_start is not null then 1 when chapter is not null then 2 else 3 end')
            ->orderBy('sort_order')
            ->get();

        $availableEditions = BibleEdition::query()
            ->whereHas('books', fn ($query) => $query->where('book_code', $book->book_code))
            ->with(['books' => fn ($query) => $query->where('book_code', $book->book_code)])
            ->orderBy('name')
            ->get()
            ->map(fn (BibleEdition $availableEdition) => [
                'slug' => $availableEdition->slug,
                'name' => $availableEdition->name,
                'abbreviation' => $availableEdition->abbreviation,
                'bookCode' => $availableEdition->books->firstOrFail()->book_code,
            ]);

        $libraryBooks = $edition->books()
            ->orderBy('canon_position')
            ->get()
            ->map(fn (BibleBook $libraryBook) => [
                'code' => $libraryBook->book_code,
                'name' => $libraryBook->name,
                'testament' => $libraryBook->canon_position !== null && $libraryBook->canon_position <= 39 ? 'old' : 'new',
                'readerUrl' => route('reader.show', [
                    'book' => $libraryBook->book_code,
                    'chapter' => '1',
                ], false),
            ])
            ->values();

        return Inertia::render('reader', [
            'edition' => [
                'slug' => $edition->slug,
                'name' => $edition->name,
                'abbreviation' => $edition->abbreviation,
                'language' => $edition->language,
                'licence' => $edition->licence,
                'attribution' => $edition->attribution,
                'sourceFormat' => $edition->source_format,
                'variantProfile' => $edition->variant_profile,
            ],
            'book' => [
                'id' => $book->id,
                'code' => $book->book_code,
                'name' => $book->name,
                'longName' => $book->long_name,
                'sourceUrl' => asset($book->source_path),
                'chapterCount' => $book->chapter_count,
            ],
            'chapter' => $chapter,
            'focusedSectionKey' => $request->filled('section')
                ? $request->string('section')->limit(255)->toString()
                : null,
            'focusedBookmark' => $focusedBookmark ? [
                'id' => $focusedBookmark->id,
                'title' => $focusedBookmark->title,
                'verseStart' => $focusedBookmark->verse_start,
                'verseEnd' => $focusedBookmark->verse_end,
            ] : null,
            'bookmarks' => $request->user()
                ? $request->user()->bookmarks()
                    ->where(fn ($query) => $query
                        ->where('book_code', $book->book_code)
                        ->orWhere(fn ($legacy) => $legacy
                            ->whereNull('book_code')
                            ->where('bible_book_id', $book->id)))
                    ->where('chapter', $chapter)
                    ->oldest()
                    ->get()
                    ->map(fn (Bookmark $bookmark) => [
                        'id' => $bookmark->id,
                        'title' => $bookmark->title,
                        'verseStart' => $bookmark->verse_start,
                        'verseEnd' => $bookmark->verse_end,
                    ])
                    ->values()
                : [],
            'highlights' => $request->user()
                ? $request->user()->highlights()
                    ->with('segments')
                    ->where(fn ($query) => $query
                        ->where('book_code', $book->book_code)
                        ->orWhere(fn ($legacy) => $legacy
                            ->whereNull('book_code')
                            ->where('bible_book_id', $book->id)))
                    ->where(fn ($query) => $query
                        ->where('anchor_type', '!=', 'selection')
                        ->orWhere('bible_book_id', $book->id))
                    ->where('chapter', $chapter)
                    ->oldest()
                    ->get()
                    ->map(fn (Highlight $highlight) => [
                        'id' => $highlight->id,
                        'color' => $highlight->color,
                        'selectedText' => $highlight->selected_text,
                        'segments' => $highlight->segments->map(fn ($segment) => [
                            'verse' => $segment->verse,
                            'startOffset' => $segment->start_offset,
                            'endOffset' => $segment->end_offset,
                            'exactText' => $segment->exact_text,
                            'prefix' => $segment->prefix,
                            'suffix' => $segment->suffix,
                        ])->values(),
                    ])
                    ->values()
                : [],
            'focusedNoteId' => $focusedNoteId,
            'focusedNoteExpanded' => $focusedNoteExpanded,
            'notes' => $request->user()
                ? $request->user()->notes()
                    ->with('segments')
                    ->where(fn ($query) => $query
                        ->where('book_code', $book->book_code)
                        ->orWhere(fn ($legacy) => $legacy
                            ->whereNull('book_code')
                            ->where('bible_book_id', $book->id)))
                    ->where(fn ($query) => $query
                        ->where('anchor_type', '!=', 'selection')
                        ->orWhere('bible_book_id', $book->id))
                    ->where('chapter', $chapter)
                    ->oldest()
                    ->get()
                    ->map(fn (Note $note) => [
                        'id' => $note->id,
                        'title' => $note->title,
                        'bodyMarkdown' => $note->body_markdown,
                        'anchorType' => $note->anchor_type,
                        'selectedText' => $note->selected_text,
                        'sectionKey' => $note->section_key,
                        'sectionTitle' => $note->section_title,
                        'verseStart' => $note->verse_start,
                        'verseEnd' => $note->verse_end,
                        'segments' => $note->segments->map(fn ($segment) => [
                            'verse' => $segment->verse,
                            'startOffset' => $segment->start_offset,
                            'endOffset' => $segment->end_offset,
                            'exactText' => $segment->exact_text,
                            'prefix' => $segment->prefix,
                            'suffix' => $segment->suffix,
                        ])->values(),
                    ])
                    ->values()
                : [],
            'availableEditions' => $availableEditions,
            'libraryBooks' => $libraryBooks,
            'artworks' => $placements->map(fn (ScriptureArtworkPassage $placement) => [
                'id' => $placement->artwork->id,
                'imageUrl' => asset($placement->artwork->image_path),
                'title' => $placement->artwork->title,
                'altText' => $placement->artwork->alt_text,
                'caption' => $placement->artwork->caption,
                'approach' => $placement->artwork->approach,
                'attribution' => $placement->artwork->attribution,
                'license' => $placement->artwork->license,
                'focalPoint' => [
                    'x' => $placement->artwork->focal_point_x,
                    'y' => $placement->artwork->focal_point_y,
                ],
                'reference' => [
                    'book' => $placement->book_code,
                    'chapter' => $placement->chapter,
                    'sectionKey' => $placement->section_key,
                    'verseStart' => $placement->verse_start,
                    'verseEnd' => $placement->verse_end,
                ],
                'role' => $placement->role,
            ])->values(),
        ]);
    }
}
