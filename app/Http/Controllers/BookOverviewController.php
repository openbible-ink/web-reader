<?php

namespace App\Http\Controllers;

use App\Models\BibleBook;
use App\Models\BibleEdition;
use Inertia\Inertia;
use Inertia\Response;

class BookOverviewController extends Controller
{
    public function __invoke(BibleEdition $edition, BibleBook $book): Response
    {
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
            ],
        ]);
    }
}
