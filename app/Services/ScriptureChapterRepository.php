<?php

namespace App\Services;

use App\Models\BibleBook;
use Illuminate\Support\Facades\File;

class ScriptureChapterRepository
{
    public const SCHEMA_VERSION = '1.0.0';

    public function path(BibleBook $book, string|int $chapter): string
    {
        return storage_path(sprintf(
            'app/private/scripture/v1/%s/%s/%s.json.gz',
            $book->edition->slug,
            $book->book_code,
            $chapter,
        ));
    }

    public function url(BibleBook $book, string|int $chapter): string
    {
        $path = $this->path($book, $chapter);
        $version = is_file($path) ? substr((string) sha1_file($path), 0, 12) : 'missing';

        return route('api.scripture.chapter', [
            'edition' => $book->edition->slug,
            'book' => $book->book_code,
            'chapter' => $chapter,
            'v' => $version,
        ]);
    }

    /** @return array<int, int> */
    public function verseCounts(BibleBook $book): array
    {
        $counts = array_fill(1, $book->chapter_count, 0);
        $manifestPath = storage_path(sprintf(
            'app/private/scripture/v1/%s/manifest.json',
            $book->edition->slug,
        ));
        if (! File::isFile($manifestPath)) {
            return $counts;
        }

        $manifest = json_decode(File::get($manifestPath), true);
        $chapters = $manifest['books'][$book->book_code]['chapters'] ?? [];
        if (! is_array($chapters)) {
            return $counts;
        }
        foreach ($chapters as $chapter => $metadata) {
            if (is_array($metadata)) {
                $counts[(int) $chapter] = (int) ($metadata['verseCount'] ?? 0);
            }
        }

        return $counts;
    }
}
