<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $slug
 * @property string $name
 * @property string $abbreviation
 * @property string $language
 * @property string|null $licence
 * @property string|null $attribution
 * @property string $source_format
 * @property string|null $variant_profile
 * @property-read Collection<int, BibleBook> $books
 */
class BibleEdition extends Model
{
    use HasUuids;

    protected $fillable = [
        'slug',
        'name',
        'abbreviation',
        'language',
        'licence',
        'attribution',
        'source_format',
        'variant_profile',
    ];

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /** @return HasMany<BibleBook, $this> */
    public function books(): HasMany
    {
        return $this->hasMany(BibleBook::class, 'edition_id');
    }
}
