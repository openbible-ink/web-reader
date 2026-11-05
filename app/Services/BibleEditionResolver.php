<?php

namespace App\Services;

use App\Models\BibleBook;
use Illuminate\Http\Request;

class BibleEditionResolver
{
    public function resolveBook(Request $request, string $bookCode): BibleBook
    {
        $bookCode = strtoupper($bookCode);
        $requestedEdition = $request->string('translation')->toString();

        if ($requestedEdition !== '') {
            $book = $this->bookInEdition($bookCode, slug: $requestedEdition);
            abort_unless($book !== null, 404);

            $request->session()->put('reader_edition_slug', $book->edition->slug);

            return $book;
        }

        $readerEdition = $request->session()->get('reader_edition_slug');
        if (is_string($readerEdition) && $readerEdition !== '') {
            $readerBook = $this->bookInEdition($bookCode, slug: $readerEdition);
            if ($readerBook) {
                return $readerBook;
            }
        }

        $preferredEditionId = $request->user()?->preferred_edition_id;
        if ($preferredEditionId) {
            $preferredBook = $this->bookInEdition($bookCode, id: $preferredEditionId);
            if ($preferredBook) {
                return $preferredBook;
            }
        }

        return $this->bookInEdition($bookCode, slug: 'oeb')
            ?? BibleBook::query()->with('edition')->where('book_code', $bookCode)->firstOrFail();
    }

    private function bookInEdition(string $bookCode, ?string $id = null, ?string $slug = null): ?BibleBook
    {
        return BibleBook::query()
            ->with('edition')
            ->where('book_code', $bookCode)
            ->when($id, fn ($query) => $query->where('edition_id', $id))
            ->when($slug, fn ($query) => $query->whereHas('edition', fn ($edition) => $edition->where('slug', $slug)))
            ->first();
    }
}
