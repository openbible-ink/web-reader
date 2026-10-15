<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HighlightSegment extends Model
{
    use HasUuids;

    protected $fillable = [
        'verse',
        'start_offset',
        'end_offset',
        'exact_text',
        'prefix',
        'suffix',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'start_offset' => 'integer',
            'end_offset' => 'integer',
            'position' => 'integer',
        ];
    }

    /** @return BelongsTo<Highlight, $this> */
    public function highlight(): BelongsTo
    {
        return $this->belongsTo(Highlight::class);
    }
}
