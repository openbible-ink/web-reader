<?php

namespace App\Console\Commands;

use App\Models\BibleBook;
use App\Models\ScriptureSearchVerse;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Process;
use RuntimeException;

class IndexScriptureSearch extends Command
{
    protected $signature = 'bible:index-search {--edition= : Rebuild only one edition slug}';

    protected $description = 'Build the verse-level scripture search index from imported USFM files';

    public function handle(): int
    {
        $books = BibleBook::query()
            ->with('edition')
            ->when($this->option('edition'), fn ($query, $slug) => $query->whereHas('edition', fn ($edition) => $edition->where('slug', $slug)))
            ->orderBy('canon_position')
            ->get();

        if ($books->isEmpty()) {
            $this->warn('No imported scripture books were found.');

            return self::SUCCESS;
        }

        $manifest = ['books' => $books->map(fn (BibleBook $book) => [
            'id' => $book->id,
            'path' => public_path(ltrim($book->source_path, '/')),
            'bookCode' => $book->book_code,
            'editionSlug' => $book->edition->slug,
            'editionName' => $book->edition->name,
            'variantProfile' => $book->edition->variant_profile,
        ])->values()];

        $process = Process::path(base_path())
            ->timeout(300)
            ->input(json_encode($manifest, JSON_THROW_ON_ERROR))
            ->run(['node', 'scripts/build-scripture-search-index.mjs']);

        if ($process->failed()) {
            throw new RuntimeException(trim($process->errorOutput()) ?: 'Unable to build scripture search data.');
        }

        $parsed = json_decode($process->output(), true, flags: JSON_THROW_ON_ERROR);
        $booksById = $books->keyBy('id');
        $count = 0;

        DB::transaction(function () use ($parsed, $booksById, &$count): void {
            ScriptureSearchVerse::query()->whereIn('bible_book_id', $booksById->keys())->delete();
            foreach ($parsed as $entry) {
                $book = $booksById->get($entry['id']);
                if (! $book) {
                    continue;
                }
                foreach (array_chunk($entry['verses'], 500) as $chunk) {
                    $now = now();
                    ScriptureSearchVerse::query()->insert(array_map(fn (array $verse) => [
                        'edition_id' => $book->edition_id,
                        'bible_book_id' => $book->id,
                        'book_code' => $book->book_code,
                        'book_name' => $book->name,
                        'canon_position' => $book->canon_position,
                        'chapter' => $verse['chapter'],
                        'verse' => $verse['verse'],
                        'section_title' => isset($verse['sectionTitle'])
                            ? mb_substr($verse['sectionTitle'], 0, 255)
                            : null,
                        'text' => $verse['text'],
                        'created_at' => $now,
                        'updated_at' => $now,
                    ], $chunk));
                    $count += count($chunk);
                }
            }
        });

        $this->info("Indexed {$count} verses from {$books->count()} books.");

        return self::SUCCESS;
    }
}
