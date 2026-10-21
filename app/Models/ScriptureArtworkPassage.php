<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $book_code
 * @property string|null $edition_id
 * @property string|null $versification
 * @property string|null $chapter
 * @property string|null $section_key
 * @property string|null $verse_start
 * @property string|null $verse_end
 * @property string $role
 * @property-read ScriptureArtwork $artwork
 */
class ScriptureArtworkPassage extends Model
{
    protected $fillable = [
        'artwork_id',
        'edition_id',
        'versification',
        'book_code',
        'chapter',
        'section_key',
        'verse_start',
        'verse_end',
        'role',
        'sort_order',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $placement): void {
            if (blank($placement->section_key)) {
                return;
            }

            if (blank($placement->edition_id)) {
                throw new \LogicException('Section artwork must belong to a specific Bible edition.');
            }

            if (blank($placement->chapter) || blank($placement->verse_start) || blank($placement->verse_end)) {
                throw new \LogicException('Section artwork must include its canonical chapter and verse range.');
            }
        });
    }

    /** @return BelongsTo<ScriptureArtwork, $this> */
    public function artwork(): BelongsTo
    {
        return $this->belongsTo(ScriptureArtwork::class, 'artwork_id');
    }

    /** @return BelongsTo<BibleEdition, $this> */
    public function edition(): BelongsTo
    {
        return $this->belongsTo(BibleEdition::class, 'edition_id');
    }
}
