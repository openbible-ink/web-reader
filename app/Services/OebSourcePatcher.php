<?php

namespace App\Services;

use Illuminate\Support\Facades\File;
use JsonException;
use RuntimeException;

class OebSourcePatcher
{
    /**
     * @return array{source: string, applied: list<string>}
     */
    public function apply(string $filename, string $source): array
    {
        $applied = [];

        foreach ($this->manifest() as $patch) {
            if (($patch['file'] ?? null) !== $filename) {
                continue;
            }

            $id = $patch['id'] ?? 'unnamed-patch';
            $expected = $patch['expected'] ?? null;
            $replacement = $patch['replacement'] ?? null;
            if (! is_string($expected) || $expected === '' || ! is_string($replacement)) {
                throw new RuntimeException("OEB source patch {$id} is invalid.");
            }

            $matches = substr_count($source, $expected);
            if ($matches !== 1) {
                $detail = $matches === 0 && str_contains($source, $replacement)
                    ? 'The replacement is already present; upstream may have corrected this text.'
                    : "Expected exactly one source match, found {$matches}.";

                throw new RuntimeException(
                    "OEB source patch {$id} no longer matches {$filename}. {$detail} Review resources/bible/oeb-source-patches.json before importing this upstream revision."
                );
            }

            $source = str_replace($expected, $replacement, $source, $count);
            if ($count !== 1) {
                throw new RuntimeException("OEB source patch {$id} could not be applied safely.");
            }
            $applied[] = $id;
        }

        return ['source' => $source, 'applied' => $applied];
    }

    /** @return list<array<string, mixed>> */
    private function manifest(): array
    {
        $path = base_path('resources/bible/oeb-source-patches.json');
        if (! File::isFile($path)) {
            throw new RuntimeException("OEB source patch manifest does not exist: {$path}");
        }

        try {
            $manifest = json_decode(File::get($path), true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException('OEB source patch manifest is invalid JSON.', previous: $exception);
        }

        if (! is_array($manifest) || ! isset($manifest['patches']) || ! is_array($manifest['patches'])) {
            throw new RuntimeException('OEB source patch manifest must contain a patches array.');
        }

        return array_values($manifest['patches']);
    }
}
