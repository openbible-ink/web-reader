<?php

namespace App\Services;

use App\Models\BibleBook;
use App\Models\BibleEdition;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use RuntimeException;
use ZipArchive;

class WebpLibrary
{
    /** @var array<string, array{position: int, name: string}> */
    private const BOOKS = [
        'GEN' => ['position' => 1, 'name' => 'Genesis'], 'EXO' => ['position' => 2, 'name' => 'Exodus'],
        'LEV' => ['position' => 3, 'name' => 'Leviticus'], 'NUM' => ['position' => 4, 'name' => 'Numbers'],
        'DEU' => ['position' => 5, 'name' => 'Deuteronomy'], 'JOS' => ['position' => 6, 'name' => 'Joshua'],
        'JDG' => ['position' => 7, 'name' => 'Judges'], 'RUT' => ['position' => 8, 'name' => 'Ruth'],
        '1SA' => ['position' => 9, 'name' => '1 Samuel'], '2SA' => ['position' => 10, 'name' => '2 Samuel'],
        '1KI' => ['position' => 11, 'name' => '1 Kings'], '2KI' => ['position' => 12, 'name' => '2 Kings'],
        '1CH' => ['position' => 13, 'name' => '1 Chronicles'], '2CH' => ['position' => 14, 'name' => '2 Chronicles'],
        'EZR' => ['position' => 15, 'name' => 'Ezra'], 'NEH' => ['position' => 16, 'name' => 'Nehemiah'],
        'EST' => ['position' => 17, 'name' => 'Esther'], 'JOB' => ['position' => 18, 'name' => 'Job'],
        'PSA' => ['position' => 19, 'name' => 'Psalms'], 'PRO' => ['position' => 20, 'name' => 'Proverbs'],
        'ECC' => ['position' => 21, 'name' => 'Ecclesiastes'], 'SNG' => ['position' => 22, 'name' => 'Song of Songs'],
        'ISA' => ['position' => 23, 'name' => 'Isaiah'], 'JER' => ['position' => 24, 'name' => 'Jeremiah'],
        'LAM' => ['position' => 25, 'name' => 'Lamentations'], 'EZK' => ['position' => 26, 'name' => 'Ezekiel'],
        'DAN' => ['position' => 27, 'name' => 'Daniel'], 'HOS' => ['position' => 28, 'name' => 'Hosea'],
        'JOL' => ['position' => 29, 'name' => 'Joel'], 'AMO' => ['position' => 30, 'name' => 'Amos'],
        'OBA' => ['position' => 31, 'name' => 'Obadiah'], 'JON' => ['position' => 32, 'name' => 'Jonah'],
        'MIC' => ['position' => 33, 'name' => 'Micah'], 'NAM' => ['position' => 34, 'name' => 'Nahum'],
        'HAB' => ['position' => 35, 'name' => 'Habakkuk'], 'ZEP' => ['position' => 36, 'name' => 'Zephaniah'],
        'HAG' => ['position' => 37, 'name' => 'Haggai'], 'ZEC' => ['position' => 38, 'name' => 'Zechariah'],
        'MAL' => ['position' => 39, 'name' => 'Malachi'], 'MAT' => ['position' => 40, 'name' => 'Matthew'],
        'MRK' => ['position' => 41, 'name' => 'Mark'], 'LUK' => ['position' => 42, 'name' => 'Luke'],
        'JHN' => ['position' => 43, 'name' => 'John'], 'ACT' => ['position' => 44, 'name' => 'Acts'],
        'ROM' => ['position' => 45, 'name' => 'Romans'], '1CO' => ['position' => 46, 'name' => '1 Corinthians'],
        '2CO' => ['position' => 47, 'name' => '2 Corinthians'], 'GAL' => ['position' => 48, 'name' => 'Galatians'],
        'EPH' => ['position' => 49, 'name' => 'Ephesians'], 'PHP' => ['position' => 50, 'name' => 'Philippians'],
        'COL' => ['position' => 51, 'name' => 'Colossians'], '1TH' => ['position' => 52, 'name' => '1 Thessalonians'],
        '2TH' => ['position' => 53, 'name' => '2 Thessalonians'], '1TI' => ['position' => 54, 'name' => '1 Timothy'],
        '2TI' => ['position' => 55, 'name' => '2 Timothy'], 'TIT' => ['position' => 56, 'name' => 'Titus'],
        'PHM' => ['position' => 57, 'name' => 'Philemon'], 'HEB' => ['position' => 58, 'name' => 'Hebrews'],
        'JAS' => ['position' => 59, 'name' => 'James'], '1PE' => ['position' => 60, 'name' => '1 Peter'],
        '2PE' => ['position' => 61, 'name' => '2 Peter'], '1JN' => ['position' => 62, 'name' => '1 John'],
        '2JN' => ['position' => 63, 'name' => '2 John'], '3JN' => ['position' => 64, 'name' => '3 John'],
        'JUD' => ['position' => 65, 'name' => 'Jude'], 'REV' => ['position' => 66, 'name' => 'Revelation'],
    ];

    /** @return array{imported: int, ignored: list<string>} */
    public function import(string $source): array
    {
        $entries = $this->readSource($source);
        $books = [];
        $ignored = [];

        foreach ($entries as $filename => $contents) {
            if (! str_ends_with(strtolower($filename), '.usfm')) {
                $ignored[] = $filename;
                continue;
            }

            preg_match('/^\\\\id\s+([^\s]+)/m', $contents, $id);
            $sourceCode = strtoupper(trim($id[1] ?? ''));
            if (! isset(self::BOOKS[$sourceCode])) {
                $ignored[] = $filename;
                continue;
            }

            $metadata = $this->metadata($contents);
            if (isset($books[$metadata['code']])) {
                throw new RuntimeException("Duplicate WEB book code {$metadata['code']} in source archive.");
            }
            $books[$metadata['code']] = ['source' => $contents, ...$metadata];
        }

        $missing = array_diff(array_keys(self::BOOKS), array_keys($books));
        if ($missing !== []) {
            throw new RuntimeException('WEB archive is incomplete; missing: '.implode(', ', $missing));
        }

        uasort($books, fn (array $left, array $right): int => self::BOOKS[$left['code']]['position'] <=> self::BOOKS[$right['code']]['position']);
        $destination = public_path('bibles/webp');
        File::ensureDirectoryExists($destination);

        return DB::transaction(function () use ($books, $destination, $ignored): array {
            $edition = BibleEdition::query()->updateOrCreate(
                ['slug' => 'webp'],
                [
                    'name' => 'World English Bible',
                    'abbreviation' => 'WEB',
                    'language' => 'en-US',
                    'licence' => 'Public Domain',
                    'attribution' => 'World English Bible, Public Domain. “World English Bible” is a trademark of eBible.org.',
                    'source_format' => 'usfm',
                    'variant_profile' => null,
                ],
            );

            foreach ($books as $code => $book) {
                $canonical = self::BOOKS[$code];
                $filename = sprintf('%02d-%s.usfm', $canonical['position'], $code);
                File::put($destination.DIRECTORY_SEPARATOR.$filename, $book['source']);
                BibleBook::query()->updateOrCreate(
                    ['edition_id' => $edition->id, 'book_code' => $code],
                    [
                        'name' => $canonical['name'],
                        'long_name' => $book['longName'],
                        'source_path' => '/bibles/webp/'.$filename,
                        'chapter_count' => $book['chapterCount'],
                        'canon_position' => $canonical['position'],
                    ],
                );
            }

            return ['imported' => count($books), 'ignored' => $ignored];
        });
    }

    /** @return array<string, string> */
    private function readSource(string $source): array
    {
        if (File::isDirectory($source)) {
            $entries = [];
            foreach (File::files($source) as $file) {
                $entries[$file->getFilename()] = File::get($file->getPathname());
            }
            return $entries;
        }
        if (! File::isFile($source)) {
            throw new RuntimeException("WEB source does not exist: {$source}");
        }

        $archive = new ZipArchive;
        if ($archive->open($source) !== true) {
            throw new RuntimeException("Unable to open WEB ZIP archive: {$source}");
        }
        $entries = [];
        try {
            for ($index = 0; $index < $archive->numFiles; $index++) {
                $name = $archive->getNameIndex($index);
                if ($name === false || str_ends_with($name, '/')) continue;
                $contents = $archive->getFromIndex($index);
                if ($contents === false) throw new RuntimeException("Unable to read {$name} from WEB archive.");
                $entries[basename($name)] = $contents;
            }
        } finally {
            $archive->close();
        }
        return $entries;
    }

    /** @return array{code: string, longName: string|null, chapterCount: int} */
    private function metadata(string $source): array
    {
        preg_match('/^\\\\id\s+([^\s]+)/m', $source, $id);
        preg_match('/^\\\\toc1\s+(.+)$/m', $source, $longName);
        preg_match_all('/^\\\\c\s+([0-9]+)/m', $source, $chapters);
        $code = strtoupper(trim($id[1] ?? ''));
        $chapterNumbers = array_map('intval', $chapters[1] ?? []);
        if ($code === '' || ($chapterNumbers[0] ?? 0) !== 1) {
            throw new RuntimeException('Unable to read complete WEB book metadata.');
        }
        return [
            'code' => $code,
            'longName' => isset($longName[1]) ? trim($longName[1]) : null,
            'chapterCount' => max($chapterNumbers),
        ];
    }
}
