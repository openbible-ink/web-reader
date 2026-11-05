<?php

namespace App\Http\Controllers;

use App\Models\BibleEdition;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class DefaultTranslationController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'translation' => ['required', 'string', 'max:50', 'exists:bible_editions,slug'],
        ]);

        $edition = BibleEdition::query()->where('slug', $validated['translation'])->firstOrFail();
        $request->user()->update(['preferred_edition_id' => $edition->id]);
        $request->session()->put('reader_edition_slug', $edition->slug);

        return back();
    }
}
