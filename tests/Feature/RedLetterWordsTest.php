<?php

namespace Tests\Feature;

use App\Models\BibleEdition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RedLetterWordsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_enable_and_disable_red_letter_words(): void
    {
        $user = User::factory()->create();
        $edition = BibleEdition::query()->create([
            'slug' => 'oeb',
            'name' => 'Open English Bible',
            'abbreviation' => 'OEB',
            'language' => 'en',
            'source_format' => 'usfm',
        ]);
        $edition->books()->create([
            'book_code' => 'JHN',
            'name' => 'John',
            'source_path' => '/john.usfm',
            'chapter_count' => 21,
        ]);

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertInertia(fn (Assert $page) => $page
                ->where('redLetterWords', false));

        $this->from('/dashboard#preferences')
            ->patch(route('red-letter-words.update'), ['enabled' => true])
            ->assertRedirect('/dashboard#preferences')
            ->assertSessionHasNoErrors();

        $this->assertTrue($user->refresh()->red_letter_words);

        $this->get(route('reader.show', ['book' => 'JHN', 'chapter' => '1']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('redLetterWords', true));

        $this->from('/dashboard#preferences')
            ->patch(route('red-letter-words.update'), ['enabled' => false])
            ->assertRedirect('/dashboard#preferences');

        $this->assertFalse($user->refresh()->red_letter_words);
    }
}
