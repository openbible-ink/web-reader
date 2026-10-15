<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Highlight extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'bible_book_id',
        'chapter',
        'color',
        'selected_text',
    ];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<BibleBook, $this> */
    public function book(): BelongsTo
    {
        return $this->belongsTo(BibleBook::class, 'bible_book_id');
    }

    /** @return HasMany<HighlightSegment, $this> */
    public function segments(): HasMany
    {
        return $this->hasMany(HighlightSegment::class)->orderBy('position');
    }
}
