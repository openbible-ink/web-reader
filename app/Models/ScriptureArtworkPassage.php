<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $book_code
 * @property string|null $chapter
 * @property string|null $verse_start
 * @property string|null $verse_end
 * @property string $role
 * @property-read ScriptureArtwork $artwork
 */
class ScriptureArtworkPassage extends Model
{
    protected $fillable = [
        'artwork_id',
        'book_code',
        'chapter',
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
}
