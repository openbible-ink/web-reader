<?php

namespace App\Http\Controllers;

use App\Models\BibleBook;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    public function __invoke(): Response
    {
        $books = BibleBook::query()
            ->select(['book_code', 'chapter_count', 'updated_at'])
            ->orderBy('canon_position')
            ->get()
            ->unique('book_code');

        $urls = collect([[
            'loc' => route('books.index'),
            'changefreq' => 'weekly',
            'priority' => '1.0',
            'lastmod' => $books->max('updated_at')?->toAtomString(),
        ]])->concat($books->flatMap(function (BibleBook $book): array {
            $lastModified = $book->updated_at?->toAtomString();
            $entries = [[
                'loc' => route('books.show', ['book' => $book->book_code]),
                'changefreq' => 'monthly',
                'priority' => '0.8',
                'lastmod' => $lastModified,
            ]];

            foreach (range(1, $book->chapter_count) as $chapter) {
                $entries[] = [
                    'loc' => route('reader.show', [
                        'book' => $book->book_code,
                        'chapter' => $chapter,
                    ]),
                    'changefreq' => 'yearly',
                    'priority' => '0.7',
                    'lastmod' => $lastModified,
                ];
            }

            return $entries;
        }));

        $body = view('sitemap', ['urls' => $urls])->render();

        return response($body, 200)->header('Content-Type', 'application/xml; charset=UTF-8');
    }
}
