<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class HighlightLabelController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'labels' => ['required', 'array:yellow,green,blue,rose'],
            'labels.yellow' => ['nullable', 'string', 'max:48'],
            'labels.green' => ['nullable', 'string', 'max:48'],
            'labels.blue' => ['nullable', 'string', 'max:48'],
            'labels.rose' => ['nullable', 'string', 'max:48'],
        ]);

        $request->user()->update([
            'highlight_colour_labels' => collect($data['labels'])
                ->map(fn (?string $label): string => trim($label ?? ''))
                ->all(),
        ]);

        return back();
    }
}
