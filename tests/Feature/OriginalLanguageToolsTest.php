<?php

namespace Tests\Feature;

use App\Models\BibleEdition;
use App\Models\ScriptureSearchVerse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OriginalLanguageToolsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_enable_and_disable_original_language_tools(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertInertia(fn (Assert $page) => $page
                ->where('originalLanguageTools', false));

        $this->from('/dashboard#preferences')
            ->patch(route('original-language-tools.update'), ['enabled' => true])
            ->assertRedirect('/dashboard#preferences')
            ->assertSessionHasNoErrors();

        $this->assertTrue($user->refresh()->original_language_tools);

        $this->from('/dashboard#preferences')
            ->patch(route('original-language-tools.update'), ['enabled' => false])
            ->assertRedirect('/dashboard#preferences');

        $this->assertFalse($user->refresh()->original_language_tools);
    }

    public function test_word_study_endpoint_returns_lexicon_and_occurrences(): void
    {
        $edition = BibleEdition::query()->create([
            'slug' => 'webp',
            'name' => 'World English Bible',
            'abbreviation' => 'WEB',
            'language' => 'en',
            'source_format' => 'usfm',
        ]);
        $book = $edition->books()->create([
            'book_code' => 'JHN',
            'name' => 'John',
            'source_path' => '/bibles/webp/43-JHN.usfm',
            'chapter_count' => 21,
            'canon_position' => 43,
        ]);
        ScriptureSearchVerse::query()->create([
            'edition_id' => $edition->id,
            'bible_book_id' => $book->id,
            'book_code' => 'JHN',
            'book_name' => 'John',
            'canon_position' => 43,
            'chapter' => '1',
            'verse' => '1',
            'text' => 'In the beginning was the Word.',
            'strong_numbers' => ['G746'],
        ]);

        $this->getJson('/api/v1/word-study/G746')
            ->assertOk()
            ->assertJsonPath('strong', 'G746')
            ->assertJsonPath('language', 'Greek')
            ->assertJsonPath('lemma', 'ἀρχή')
            ->assertJsonPath('occurrenceCount', 1)
            ->assertJsonPath('occurrencePagination.currentPage', 1)
            ->assertJsonPath('occurrencePagination.lastPage', 1)
            ->assertJsonPath('occurrencePagination.from', 1)
            ->assertJsonPath('occurrencePagination.to', 1)
            ->assertJsonPath('occurrences.0.reference', 'John 1:1');
    }
}
