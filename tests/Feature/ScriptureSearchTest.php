<?php

namespace Tests\Feature;

use App\Models\BibleEdition;
use App\Models\ScriptureSearchVerse;
use App\Models\User;
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
        $edition->books()->create([
            'book_code' => 'HEB', 'name' => 'Hebrews',
            'source_path' => '/bibles/oeb/58-Hebrews.usfm.db', 'chapter_count' => 13, 'canon_position' => 58,
        ]);
        ScriptureSearchVerse::query()->create([
            'edition_id' => $edition->id, 'bible_book_id' => $book->id,
            'book_code' => 'JHN', 'book_name' => 'John', 'canon_position' => 43,
            'chapter' => '8', 'verse' => '12', 'section_key' => 'light-section', 'section_title' => 'A revealing illumination',
            'footnote_text' => 'Some ancient manuscripts omit this phrase.',
            'text' => 'I am the light of the world. Whoever follows me will not walk in darkness.',
        ]);
        ScriptureSearchVerse::query()->create([
            'edition_id' => $edition->id, 'bible_book_id' => $book->id,
            'book_code' => 'JHN', 'book_name' => 'John', 'canon_position' => 43,
            'chapter' => '8', 'verse' => '13', 'section_key' => 'light-section', 'section_title' => 'A revealing illumination',
            'text' => 'The Pharisees challenged his testimony.',
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

    public function test_quick_search_returns_the_same_results_as_json(): void
    {
        $this->catalogue();

        $this->getJson('/search?quick=1&q=light')
            ->assertOk()
            ->assertJsonPath('props.results.total', 1)
            ->assertJsonPath('props.results.data.0.bookCode', 'JHN')
            ->assertJsonPath('props.results.data.0.verse', '12');
    }

    public function test_authenticated_users_can_search_their_own_notes(): void
    {
        $edition = $this->catalogue();
        $book = $edition->books()->where('book_code', 'JHN')->firstOrFail();
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $note = $user->notes()->create([
            'bible_book_id' => $book->id,
            'book_code' => 'JHN',
            'chapter' => '8',
            'anchor_type' => 'verse',
            'title' => 'A question about darkness',
            'body_markdown' => 'Explore the contrast with creation.',
            'verse_start' => '12',
            'verse_end' => '12',
        ]);
        $tag = $user->tags()->create(['name' => 'Questions', 'slug' => 'questions']);
        $note->tags()->attach($tag);
        $otherUser->notes()->create([
            'bible_book_id' => $book->id,
            'book_code' => 'JHN',
            'chapter' => '8',
            'anchor_type' => 'verse',
            'title' => 'Private darkness note',
            'body_markdown' => 'This must not appear.',
            'verse_start' => '12',
            'verse_end' => '12',
        ]);

        $this->actingAs($user)->get('/search?q=questions+in%3Anotes')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('searchScopes.0', 'notes')
                ->where('results.total', 1)
                ->where('results.data.0.kind', 'note')
                ->where('results.data.0.title', 'A question about darkness')
                ->where('results.data.0.url', "/notes/{$note->id}"));
    }

    public function test_quoted_text_matches_an_exact_contiguous_phrase(): void
    {
        $edition = $this->catalogue();
        $john = $edition->books()->where('book_code', 'JHN')->firstOrFail();
        ScriptureSearchVerse::query()->create([
            'edition_id' => $edition->id, 'bible_book_id' => $john->id,
            'book_code' => 'JHN', 'book_name' => 'John', 'canon_position' => 43,
            'chapter' => '9', 'verse' => '5', 'text' => 'The world was filled with a brilliant light.',
        ]);

        $this->get('/search?q=light+world')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('results.total', 2));

        $this->get('/search?q=%22light+of+the+world%22')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('searchText', '"light of the world"')
                ->where('results.total', 1)
                ->where('results.data.0.verse', '12'));
    }

    public function test_it_searches_section_headings_and_footnotes(): void
    {
        $this->catalogue();

        $this->get('/search?q=illumination')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('results.total', 1)
                ->where('results.data.0.kind', 'section')
                ->where('results.data.0.reference', 'John 8:12–13'));

        $this->get('/search?q=illumination+in%3Aheadings')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('results.total', 1)
                ->where('results.data.0.kind', 'section')
                ->where('results.data.0.reference', 'John 8:12–13')
                ->where('results.data.0.matchedIn.0', 'headings'));

        $this->get('/search?q=manuscripts')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('results.total', 1)
                ->where('results.data.0.footnoteText', 'Some ancient manuscripts omit this phrase.')
                ->where('results.data.0.matchedIn.0', 'footnotes'));
    }

    public function test_it_filters_search_content_with_in_syntax(): void
    {
        $this->catalogue();

        $this->get('/search?q=light+in%3Averse')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('searchText', 'light')
                ->where('searchScopes.0', 'verse')
                ->where('results.total', 1));

        $this->get('/search?q=light+in%3Afootnotes')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('searchText', 'light')
                ->where('searchScopes.0', 'footnotes')
                ->where('results.total', 0));
    }

    public function test_it_filters_by_book_testament_and_category_tokens(): void
    {
        $edition = $this->catalogue();
        $hebrews = $edition->books()->where('book_code', 'HEB')->firstOrFail();
        ScriptureSearchVerse::query()->create([
            'edition_id' => $edition->id, 'bible_book_id' => $hebrews->id,
            'book_code' => 'HEB', 'book_name' => 'Hebrews', 'canon_position' => 58,
            'chapter' => '11', 'verse' => '1', 'text' => 'Faith is assurance of things hoped for.',
        ]);

        $this->get('/search?q=light+book%3Ajohn')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('searchText', 'light')
                ->where('searchFilters.0.kind', 'book')
                ->where('searchFilters.0.bookCode', 'JHN')
                ->where('selectedBook', 'JHN')
                ->where('results.total', 1));

        $this->get('/search?q=faith+testament%3Ant')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('searchFilters.0.value', 'new')
                ->where('results.total', 1)
                ->where('results.data.0.bookCode', 'HEB'));

        $this->get('/search?q=faith+category%3Aepistle')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('searchFilters.0.label', 'Epistle')
                ->where('results.total', 1));

        $this->get('/search?q=light+category%3Agospel')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('results.total', 1)
                ->where('results.data.0.bookCode', 'JHN'));
    }

    public function test_it_supports_regular_expression_searches_and_exact_word_patterns(): void
    {
        $edition = $this->catalogue();
        $john = $edition->books()->where('book_code', 'JHN')->firstOrFail();
        ScriptureSearchVerse::query()->create([
            'edition_id' => $edition->id, 'bible_book_id' => $john->id,
            'book_code' => 'JHN', 'book_name' => 'John', 'canon_position' => 43,
            'chapter' => '9', 'verse' => '4', 'text' => 'The work was lightly regarded.',
        ]);

        $this->get('/search?q=%2F%5Elight%24%2F+in%3Averse')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('isRegex', true)
                ->where('regexError', null)
                ->where('results.total', 1)
                ->where('results.data.0.verse', '12'));

        $this->get('/search?q=%2Flight%2F+in%3Averse')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('results.total', 2));

        $this->get('/search?q=%2F%5Blight%2F')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('isRegex', false)
                ->where('regexError', 'This regular expression is not valid. Check its brackets and escape characters.')
                ->where('results', null));
    }

    public function test_it_recognises_a_scripture_reference(): void
    {
        $this->catalogue();

        $this->get('/search?q=John+3%3A16')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('reference.label', 'John 3:16')
                ->where('reference.url', '/read/JHN/3?translation=oeb&verses=16')
                ->where('results', null));
    }

    public function test_it_recognises_space_separated_reference_numbers_and_ranges(): void
    {
        $this->catalogue();

        $this->get('/search?q=Heb+11+1')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('reference.label', 'Hebrews 11:1')
                ->where('reference.url', '/read/HEB/11?translation=oeb&verses=1'));

        $this->get('/search?q=Heb+11+1+3')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('reference.label', 'Hebrews 11:1–3')
                ->where('reference.url', '/read/HEB/11?translation=oeb&verses=1-3'));
    }

    public function test_reader_receives_a_focused_search_passage(): void
    {
        $this->catalogue();

        $this->get('/read/HEB/11?translation=oeb&verses=1-3')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('focusedPassage.label', 'Hebrews 11:1–3')
                ->where('focusedPassage.verseStart', '1')
                ->where('focusedPassage.verseEnd', '3'));
    }
}
