<?php

namespace App\Services;

use App\Models\BibleBook;
use App\Models\BibleEdition;
use Illuminate\Support\Facades\File;
use RuntimeException;

class OebLibrary
{
    /** @var array<int, string> */
    public const CANON = [
        1 => 'Genesis', 2 => 'Exodus', 3 => 'Leviticus', 4 => 'Numbers', 5 => 'Deuteronomy',
        6 => 'Joshua', 7 => 'Judges', 8 => 'Ruth', 9 => '1 Samuel', 10 => '2 Samuel',
        11 => '1 Kings', 12 => '2 Kings', 13 => '1 Chronicles', 14 => '2 Chronicles', 15 => 'Ezra',
        16 => 'Nehemiah', 17 => 'Esther', 18 => 'Job', 19 => 'Psalms', 20 => 'Proverbs',
        21 => 'Ecclesiastes', 22 => 'Song of Songs', 23 => 'Isaiah', 24 => 'Jeremiah', 25 => 'Lamentations',
        26 => 'Ezekiel', 27 => 'Daniel', 28 => 'Hosea', 29 => 'Joel', 30 => 'Amos',
        31 => 'Obadiah', 32 => 'Jonah', 33 => 'Micah', 34 => 'Nahum', 35 => 'Habakkuk',
        36 => 'Zephaniah', 37 => 'Haggai', 38 => 'Zechariah', 39 => 'Malachi', 40 => 'Matthew',
        41 => 'Mark', 42 => 'Luke', 43 => 'John', 44 => 'Acts', 45 => 'Romans',
        46 => '1 Corinthians', 47 => '2 Corinthians', 48 => 'Galatians', 49 => 'Ephesians', 50 => 'Philippians',
        51 => 'Colossians', 52 => '1 Thessalonians', 53 => '2 Thessalonians', 54 => '1 Timothy', 55 => '2 Timothy',
        56 => 'Titus', 57 => 'Philemon', 58 => 'Hebrews', 59 => 'James', 60 => '1 Peter',
        61 => '2 Peter', 62 => '1 John', 63 => '2 John', 64 => '3 John', 65 => 'Jude', 66 => 'Revelation',
    ];

    public function edition(): BibleEdition
    {
        return BibleEdition::query()->updateOrCreate(
            ['slug' => 'oeb'],
            [
                'name' => 'Open English Bible',
                'abbreviation' => 'OEB',
                'language' => 'en',
                'licence' => 'CC0',
                'attribution' => 'Open English Bible',
                'source_format' => 'usfm',
                'variant_profile' => 'oeb',
            ],
        );
    }

    /** @return array{imported: int, missing: array<int, string>, incomplete: array<int, string>} */
    public function import(string $sourceDirectory): array
    {
        if (! File::isDirectory($sourceDirectory)) {
            throw new RuntimeException("OEB source directory does not exist: {$sourceDirectory}");
        }

        $destination = public_path('bibles/oeb');
        File::ensureDirectoryExists($destination);
        $importedPositions = [];
        $suppliedPositions = [];
        $incomplete = [];
        $edition = $this->edition();

        foreach (File::glob(rtrim($sourceDirectory, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'*.usfm.db') as $sourcePath) {
            $filename = basename($sourcePath);
            if (! preg_match('/^(\d{2})-(.+)\.usfm\.db$/', $filename, $filenameMatches)) {
                continue;
            }

            $position = (int) $filenameMatches[1];
            if (! isset(self::CANON[$position])) {
                continue;
            }

            $suppliedPositions[] = $position;

            $source = File::get($sourcePath);
            try {
                $metadata = $this->metadata($source, $position);
            } catch (RuntimeException) {
                $incomplete[$position] = self::CANON[$position];

                continue;
            }
            $destinationPath = $destination.DIRECTORY_SEPARATOR.$filename;
            if (realpath($sourcePath) !== realpath($destinationPath)) {
                File::copy($sourcePath, $destinationPath);
            }

            $attributes = [
                'name' => $metadata['name'],
                'source_path' => '/bibles/oeb/'.$filename,
                'chapter_count' => $metadata['chapterCount'],
                'canon_position' => $position,
            ];
            if ($metadata['longName'] !== null) {
                $attributes['long_name'] = $metadata['longName'];
            }

            BibleBook::query()->updateOrCreate(
                ['edition_id' => $edition->id, 'book_code' => $metadata['code']],
                $attributes,
            );
            $importedPositions[] = $position;
        }

        $missing = array_diff_key(self::CANON, array_flip($suppliedPositions));

        return ['imported' => count($importedPositions), 'missing' => $missing, 'incomplete' => $incomplete];
    }

    /** @return array{code: string, name: string, longName: string|null, chapterCount: int} */
    private function metadata(string $source, int $position): array
    {
        preg_match('/^\\\\id\s+([^\s]+)/m', $source, $id);
        preg_match('/^\\\\toc1\s+(.+)$/m', $source, $longName);
        preg_match_all('/^\\\\c\s+([0-9]+)/m', $source, $chapters);

        $code = strtoupper(trim($id[1] ?? ''));
        $chapterCount = empty($chapters[1]) ? 0 : max(array_map('intval', $chapters[1]));
        $firstChapter = empty($chapters[1]) ? 0 : (int) $chapters[1][0];
        if ($code === '' || $firstChapter !== 1 || $chapterCount < 1) {
            throw new RuntimeException('Unable to read book metadata for '.self::CANON[$position]);
        }

        return [
            'code' => $code,
            'name' => self::CANON[$position],
            'longName' => isset($longName[1]) ? trim($longName[1]) : null,
            'chapterCount' => $chapterCount,
        ];
    }
}
