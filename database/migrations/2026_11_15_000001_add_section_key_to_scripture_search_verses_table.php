<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scripture_search_verses', function (Blueprint $table) {
            $table->string('section_key')->nullable()->after('verse');
            $table->index(['edition_id', 'book_code', 'chapter', 'section_key'], 'scripture_search_section_index');
        });
    }

    public function down(): void
    {
        Schema::table('scripture_search_verses', function (Blueprint $table) {
            $table->dropIndex('scripture_search_section_index');
            $table->dropColumn('section_key');
        });
    }
};
