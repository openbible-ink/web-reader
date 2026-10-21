<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Note extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id', 'bible_book_id', 'book_code', 'chapter', 'chapter_end', 'anchor_type', 'title',
        'body_markdown', 'selected_text', 'section_key', 'section_title',
        'verse_start', 'verse_end',
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

    /** @return HasMany<NoteSegment, $this> */
    public function segments(): HasMany
    {
        return $this->hasMany(NoteSegment::class)->orderBy('position');
    }
}
