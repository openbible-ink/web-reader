<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('bible_book_id')->constrained('bible_books')->cascadeOnDelete();
            $table->string('chapter', 16);
            $table->string('anchor_type', 24);
            $table->string('title', 180);
            $table->longText('body_markdown');
            $table->text('selected_text')->nullable();
            $table->string('section_key')->nullable();
            $table->string('section_title')->nullable();
            $table->string('verse_start', 16)->nullable();
            $table->string('verse_end', 16)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'bible_book_id', 'chapter']);
        });

        Schema::create('note_segments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('note_id')->constrained('notes')->cascadeOnDelete();
            $table->string('verse', 16);
            $table->unsignedInteger('start_offset');
            $table->unsignedInteger('end_offset');
            $table->text('exact_text');
            $table->string('prefix', 64)->nullable();
            $table->string('suffix', 64)->nullable();
            $table->unsignedSmallInteger('position');
            $table->timestamps();

            $table->unique(['note_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('note_segments');
        Schema::dropIfExists('notes');
    }
};
