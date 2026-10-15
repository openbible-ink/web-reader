<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $edition_id
 * @property string $book_code
 * @property string $name
 * @property string|null $long_name
 * @property string $source_path
 * @property int $chapter_count
 * @property int|null $canon_position
 * @property-read BibleEdition $edition
 */
class BibleBook extends Model
{
    use HasUuids;

    protected $fillable = [
        'edition_id',
        'book_code',
        'name',
        'long_name',
        'source_path',
        'chapter_count',
        'canon_position',
    ];

    protected function casts(): array
    {
        return [
            'chapter_count' => 'integer',
            'canon_position' => 'integer',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'book_code';
    }

    /** @return BelongsTo<BibleEdition, $this> */
    public function edition(): BelongsTo
    {
        return $this->belongsTo(BibleEdition::class, 'edition_id');
    }

    /** @return HasMany<Bookmark, $this> */
    public function bookmarks(): HasMany
    {
        return $this->hasMany(Bookmark::class, 'bible_book_id');
    }

    /** @return HasMany<Highlight, $this> */
    public function highlights(): HasMany
    {
        return $this->hasMany(Highlight::class, 'bible_book_id');
    }
}
