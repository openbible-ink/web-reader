<?php

namespace App\Support;

use App\Models\User;

final class HighlightLabels
{
    /** @var array<string, string> */
    public const DEFAULTS = [
        'yellow' => 'Gold',
        'green' => 'Green',
        'blue' => 'Blue',
        'rose' => 'Red',
    ];

    /** @return array<string, string> */
    public static function forUser(?User $user): array
    {
        if (! $user || ! is_array($user->highlight_colour_labels)) {
            return self::DEFAULTS;
        }

        $labels = self::DEFAULTS;
        foreach (array_keys(self::DEFAULTS) as $colour) {
            if (array_key_exists($colour, $user->highlight_colour_labels)) {
                $labels[$colour] = (string) ($user->highlight_colour_labels[$colour] ?? '');
            }
        }

        return $labels;
    }
}
