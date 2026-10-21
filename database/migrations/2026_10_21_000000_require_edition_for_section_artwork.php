<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $oebId = DB::table('bible_editions')->where('slug', 'oeb')->value('id');

        if ($oebId !== null) {
            DB::table('scripture_artwork_passages')
                ->whereNotNull('section_key')
                ->whereNull('edition_id')
                ->update(['edition_id' => $oebId]);
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement(<<<'SQL'
                alter table scripture_artwork_passages
                add constraint scripture_artwork_section_requires_edition
                check (section_key is null or edition_id is not null)
            SQL);
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('alter table scripture_artwork_passages drop constraint if exists scripture_artwork_section_requires_edition');
        }
    }
};
