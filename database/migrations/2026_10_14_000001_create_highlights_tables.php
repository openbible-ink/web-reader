<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('highlights', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('bible_book_id')->constrained('bible_books')->cascadeOnDelete();
            $table->string('chapter', 16);
            $table->string('color', 24);
            $table->text('selected_text');
            $table->timestamps();

            $table->index(['user_id', 'bible_book_id', 'chapter']);
        });

        Schema::create('highlight_segments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('highlight_id')->constrained('highlights')->cascadeOnDelete();
            $table->string('verse', 16);
            $table->unsignedInteger('start_offset');
            $table->unsignedInteger('end_offset');
            $table->text('exact_text');
            $table->string('prefix', 64)->nullable();
            $table->string('suffix', 64)->nullable();
            $table->unsignedSmallInteger('position');
            $table->timestamps();

            $table->unique(['highlight_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('highlight_segments');
        Schema::dropIfExists('highlights');
    }
};
