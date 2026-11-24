<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BibleEdition;
use App\Models\ScriptureSearchVerse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

class WordStudyController extends Controller
{
    public function __invoke(string $strong): JsonResponse
    {
        $strong = strtoupper($strong);
        abort_unless(preg_match('/^[GH][0-9]{1,5}$/', $strong) === 1, 404);

        $lexicon = Cache::rememberForever('strongs-lexicon', function (): array {
            $path = resource_path('bible/strongs/lexicon.json');
            if (! is_file($path)) {
                throw new RuntimeException('The Strong’s lexicon has not been installed.');
            }

            $content = file_get_contents($path);
            if ($content === false) {
                throw new RuntimeException('The Strong’s lexicon could not be read.');
            }

            return json_decode($content, true, flags: JSON_THROW_ON_ERROR);
        });
        $entry = $lexicon[$strong] ?? null;
        abort_if($entry === null, 404);

        $editionId = BibleEdition::query()->where('slug', 'webp')->value('id');
        $occurrenceQuery = ScriptureSearchVerse::query()
            ->when($editionId, fn ($query) => $query->where('edition_id', $editionId))
            ->whereJsonContains('strong_numbers', $strong)
            ->orderBy('canon_position')
            ->orderByRaw('CAST(chapter AS INTEGER)')
            ->orderByRaw('CAST(verse AS INTEGER)');

        return response()->json([
            'strong' => $strong,
            'language' => str_starts_with($strong, 'H') ? 'Hebrew' : 'Greek',
            'lemma' => $entry['lemma'] ?? null,
            'transliteration' => $entry['translit'] ?? $entry['xlit'] ?? null,
            'pronunciation' => $entry['pron'] ?? null,
            'definition' => trim($entry['strongs_def'] ?? ''),
            'usage' => trim($entry['kjv_def'] ?? ''),
            'derivation' => trim($entry['derivation'] ?? ''),
            'occurrenceCount' => (clone $occurrenceQuery)->count(),
            'occurrences' => $occurrenceQuery->limit(8)->get()->map(fn (ScriptureSearchVerse $verse) => [
                'reference' => "{$verse->book_name} {$verse->chapter}:{$verse->verse}",
                'text' => $verse->text,
                'url' => route('reader.show', [
                    'book' => $verse->book_code,
                    'chapter' => $verse->chapter,
                    'translation' => 'webp',
                    'verses' => $verse->verse,
                ], absolute: false),
            ])->values(),
            'attribution' => 'Strong’s Dictionaries of Hebrew and Greek, Open Scriptures (CC BY-SA).',
        ]);
    }
}
