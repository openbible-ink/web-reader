<?php

namespace Tests\Feature;

use App\Models\BibleEdition;
use App\Models\Bookmark;
use App\Models\Note;
use App\Models\User;
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

        $this->get(route('books.show', ['book' => 'JHN']))
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

        $this->get(route('reader.show', [
            'book' => 'JHN',
            'chapter' => '1',
            'translation' => 'oeb',
        ]))->assertNotFound();
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

        $this->get(route('reader.show', ['book' => 'JHN', 'chapter' => '22']))->assertNotFound();
    }

    public function test_reader_translation_is_a_session_override_and_does_not_change_the_default(): void
    {
        $oeb = BibleEdition::query()->create([
            'slug' => 'oeb', 'name' => 'Open English Bible', 'abbreviation' => 'OEB',
            'language' => 'en', 'source_format' => 'usfm',
        ]);
        $web = BibleEdition::query()->create([
            'slug' => 'webp', 'name' => 'World English Bible', 'abbreviation' => 'WEB',
            'language' => 'en-US', 'source_format' => 'usfm',
        ]);
        foreach ([$oeb, $web] as $edition) {
            $edition->books()->create([
                'book_code' => 'JHN', 'name' => 'John',
                'source_path' => "/{$edition->slug}-john.usfm", 'chapter_count' => 21,
            ]);
        }
        $user = User::factory()->create(['preferred_edition_id' => $oeb->id]);

        $this->actingAs($user)
            ->get(route('reader.show', ['book' => 'JHN', 'chapter' => '1', 'translation' => 'webp']))
            ->assertOk()
            ->assertSessionHas('reader_edition_slug', 'webp')
            ->assertInertia(fn (Assert $page) => $page
                ->where('edition.slug', 'webp')
                ->where('defaultEditionSlug', 'oeb'));

        $this->assertSame($oeb->id, $user->refresh()->preferred_edition_id);

        $this->get(route('reader.show', ['book' => 'JHN', 'chapter' => '2']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('edition.slug', 'webp'));
    }

    public function test_reader_can_load_a_second_translation_for_comparison(): void
    {
        $oeb = BibleEdition::query()->create([
            'slug' => 'oeb', 'name' => 'Open English Bible', 'abbreviation' => 'OEB',
            'language' => 'en', 'source_format' => 'usfm',
        ]);
        $web = BibleEdition::query()->create([
            'slug' => 'webp', 'name' => 'World English Bible', 'abbreviation' => 'WEB',
            'language' => 'en-US', 'source_format' => 'usfm',
        ]);
        foreach ([$oeb, $web] as $edition) {
            $edition->books()->create([
                'book_code' => 'JHN', 'name' => 'John',
                'source_path' => "/{$edition->slug}-john.usfm", 'chapter_count' => 21,
            ]);
        }

        $this->get(route('reader.show', [
            'book' => 'JHN',
            'chapter' => '1',
            'compare' => 'webp',
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('edition.slug', 'oeb')
                ->where('comparison.edition.slug', 'webp')
                ->where('comparison.book.sourceUrl', url('/webp-john.usfm')));
    }

    public function test_user_can_explicitly_change_their_default_translation(): void
    {
        $oeb = BibleEdition::query()->create([
            'slug' => 'oeb', 'name' => 'Open English Bible', 'abbreviation' => 'OEB',
            'language' => 'en', 'source_format' => 'usfm',
        ]);
        $web = BibleEdition::query()->create([
            'slug' => 'webp', 'name' => 'World English Bible', 'abbreviation' => 'WEB',
            'language' => 'en-US', 'source_format' => 'usfm',
        ]);
        $user = User::factory()->create(['preferred_edition_id' => $oeb->id]);

        $this->actingAs($user)
            ->from('/dashboard')
            ->patch(route('translation.update'), ['translation' => 'webp'])
            ->assertRedirect('/dashboard')
            ->assertSessionHas('reader_edition_slug', 'webp');

        $this->assertSame($web->id, $user->refresh()->preferred_edition_id);
    }

    public function test_reader_receives_the_edition_book_catalogue_in_canon_order(): void
    {
        $edition = BibleEdition::query()->create([
            'slug' => 'oeb', 'name' => 'Open English Bible', 'abbreviation' => 'OEB',
            'language' => 'en', 'source_format' => 'usfm',
        ]);
        $john = $edition->books()->create([
            'book_code' => 'JHN', 'name' => 'John',
            'source_path' => '/john.usfm', 'chapter_count' => 21, 'canon_position' => 43,
        ]);
        $edition->books()->create([
            'book_code' => 'GEN', 'name' => 'Genesis',
            'source_path' => '/genesis.usfm', 'chapter_count' => 50, 'canon_position' => 1,
        ]);

        $this->get(route('reader.show', ['book' => 'JHN', 'chapter' => '1']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('libraryBooks.0.code', 'GEN')
                ->where('libraryBooks.0.testament', 'old')
                ->where('libraryBooks.0.readerUrl', '/read/GEN/1')
                ->where('libraryBooks.1.code', 'JHN')
                ->where('libraryBooks.1.testament', 'new'));
    }

    public function test_canonical_attachments_follow_the_passage_across_translations(): void
    {
        $user = User::factory()->create();
        $oeb = BibleEdition::query()->create([
            'slug' => 'oeb', 'name' => 'Open English Bible', 'abbreviation' => 'OEB',
            'language' => 'en', 'source_format' => 'usfm',
        ]);
        $other = BibleEdition::query()->create([
            'slug' => 'other', 'name' => 'Other Bible', 'abbreviation' => 'OB',
            'language' => 'en', 'source_format' => 'usfm',
        ]);
        $sourceBook = $oeb->books()->create([
            'book_code' => 'JHN', 'name' => 'John',
            'source_path' => '/oeb-john.usfm', 'chapter_count' => 21,
        ]);
        $translatedBook = $other->books()->create([
            'book_code' => 'JHN', 'name' => 'John',
            'source_path' => '/other-john.usfm', 'chapter_count' => 21,
        ]);

        Bookmark::query()->create([
            'user_id' => $user->id,
            'bible_book_id' => $sourceBook->id,
            'book_code' => 'JHN',
            'chapter' => '1',
            'verse_start' => '1',
            'verse_end' => '1',
        ]);
        Note::query()->create([
            'user_id' => $user->id,
            'bible_book_id' => $sourceBook->id,
            'book_code' => 'JHN',
            'chapter' => '1',
            'anchor_type' => 'verse',
            'title' => 'Canonical note',
            'body_markdown' => 'Visible in every translation.',
            'verse_start' => '1',
            'verse_end' => '1',
        ]);
        Note::query()->create([
            'user_id' => $user->id,
            'bible_book_id' => $sourceBook->id,
            'book_code' => 'JHN',
            'chapter' => '1',
            'anchor_type' => 'selection',
            'title' => 'Wording-specific note',
            'body_markdown' => 'Only visible in the source translation.',
            'selected_text' => 'the Word',
            'verse_start' => '1',
            'verse_end' => '1',
        ]);

        $this->actingAs($user)
            ->get(route('reader.show', [
                'book' => 'JHN',
                'chapter' => '1',
                'translation' => 'other',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('bookmarks', 1)
                ->has('notes', 1)
                ->where('notes.0.title', 'Canonical note'));
    }
}
