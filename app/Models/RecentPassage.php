<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecentPassage extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'book_code',
        'chapter',
        'chapter_end',
        'verse_start',
        'verse_end',
        'section_key',
        'last_viewed_at',
        'visit_count',
    ];

    protected function casts(): array
    {
        return ['last_viewed_at' => 'datetime'];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
