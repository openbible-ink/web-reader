<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NoteSegment extends Model
{
    use HasUuids;

    protected $fillable = [
        'note_id', 'verse', 'start_offset', 'end_offset', 'exact_text',
        'prefix', 'suffix', 'position',
    ];

    /** @return BelongsTo<Note, $this> */
    public function note(): BelongsTo
    {
        return $this->belongsTo(Note::class);
    }
}
