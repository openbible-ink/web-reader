<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BibleBook;
use App\Services\ScriptureChapterRepository;
use Illuminate\Http\Response;

class ScriptureChapterController extends Controller
{
    public function __invoke(
        string $edition,
        string $book,
        string $chapter,
        ScriptureChapterRepository $chapters,
    ): Response {
        abort_unless(ctype_digit($chapter) && (int) $chapter > 0, 404);
        $bibleBook = BibleBook::query()
            ->with('edition')
            ->where('book_code', strtoupper($book))
            ->whereHas('edition', fn ($query) => $query->where('slug', $edition))
            ->firstOrFail();
        abort_unless((int) $chapter <= $bibleBook->chapter_count, 404);

        $path = $chapters->path($bibleBook, $chapter);
        abort_unless(is_file($path), 404, 'This scripture chapter has not been compiled.');

        $contents = file_get_contents($path);
        abort_if($contents === false, 500, 'Unable to read scripture chapter.');

        return response($contents)
            ->header('Content-Type', 'application/json; charset=UTF-8')
            ->header('Content-Encoding', 'gzip')
            ->header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
            ->header('ETag', '"'.sha1($contents).'"');
    }
}
