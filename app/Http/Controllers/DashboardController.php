<?php

namespace App\Http\Controllers;

use App\Models\BibleBook;
use App\Models\Bookmark;
use App\Models\Highlight;
use App\Models\Note;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $bookmarkQuery = $request->user()->bookmarks();
        $bookmarkCount = (clone $bookmarkQuery)->count();
        $bookmarks = $bookmarkQuery
            ->with('book.edition')
            ->latest()
            ->limit(4)
            ->get()
            ->map(fn (Bookmark $bookmark) => $this->serialize($bookmark));
        $highlightQuery = $request->user()->highlights();
        $highlightCount = (clone $highlightQuery)->count();
        $highlights = $highlightQuery
            ->with(['book.edition', 'segments'])
            ->latest()
            ->limit(4)
            ->get()
            ->map(fn (Highlight $highlight) => $this->serializeHighlight($highlight));
        $noteQuery = $request->user()->notes();
        $noteCount = (clone $noteQuery)->count();
        $notes = $noteQuery
            ->with(['book.edition', 'segments'])
            ->latest('updated_at')
            ->limit(4)
            ->get()
            ->map(fn (Note $note) => $this->serializeNote($note));

        return Inertia::render('dashboard', [
            'bookmarkCount' => $bookmarkCount,
            'bookmarks' => $bookmarks,
            'highlightCount' => $highlightCount,
            'highlights' => $highlights,
            'noteCount' => $noteCount,
            'notes' => $notes,
        ]);
    }

    /** @return array<string, mixed> */
    private function serialize(Bookmark $bookmark): array
    {
        /** @var BibleBook $book */
        $book = $bookmark->book;

        return [
            'id' => $bookmark->id,
            'title' => $bookmark->title,
            'reference' => $this->reference($book->name, $bookmark),
            'edition' => $book->edition->abbreviation,
            'readerUrl' => route('reader.show', [
                'edition' => $book->edition->slug,
                'book' => $book->book_code,
                'chapter' => $bookmark->chapter,
                'bookmark' => $bookmark->id,
            ], absolute: false),
            'createdAt' => $bookmark->created_at?->format('j M Y'),
        ];
    }

    private function reference(string $bookName, Bookmark $bookmark): string
    {
        if (! $bookmark->verse_start) {
            return "{$bookName} {$bookmark->chapter}";
        }

        $verses = $bookmark->verse_start === $bookmark->verse_end
            ? $bookmark->verse_start
            : "{$bookmark->verse_start}–{$bookmark->verse_end}";

        return "{$bookName} {$bookmark->chapter}:{$verses}";
    }

    /** @return array<string, mixed> */
    private function serializeHighlight(Highlight $highlight): array
    {
        /** @var BibleBook $book */
        $book = $highlight->book;
        $firstVerse = $highlight->segments->first()?->verse;
        $lastVerse = $highlight->segments->last()?->verse;
        $reference = "{$book->name} {$highlight->chapter}";

        if ($firstVerse) {
            $verses = $firstVerse === $lastVerse
                ? $firstVerse
                : "{$firstVerse}–{$lastVerse}";
            $reference .= ":{$verses}";
        }

        return [
            'id' => $highlight->id,
            'selectedText' => $highlight->selected_text,
            'color' => $highlight->color,
            'reference' => $reference,
            'edition' => $book->edition->abbreviation,
            'readerUrl' => route('reader.show', [
                'edition' => $book->edition->slug,
                'book' => $book->book_code,
                'chapter' => $highlight->chapter,
            ], absolute: false),
            'createdAt' => $highlight->created_at?->format('j M Y'),
        ];
    }

    /** @return array<string, mixed> */
    private function serializeNote(Note $note): array
    {
        /** @var BibleBook $book */
        $book = $note->book;
        $reference = "{$book->name} {$note->chapter}";
        if ($note->verse_start) {
            $verses = $note->verse_start === $note->verse_end || ! $note->verse_end
                ? $note->verse_start
                : "{$note->verse_start}–{$note->verse_end}";
            $reference .= ":{$verses}";
        }

        return [
            'id' => $note->id,
            'title' => $note->title,
            'bodyMarkdown' => $note->body_markdown,
            'reference' => $reference,
            'edition' => $book->edition->abbreviation,
            'readerUrl' => route('reader.show', [
                'edition' => $book->edition->slug,
                'book' => $book->book_code,
                'chapter' => $note->chapter,
                'note' => $note->id,
            ], absolute: false),
            'noteUrl' => route('notes.show', $note, absolute: false),
            'editUrl' => route('reader.show', [
                'edition' => $book->edition->slug,
                'book' => $book->book_code,
                'chapter' => $note->chapter,
                'note' => $note->id,
                'fullscreen' => 1,
            ], absolute: false),
            'updatedAt' => $note->updated_at?->format('j M Y'),
        ];
    }
}
