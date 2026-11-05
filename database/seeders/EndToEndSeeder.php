<?php

namespace Database\Seeders;

use App\Models\BibleBook;
use App\Models\BibleEdition;
use App\Services\OebLibrary;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class EndToEndSeeder extends Seeder
{
    public function run(): void
    {
        $edition = BibleEdition::query()->create([
            'slug' => 'oeb',
            'name' => 'Open English Bible',
            'abbreviation' => 'OEB',
            'language' => 'en',
            'licence' => 'CC0',
            'attribution' => 'Open English Bible',
            'source_format' => 'usfm',
            'variant_profile' => 'oeb',
        ]);

        foreach (File::glob(public_path('bibles/oeb/*.usfm.db')) as $path) {
            $filename = basename($path);
            if (! preg_match('/^(\d{2})-.+\.usfm\.db$/', $filename, $fileMatch)) {
                continue;
            }

            $position = (int) $fileMatch[1];
            if (! isset(OebLibrary::CANON[$position])) {
                continue;
            }

            $source = File::get($path);
            preg_match('/^\\\\id\s+([^\s]+)/m', $source, $id);
            preg_match('/^\\\\toc1\s+(.+)$/m', $source, $longName);
            preg_match_all('/^\\\\c\s+([0-9]+)/m', $source, $chapters);
            if (! isset($id[1]) || $chapters[1] === []) {
                continue;
            }

            BibleBook::query()->create([
                'edition_id' => $edition->id,
                'book_code' => strtoupper(trim($id[1])),
                'name' => OebLibrary::CANON[$position],
                'long_name' => isset($longName[1]) ? trim($longName[1]) : null,
                'source_path' => '/bibles/oeb/'.$filename,
                'chapter_count' => max(array_map('intval', $chapters[1])),
                'canon_position' => $position,
            ]);
        }
    }
}
