<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookmarks', function (Blueprint $table) {
            $table->string('book_code', 12)->nullable()->after('bible_book_id')->index();
        });
        Schema::table('highlights', function (Blueprint $table) {
            $table->string('book_code', 12)->nullable()->after('bible_book_id')->index();
            $table->string('anchor_type', 24)->default('selection')->after('chapter');
            $table->string('chapter_end', 16)->nullable()->after('chapter');
            $table->string('verse_start', 16)->nullable()->after('anchor_type');
            $table->string('verse_end', 16)->nullable()->after('verse_start');
        });
        Schema::table('notes', function (Blueprint $table) {
            $table->string('book_code', 12)->nullable()->after('bible_book_id')->index();
        });
        Schema::table('users', function (Blueprint $table) {
            $table->foreignUuid('preferred_edition_id')->nullable()->constrained('bible_editions')->nullOnDelete();
        });

        foreach (['bookmarks', 'highlights', 'notes'] as $table) {
            DB::table($table)->orderBy('id')->each(function (object $record) use ($table): void {
                $bookCode = DB::table('bible_books')->where('id', $record->bible_book_id)->value('book_code');
                DB::table($table)->where('id', $record->id)->update(['book_code' => $bookCode]);
            });
        }

        Schema::create('recent_passages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('book_code', 12);
            $table->string('chapter', 16);
            $table->string('chapter_end', 16)->nullable();
            $table->string('verse_start', 16)->nullable();
            $table->string('verse_end', 16)->nullable();
            $table->string('section_key')->nullable();
            $table->timestamp('last_viewed_at');
            $table->unsignedInteger('visit_count')->default(1);
            $table->timestamps();

            $table->index(['user_id', 'last_viewed_at']);
            $table->index(['user_id', 'book_code', 'chapter']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recent_passages');
        Schema::table('users', fn (Blueprint $table) => $table->dropConstrainedForeignId('preferred_edition_id'));
        Schema::table('notes', fn (Blueprint $table) => $table->dropColumn('book_code'));
        Schema::table('highlights', function (Blueprint $table) {
            $table->dropColumn(['book_code', 'anchor_type', 'chapter_end', 'verse_start', 'verse_end']);
        });
        Schema::table('bookmarks', fn (Blueprint $table) => $table->dropColumn('book_code'));
    }
};
