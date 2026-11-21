<?php

namespace App\Http\Controllers;

use App\Services\BibleEditionResolver;
use App\Services\ScriptureChapterRepository;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BookOverviewController extends Controller
{
    public function __invoke(Request $request, string $book, BibleEditionResolver $resolver, ScriptureChapterRepository $chapters): Response
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
                'firstChapterUrl' => $chapters->url($book, 1),
                'chapterCount' => $book->chapter_count,
                'verseCounts' => $chapters->verseCounts($book),
            ],
            'canonicalUrl' => route('books.show', ['book' => $book->book_code]),
        ]);
    }
}
