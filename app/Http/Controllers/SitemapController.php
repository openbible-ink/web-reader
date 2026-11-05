<?php

namespace App\Http\Controllers;

use App\Models\BibleBook;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    public function __invoke(): Response
    {
        $books = BibleBook::query()
            ->select(['book_code', 'chapter_count'])
            ->orderBy('canon_position')
            ->get()
            ->unique('book_code');

        $urls = $books->flatMap(function (BibleBook $book): array {
            $entries = [route('books.show', ['book' => $book->book_code])];

            foreach (range(1, $book->chapter_count) as $chapter) {
                $entries[] = route('reader.show', [
                    'book' => $book->book_code,
                    'chapter' => $chapter,
                ]);
            }

            return $entries;
        });

        $body = view('sitemap', ['urls' => $urls])->render();

        return response($body, 200)->header('Content-Type', 'application/xml');
    }
}
