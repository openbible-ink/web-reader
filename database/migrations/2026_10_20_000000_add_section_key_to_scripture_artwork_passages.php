<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scripture_artwork_passages', function (Blueprint $table) {
            $table->string('section_key')->nullable()->after('chapter');
            $table->index(['book_code', 'chapter', 'section_key']);
        });
    }

    public function down(): void
    {
        Schema::table('scripture_artwork_passages', function (Blueprint $table) {
            $table->dropIndex(['book_code', 'chapter', 'section_key']);
            $table->dropColumn('section_key');
        });
    }
};
