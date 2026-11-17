<?php

namespace App\Support;

final class CanonicalBookMetadata
{
    /** @var array<string, string> */
    private const CATEGORIES = [
        'GEN' => 'Pentateuch', 'EXO' => 'Pentateuch', 'LEV' => 'Pentateuch', 'NUM' => 'Pentateuch', 'DEU' => 'Pentateuch',
        'JOS' => 'History', 'JDG' => 'History', 'RUT' => 'History', '1SA' => 'History', '2SA' => 'History',
        '1KI' => 'History', '2KI' => 'History', '1CH' => 'History', '2CH' => 'History', 'EZR' => 'History',
        'NEH' => 'History', 'EST' => 'History', 'ACT' => 'History',
        'JOB' => 'Wisdom & Poetry', 'PSA' => 'Wisdom & Poetry', 'PRO' => 'Wisdom & Poetry', 'ECC' => 'Wisdom & Poetry', 'SNG' => 'Wisdom & Poetry',
        'ISA' => 'Major Prophet', 'JER' => 'Major Prophet', 'LAM' => 'Major Prophet', 'EZK' => 'Major Prophet', 'DAN' => 'Major Prophet',
        'HOS' => 'Minor Prophet', 'JOL' => 'Minor Prophet', 'AMO' => 'Minor Prophet', 'OBA' => 'Minor Prophet',
        'JON' => 'Minor Prophet', 'MIC' => 'Minor Prophet', 'NAM' => 'Minor Prophet', 'HAB' => 'Minor Prophet',
        'ZEP' => 'Minor Prophet', 'HAG' => 'Minor Prophet', 'ZEC' => 'Minor Prophet', 'MAL' => 'Minor Prophet',
        'MAT' => 'Gospel', 'MRK' => 'Gospel', 'LUK' => 'Gospel', 'JHN' => 'Gospel',
        'ROM' => 'Epistle', '1CO' => 'Epistle', '2CO' => 'Epistle', 'GAL' => 'Epistle', 'EPH' => 'Epistle',
        'PHP' => 'Epistle', 'COL' => 'Epistle', '1TH' => 'Epistle', '2TH' => 'Epistle', '1TI' => 'Epistle',
        '2TI' => 'Epistle', 'TIT' => 'Epistle', 'PHM' => 'Epistle', 'HEB' => 'Epistle', 'JAS' => 'Epistle',
        '1PE' => 'Epistle', '2PE' => 'Epistle', '1JN' => 'Epistle', '2JN' => 'Epistle', '3JN' => 'Epistle', 'JUD' => 'Epistle',
        'REV' => 'Apocalypse',
    ];

    public static function category(string $bookCode): string
    {
        return self::CATEGORIES[strtoupper($bookCode)] ?? 'Scripture';
    }

    /** @return array<int, string> */
    public static function categories(): array
    {
        return array_values(array_unique(self::CATEGORIES));
    }

    /** @return array<int, string> */
    public static function bookCodesForCategory(string $category): array
    {
        return array_keys(array_filter(self::CATEGORIES, fn (string $value): bool => $value === $category));
    }
}
