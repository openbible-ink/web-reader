<?php

namespace App\Http\Controllers;

use App\Models\ScriptureArtworkPassage;
use Inertia\Inertia;
use Inertia\Response;

class ReaderController extends Controller
{
    public function __invoke(): Response
    {
        $placements = ScriptureArtworkPassage::query()
            ->with('artwork')
            ->where('book_code', 'JHN')
            ->where('role', 'hero')
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('reader', [
            'artworks' => $placements->map(fn (ScriptureArtworkPassage $placement) => [
                'id' => $placement->artwork->id,
                'imageUrl' => asset($placement->artwork->image_path),
                'title' => $placement->artwork->title,
                'altText' => $placement->artwork->alt_text,
                'caption' => $placement->artwork->caption,
                'approach' => $placement->artwork->approach,
                'attribution' => $placement->artwork->attribution,
                'license' => $placement->artwork->license,
                'focalPoint' => [
                    'x' => $placement->artwork->focal_point_x,
                    'y' => $placement->artwork->focal_point_y,
                ],
                'reference' => [
                    'book' => $placement->book_code,
                    'chapter' => $placement->chapter,
                    'verseStart' => $placement->verse_start,
                    'verseEnd' => $placement->verse_end,
                ],
                'role' => $placement->role,
            ])->values(),
        ]);
    }
}
