<?php

namespace Tests\Feature;

use App\Models\BibleBook;
use App\Models\BibleEdition;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_redirects_to_the_default_edition_book_and_chapter(): void
    {
        $this->get(route('home'))->assertRedirect('/read/JHN/1');
    }

    public function test_reader_receives_catalog_metadata(): void
    {
        [$edition, $book] = $this->john();

        $this->get(route('reader.show', ['book' => 'JHN', 'chapter' => '1']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reader')
                ->where('edition.slug', 'oeb')
                ->where('edition.variantProfile', 'oeb')
                ->where('book.code', 'JHN')
                ->where('book.sourceUrl', url('/bibles/oeb/43-John.usfm.db'))
                ->where('chapter', '1'));
    }

    /** @return array{BibleEdition, BibleBook} */
    private function john(): array
    {
        $edition = BibleEdition::query()->create([
            'slug' => 'oeb', 'name' => 'Open English Bible', 'abbreviation' => 'OEB',
            'language' => 'en', 'source_format' => 'usfm', 'variant_profile' => 'oeb',
        ]);
        $book = $edition->books()->create([
            'book_code' => 'JHN', 'name' => 'John',
            'long_name' => 'The Gospel according to John',
            'source_path' => '/bibles/oeb/43-John.usfm.db', 'chapter_count' => 21,
        ]);

        return [$edition, $book];
    }
}
