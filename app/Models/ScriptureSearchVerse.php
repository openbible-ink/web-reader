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
        'section_title',
        'text',
    ];

    protected function casts(): array
    {
        return ['canon_position' => 'integer'];
    }
}
