<?php

namespace Tests\Feature;

use App\Models\BibleEdition;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReaderNavigationTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_placeholder_is_available(): void
    {
        $this->get(route('search'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('search'));
    }

    public function test_book_overview_is_scoped_to_an_edition(): void
    {
        $edition = BibleEdition::query()->create([
            'slug' => 'oeb', 'name' => 'Open English Bible', 'abbreviation' => 'OEB',
            'language' => 'en', 'source_format' => 'usfm',
        ]);
        $book = $edition->books()->create([
            'book_code' => 'JHN', 'name' => 'John',
            'source_path' => '/bibles/oeb/43-John.usfm.db', 'chapter_count' => 21,
        ]);

        $this->get(route('books.show', [$edition, $book]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('book-overview')
                ->where('edition.slug', 'oeb')
                ->where('book.code', 'JHN'));
    }

    public function test_book_binding_cannot_cross_editions(): void
    {
        $oeb = BibleEdition::query()->create([
            'slug' => 'oeb', 'name' => 'Open English Bible', 'abbreviation' => 'OEB',
            'language' => 'en', 'source_format' => 'usfm',
        ]);
        $other = BibleEdition::query()->create([
            'slug' => 'other', 'name' => 'Other Bible', 'abbreviation' => 'OB',
            'language' => 'en', 'source_format' => 'usfm',
        ]);
        $book = $other->books()->create([
            'book_code' => 'JHN', 'name' => 'John',
            'source_path' => '/other.usfm', 'chapter_count' => 21,
        ]);

        $this->get(route('reader.show', [$oeb, $book, '1']))->assertNotFound();
    }

    public function test_chapter_must_be_within_the_book_range(): void
    {
        $edition = BibleEdition::query()->create([
            'slug' => 'oeb', 'name' => 'Open English Bible', 'abbreviation' => 'OEB',
            'language' => 'en', 'source_format' => 'usfm',
        ]);
        $book = $edition->books()->create([
            'book_code' => 'JHN', 'name' => 'John',
            'source_path' => '/john.usfm', 'chapter_count' => 21,
        ]);

        $this->get(route('reader.show', [$edition, $book, '22']))->assertNotFound();
    }
}
