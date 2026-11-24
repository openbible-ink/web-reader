<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scripture_search_verses', function (Blueprint $table) {
            $table->json('strong_numbers')->nullable()->after('footnote_text');
        });
    }

    public function down(): void
    {
        Schema::table('scripture_search_verses', function (Blueprint $table) {
            $table->dropColumn('strong_numbers');
        });
    }
};
