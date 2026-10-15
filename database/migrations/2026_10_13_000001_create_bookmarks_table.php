<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookmarks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('bible_book_id')->constrained('bible_books')->cascadeOnDelete();
            $table->string('chapter', 16);
            $table->string('verse_start', 16)->nullable();
            $table->string('verse_end', 16)->nullable();
            $table->string('title', 120)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'bible_book_id', 'chapter']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookmarks');
    }
};
