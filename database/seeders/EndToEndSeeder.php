<?php

namespace Database\Seeders;

use App\Models\BibleBook;
use App\Models\BibleEdition;
use App\Services\OebLibrary;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class EndToEndSeeder extends Seeder
{
    public function run(): void
    {
        User::factory()->create([
            'username' => 'accessibility_reader',
            'email' => 'accessibility@example.test',
            'password' => 'password',
            'email_verified_at' => now(),
        ]);

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

        $webSourcePath = public_path('bibles/webp/43-JHN.usfm');
        if (File::exists($webSourcePath)) {
            $web = BibleEdition::query()->create([
                'slug' => 'webp',
                'name' => 'World English Bible, Protestant Edition',
                'abbreviation' => 'WEB',
                'language' => 'en',
                'licence' => 'Public Domain',
                'source_format' => 'usfm',
            ]);
            $webSource = File::get($webSourcePath);
            preg_match_all('/^\\\\c\s+([0-9]+)/m', $webSource, $webChapters);

            $web->books()->create([
                'book_code' => 'JHN',
                'name' => 'John',
                'long_name' => 'The Good News According to John',
                'source_path' => '/bibles/webp/43-JHN.usfm',
                'chapter_count' => max(array_map('intval', $webChapters[1])),
                'canon_position' => 43,
            ]);
        }
    }
}
