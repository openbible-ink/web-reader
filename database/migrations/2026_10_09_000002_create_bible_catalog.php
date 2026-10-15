<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bible_editions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('abbreviation', 24);
            $table->string('language', 16)->default('en');
            $table->string('licence')->nullable();
            $table->text('attribution')->nullable();
            $table->string('source_format', 24)->default('usfm');
            $table->string('variant_profile', 48)->nullable();
            $table->timestamps();
        });

        Schema::create('bible_books', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('edition_id')->constrained('bible_editions')->cascadeOnDelete();
            $table->string('book_code', 12);
            $table->string('name');
            $table->string('long_name')->nullable();
            $table->string('source_path');
            $table->unsignedSmallInteger('chapter_count');
            $table->unsignedSmallInteger('canon_position')->nullable();
            $table->timestamps();

            $table->unique(['edition_id', 'book_code']);
        });

        Schema::table('scripture_artwork_passages', function (Blueprint $table) {
            $table->foreignUuid('edition_id')
                ->nullable()
                ->after('artwork_id')
                ->constrained('bible_editions')
                ->nullOnDelete();
            $table->string('versification', 48)->nullable()->after('edition_id');
        });
    }

    public function down(): void
    {
        Schema::table('scripture_artwork_passages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('edition_id');
            $table->dropColumn('versification');
        });

        Schema::dropIfExists('bible_books');
        Schema::dropIfExists('bible_editions');
    }
};
