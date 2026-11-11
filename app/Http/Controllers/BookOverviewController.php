<?php

namespace App\Http\Controllers;

use App\Services\BibleEditionResolver;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BookOverviewController extends Controller
{
    public function __invoke(Request $request, string $book, BibleEditionResolver $resolver): Response
    {
        $book = $resolver->resolveBook($request, $book);
        $edition = $book->edition;

        return Inertia::render('book-overview', [
            'edition' => [
                'slug' => $edition->slug,
                'name' => $edition->name,
                'abbreviation' => $edition->abbreviation,
            ],
            'book' => [
                'code' => $book->book_code,
                'name' => $book->name,
                'longName' => $book->long_name,
                'chapterCount' => $book->chapter_count,
                'verseCounts' => $this->verseCounts($book->source_path, $book->chapter_count),
            ],
            'canonicalUrl' => route('books.show', ['book' => $book->book_code]),
        ]);
    }

    /** @return array<int, int> */
    private function verseCounts(string $sourcePath, int $chapterCount): array
    {
        $counts = array_fill(1, $chapterCount, 0);
        $source = @file_get_contents(public_path(ltrim($sourcePath, '/')));

        if ($source === false) {
            return $counts;
        }

        $chapter = null;
        foreach (preg_split('/\R/', $source) ?: [] as $line) {
            if (preg_match('/^\\\\c\s+(\d+)/', $line, $match) === 1) {
                $chapter = (int) $match[1];

                continue;
            }

            if ($chapter === null || preg_match('/^\\\\v\s+([^\s]+)/', $line, $match) !== 1) {
                continue;
            }

            preg_match_all('/\d+/', $match[1], $verseNumbers);
            foreach ($verseNumbers[0] as $verseNumber) {
                $counts[$chapter] = max($counts[$chapter] ?? 0, (int) $verseNumber);
            }
        }

        return $counts;
    }
}
