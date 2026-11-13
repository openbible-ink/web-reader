<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scripture_search_verses', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('edition_id')->constrained('bible_editions')->cascadeOnDelete();
            $table->foreignUuid('bible_book_id')->constrained('bible_books')->cascadeOnDelete();
            $table->string('book_code', 12);
            $table->string('book_name');
            $table->unsignedSmallInteger('canon_position')->nullable();
            $table->string('chapter', 12);
            $table->string('verse', 24);
            $table->string('section_title')->nullable();
            $table->text('text');
            $table->timestamps();

            $table->unique(['edition_id', 'book_code', 'chapter', 'verse'], 'scripture_search_verse_unique');
            $table->index(['edition_id', 'book_code', 'chapter'], 'scripture_search_reference_index');
            $table->index(['edition_id', 'canon_position'], 'scripture_search_canon_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scripture_search_verses');
    }
};
