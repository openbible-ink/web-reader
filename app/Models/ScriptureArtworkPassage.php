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
