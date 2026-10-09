<?php

namespace App\Http\Controllers;

use App\Models\ScriptureArtwork;
use Inertia\Inertia;
use Inertia\Response;

class ReaderController extends Controller
{
    public function __invoke(): Response
    {
        $artwork = ScriptureArtwork::query()
            ->whereHas('passages', fn ($query) => $query
                ->where('book_code', 'JHN')
                ->where('role', 'hero'))
            ->with(['passages' => fn ($query) => $query
                ->where('book_code', 'JHN')
                ->where('role', 'hero')
                ->orderBy('sort_order')])
            ->first();

        return Inertia::render('reader', [
            'artwork' => $artwork ? [
                'id' => $artwork->id,
                'imageUrl' => asset($artwork->image_path),
                'title' => $artwork->title,
                'altText' => $artwork->alt_text,
                'caption' => $artwork->caption,
                'approach' => $artwork->approach,
                'attribution' => $artwork->attribution,
                'license' => $artwork->license,
                'focalPoint' => [
                    'x' => $artwork->focal_point_x,
                    'y' => $artwork->focal_point_y,
                ],
                'reference' => [
                    'book' => $artwork->passages->first()?->book_code,
                    'chapter' => $artwork->passages->first()?->chapter,
                    'verseStart' => $artwork->passages->first()?->verse_start,
                    'verseEnd' => $artwork->passages->first()?->verse_end,
                ],
                'role' => $artwork->passages->first()?->role,
            ] : null,
        ]);
    }
}
