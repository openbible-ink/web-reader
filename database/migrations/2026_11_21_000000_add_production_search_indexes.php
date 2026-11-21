<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            Schema::table('notes', function ($table): void {
                $table->index(['user_id', 'updated_at'], 'notes_user_updated_index');
            });

            return;
        }

        DB::statement(<<<'SQL'
            ALTER TABLE scripture_search_verses
            ADD COLUMN text_search_vector tsvector
                GENERATED ALWAYS AS (to_tsvector('english'::regconfig, coalesce(text, ''))) STORED,
            ADD COLUMN heading_search_vector tsvector
                GENERATED ALWAYS AS (to_tsvector('english'::regconfig, coalesce(section_title, ''))) STORED,
            ADD COLUMN footnote_search_vector tsvector
                GENERATED ALWAYS AS (to_tsvector('english'::regconfig, coalesce(footnote_text, ''))) STORED
            SQL);
        DB::statement('CREATE INDEX scripture_search_text_gin ON scripture_search_verses USING GIN (text_search_vector)');
        DB::statement('CREATE INDEX scripture_search_heading_gin ON scripture_search_verses USING GIN (heading_search_vector)');
        DB::statement('CREATE INDEX scripture_search_footnote_gin ON scripture_search_verses USING GIN (footnote_search_vector)');

        DB::statement(<<<'SQL'
            ALTER TABLE notes
            ADD COLUMN search_vector tsvector
                GENERATED ALWAYS AS (
                    setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A') ||
                    setweight(to_tsvector('english'::regconfig, coalesce(body_markdown, '')), 'B') ||
                    setweight(to_tsvector('english'::regconfig, coalesce(section_title, '')), 'C') ||
                    setweight(to_tsvector('english'::regconfig, coalesce(selected_text, '')), 'C')
                ) STORED
            SQL);
        DB::statement('CREATE INDEX notes_search_gin ON notes USING GIN (search_vector)');
        DB::statement('CREATE INDEX notes_user_updated_index ON notes (user_id, updated_at DESC)');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            Schema::table('notes', function ($table): void {
                $table->dropIndex('notes_user_updated_index');
            });

            return;
        }

        DB::statement('DROP INDEX IF EXISTS notes_user_updated_index');
        DB::statement('DROP INDEX IF EXISTS notes_search_gin');
        DB::statement('ALTER TABLE notes DROP COLUMN IF EXISTS search_vector');
        DB::statement('DROP INDEX IF EXISTS scripture_search_footnote_gin');
        DB::statement('DROP INDEX IF EXISTS scripture_search_heading_gin');
        DB::statement('DROP INDEX IF EXISTS scripture_search_text_gin');
        DB::statement(<<<'SQL'
            ALTER TABLE scripture_search_verses
            DROP COLUMN IF EXISTS footnote_search_vector,
            DROP COLUMN IF EXISTS heading_search_vector,
            DROP COLUMN IF EXISTS text_search_vector
            SQL);
    }
};
