<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tags', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 40);
            $table->string('slug', 48);
            $table->timestamps();

            $table->unique(['user_id', 'slug']);
        });

        Schema::create('note_tag', function (Blueprint $table) {
            $table->foreignUuid('note_id')->constrained('notes')->cascadeOnDelete();
            $table->foreignUuid('tag_id')->constrained('tags')->cascadeOnDelete();

            $table->primary(['note_id', 'tag_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('note_tag');
        Schema::dropIfExists('tags');
    }
};
