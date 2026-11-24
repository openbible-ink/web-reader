<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class OriginalLanguageToolsController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $request->user()->update([
            'original_language_tools' => $validated['enabled'],
        ]);

        return back();
    }
}
