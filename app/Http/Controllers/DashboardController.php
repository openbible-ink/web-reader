<?php

namespace App\Http\Controllers;

use App\Models\BibleBook;
use App\Models\Bookmark;
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

        return Inertia::render('dashboard', [
            'bookmarkCount' => $bookmarkCount,
            'bookmarks' => $bookmarks,
            'highlightCount' => $request->user()->highlights()->count(),
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
}
