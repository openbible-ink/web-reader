<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property-read Collection<int, ScriptureArtworkPassage> $passages
 */
class ScriptureArtwork extends Model
{
    use HasUuids;

    protected $fillable = [
        'image_path',
        'title',
        'alt_text',
        'caption',
        'approach',
        'attribution',
        'license',
        'source_url',
        'focal_point_x',
        'focal_point_y',
    ];

    protected function casts(): array
    {
        return [
            'focal_point_x' => 'float',
            'focal_point_y' => 'float',
        ];
    }

    /** @return HasMany<ScriptureArtworkPassage, $this> */
    public function passages(): HasMany
    {
        return $this->hasMany(ScriptureArtworkPassage::class, 'artwork_id');
    }
}
