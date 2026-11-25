<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScriptureSearchVerse extends Model
{
    protected $fillable = [
        'edition_id',
        'bible_book_id',
        'book_code',
        'book_name',
        'canon_position',
        'chapter',
        'verse',
        'section_key',
        'section_title',
        'footnote_text',
        'strong_numbers',
        'strong_terms',
        'text',
    ];

    protected function casts(): array
    {
        return [
            'canon_position' => 'integer',
            'strong_numbers' => 'array',
            'strong_terms' => 'array',
        ];
    }
}
