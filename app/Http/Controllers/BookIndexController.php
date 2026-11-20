<?php

namespace App\Http\Controllers;

use App\Models\BibleEdition;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class BookIndexController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = Auth::user();
        $preferredEditionSlug = $user instanceof User
            ? BibleEdition::query()->whereKey($user->preferred_edition_id)->value('slug')
            : null;
        $requestedSlug = $request->session()->get('reader_edition_slug')
            ?? $preferredEditionSlug
            ?? 'oeb';

        $edition = BibleEdition::query()
            ->where('slug', $requestedSlug)
            ->whereHas('books')
            ->first()
            ?? BibleEdition::query()->where('slug', 'oeb')->firstOrFail();

        return Inertia::render('books', [
            'books' => $edition->books()
                ->orderBy('canon_position')
                ->get()
                ->map(fn ($book) => [
                    'code' => $book->book_code,
                    'name' => $book->name,
                    'longName' => $book->long_name,
                    'testament' => $book->canon_position !== null && $book->canon_position <= 39
                        ? 'old'
                        : 'new',
                ])
                ->values(),
        ]);
    }
}
