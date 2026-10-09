<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scripture_artworks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('image_path');
            $table->string('title')->nullable();
            $table->string('alt_text');
            $table->text('caption')->nullable();
            $table->string('approach', 24);
            $table->string('attribution')->nullable();
            $table->string('license')->nullable();
            $table->string('source_url')->nullable();
            $table->decimal('focal_point_x', 5, 2)->nullable();
            $table->decimal('focal_point_y', 5, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('scripture_artwork_passages', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('artwork_id')
                ->constrained('scripture_artworks')
                ->cascadeOnDelete();
            $table->string('book_code', 12);
            $table->string('chapter', 16)->nullable();
            $table->string('verse_start', 16)->nullable();
            $table->string('verse_end', 16)->nullable();
            $table->string('role', 24)->default('inline');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(
                ['book_code', 'chapter', 'verse_start', 'verse_end'],
                'scripture_artwork_reference_index',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scripture_artwork_passages');
        Schema::dropIfExists('scripture_artworks');
    }
};
