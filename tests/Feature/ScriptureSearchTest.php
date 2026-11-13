<?php

namespace Tests\Feature;

use App\Models\BibleEdition;
use App\Models\ScriptureSearchVerse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ScriptureSearchTest extends TestCase
{
    use RefreshDatabase;

    private function catalogue(): BibleEdition
    {
        $edition = BibleEdition::query()->create([
            'slug' => 'oeb', 'name' => 'Open English Bible', 'abbreviation' => 'OEB',
            'language' => 'en', 'source_format' => 'usfm',
        ]);
        $book = $edition->books()->create([
            'book_code' => 'JHN', 'name' => 'John', 'long_name' => 'The Gospel According to John',
            'source_path' => '/bibles/oeb/43-John.usfm.db', 'chapter_count' => 21, 'canon_position' => 43,
        ]);
        ScriptureSearchVerse::query()->create([
            'edition_id' => $edition->id, 'bible_book_id' => $book->id,
            'book_code' => 'JHN', 'book_name' => 'John', 'canon_position' => 43,
            'chapter' => '8', 'verse' => '12', 'section_title' => 'The Light of the World',
            'text' => 'I am the light of the world. Whoever follows me will not walk in darkness.',
        ]);

        return $edition;
    }

    public function test_it_searches_indexed_scripture_text(): void
    {
        $this->catalogue();

        $this->get('/search?q=light+world')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('search')
                ->where('query', 'light world')
                ->where('results.total', 1)
                ->where('results.data.0.bookCode', 'JHN')
                ->where('results.data.0.verse', '12'));
    }

    public function test_it_recognises_a_scripture_reference(): void
    {
        $this->catalogue();

        $this->get('/search?q=John+3%3A16')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('reference.label', 'John 3:16')
                ->where('reference.url', '/read/JHN/3?translation=oeb#verse-16')
                ->where('results', null));
    }
}
