<?php

namespace App\Http\Controllers;

use App\Models\BibleBook;
use App\Models\Bookmark;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class BookmarkController extends Controller
{
    public function index(Request $request): Response
    {
        $bookmarks = $request->user()->bookmarks()
            ->with('book.edition')
            ->latest()
            ->get()
            ->map(fn (Bookmark $bookmark) => $this->serialize($bookmark));

        return Inertia::render('bookmarks', ['bookmarks' => $bookmarks]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $this->ensureUnique($request, $data);

        $request->user()->bookmarks()->create($data);

        return back();
    }

    public function update(Request $request, Bookmark $bookmark): RedirectResponse
    {
        $this->authorizeOwner($request, $bookmark);
        $data = $this->validated($request);
        $this->ensureUnique($request, $data, $bookmark);

        $bookmark->update($data);

        return back();
    }

    public function destroy(Request $request, Bookmark $bookmark): RedirectResponse
    {
        $this->authorizeOwner($request, $bookmark);
        $bookmark->delete();

        return back();
    }

    /** @return array{bible_book_id: string, book_code: string, chapter: string, verse_start: ?string, verse_end: ?string, title: ?string} */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'bible_book_id' => ['required', 'uuid', 'exists:bible_books,id'],
            'chapter' => ['required', 'string', 'max:16'],
            'verse_start' => ['nullable', 'string', 'max:16'],
            'verse_end' => ['nullable', 'string', 'max:16'],
            'title' => ['nullable', 'string', 'max:120'],
        ]);

        $data['verse_start'] = $data['verse_start'] ?: null;
        $data['verse_end'] = $data['verse_start'] ? ($data['verse_end'] ?: $data['verse_start']) : null;
        $data['title'] = filled($data['title'] ?? null) ? trim($data['title']) : null;
        $bookCode = BibleBook::query()->whereKey($data['bible_book_id'])->value('book_code');
        abort_unless(is_string($bookCode), 404);
        $data['book_code'] = $bookCode;

        return $data;
    }

    /** @param array{bible_book_id: string, book_code: string, chapter: string, verse_start: ?string, verse_end: ?string, title: ?string} $data */
    private function ensureUnique(Request $request, array $data, ?Bookmark $except = null): void
    {
        $query = $request->user()->bookmarks()
            ->where(fn ($query) => $query
                ->where('book_code', $data['book_code'])
                ->orWhere(fn ($legacy) => $legacy
                    ->whereNull('book_code')
                    ->where('bible_book_id', $data['bible_book_id'])))
            ->where('chapter', $data['chapter'])
            ->where('verse_start', $data['verse_start'])
            ->where('verse_end', $data['verse_end']);

        if ($except) {
            $query->whereKeyNot($except->getKey());
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'verse_start' => 'That passage is already bookmarked.',
            ]);
        }
    }

    private function authorizeOwner(Request $request, Bookmark $bookmark): void
    {
        abort_unless($bookmark->user_id === $request->user()->id, 404);
    }

    /** @return array<string, mixed> */
    private function serialize(Bookmark $bookmark): array
    {
        /** @var BibleBook $book */
        $book = $bookmark->book;

        return [
            'id' => $bookmark->id,
            'title' => $bookmark->title,
            'chapter' => $bookmark->chapter,
            'verseStart' => $bookmark->verse_start,
            'verseEnd' => $bookmark->verse_end,
            'reference' => $this->reference($book->name, $bookmark),
            'book' => ['id' => $book->id, 'code' => $book->book_code, 'name' => $book->name],
            'edition' => [
                'slug' => $book->edition->slug,
                'name' => $book->edition->name,
                'abbreviation' => $book->edition->abbreviation,
            ],
            'readerUrl' => route('reader.show', [
                'book' => $book->book_code,
                'chapter' => $bookmark->chapter,
                'bookmark' => $bookmark->id,
            ], absolute: false),
            'createdAt' => $bookmark->created_at?->toISOString(),
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
