<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('scripture_artwork_passages')
            ->where('book_code', 'JHN')
            ->where('role', 'hero')
            ->whereNull('chapter')
            ->whereIn('artwork_id', fn ($query) => $query
                ->select('id')
                ->from('scripture_artworks')
                ->where('image_path', '/images/scripture/john-olive-branch.png'))
            ->update(['chapter' => '1']);
    }

    public function down(): void
    {
        DB::table('scripture_artwork_passages')
            ->where('book_code', 'JHN')
            ->where('chapter', '1')
            ->where('role', 'hero')
            ->whereIn('artwork_id', fn ($query) => $query
                ->select('id')
                ->from('scripture_artworks')
                ->where('image_path', '/images/scripture/john-olive-branch.png'))
            ->update(['chapter' => null]);
    }
};
