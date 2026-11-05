<?php

namespace Tests\Feature;

use App\Models\BibleBook;
use App\Models\BibleEdition;
use App\Models\Highlight;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HighlightTest extends TestCase
{
    use RefreshDatabase;

    public function test_highlight_mutations_require_authentication(): void
    {
        $this->get('/highlights')->assertRedirect('/login');
        $this->post('/highlights')->assertRedirect('/login');
    }

    public function test_user_can_view_their_highlights_index(): void
    {
        $user = User::factory()->create();
        $book = $this->book();
        $highlight = Highlight::query()->create([
            'user_id' => $user->id,
            'bible_book_id' => $book->id,
            'chapter' => '1',
            'color' => 'green',
            'selected_text' => 'the Word was with God',
        ]);
        $highlight->segments()->create([
            'verse' => '1',
            'start_offset' => 27,
            'end_offset' => 48,
            'exact_text' => 'the Word was with God',
            'position' => 0,
        ]);

        $this->actingAs($user)
            ->get('/highlights')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('highlights')
                ->has('highlights.data', 1)
                ->where('highlights.total', 1)
                ->where('highlights.currentPage', 1)
                ->where('highlights.data.0.id', $highlight->id)
                ->where('highlights.data.0.color', 'green')
                ->where('highlights.data.0.reference', 'John 1:1')
                ->where('highlights.data.0.readerUrl', '/read/JHN/1')
                ->where('highlights.data.0.edition.abbreviation', 'OEB')
                ->where('colourCounts.green', 1)
                ->where('activeColour', null)
                ->where('highlightLabels.yellow', 'Gold')
                ->where('highlightLabels.rose', 'Red'));
    }

    public function test_highlights_can_be_filtered_by_colour_and_are_paginated(): void
    {
        $user = User::factory()->create();
        $book = $this->book();

        foreach (range(1, 9) as $index) {
            $highlight = Highlight::query()->create([
                'user_id' => $user->id,
                'bible_book_id' => $book->id,
                'chapter' => '1',
                'color' => $index === 9 ? 'rose' : 'yellow',
                'selected_text' => "Highlight {$index}",
            ]);
            $highlight->segments()->create([
                'verse' => (string) $index,
                'start_offset' => 0,
                'end_offset' => 5,
                'exact_text' => 'Words',
                'position' => 0,
            ]);
        }

        $this->actingAs($user)
            ->get('/highlights')
            ->assertInertia(fn (Assert $page) => $page
                ->has('highlights.data', 8)
                ->where('highlights.total', 9)
                ->where('highlights.lastPage', 2)
                ->where('colourCounts.yellow', 8)
                ->where('colourCounts.rose', 1));

        $this->get('/highlights?colour=rose')
            ->assertInertia(fn (Assert $page) => $page
                ->has('highlights.data', 1)
                ->where('highlights.total', 1)
                ->where('highlights.data.0.color', 'rose')
                ->where('activeColour', 'rose')
                ->where('colourCounts.yellow', 8));
    }

    public function test_user_can_personalise_highlight_colour_labels(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from('/dashboard#preferences')
            ->patch(route('highlight-labels.update'), [
                'labels' => [
                    'yellow' => 'Important',
                    'green' => 'Close to my heart',
                    'blue' => 'Study further',
                    'rose' => 'Questions',
                ],
            ])
            ->assertRedirect('/dashboard#preferences')
            ->assertSessionHasNoErrors();

        $this->assertSame([
            'yellow' => 'Important',
            'green' => 'Close to my heart',
            'blue' => 'Study further',
            'rose' => 'Questions',
        ], $user->refresh()->highlight_colour_labels);

        $this->actingAs($user)
            ->get('/highlights')
            ->assertInertia(fn (Assert $page) => $page
                ->where('highlightLabels.green', 'Close to my heart')
                ->where('highlightLabels.rose', 'Questions'));
    }

    public function test_user_can_create_recolour_and_remove_a_partial_multi_verse_highlight(): void
    {
        $user = User::factory()->create();
        $book = $this->book();

        $this->actingAs($user)->post('/highlights', [
            'bible_book_id' => $book->id,
            'chapter' => '1',
            'color' => 'yellow',
            'selected_text' => 'the Word was with God … He was in the beginning',
            'segments' => [
                [
                    'verse' => '1',
                    'start_offset' => 27,
                    'end_offset' => 48,
                    'exact_text' => 'the Word was with God',
                    'prefix' => 'and ',
                    'suffix' => '; and',
                ],
                [
                    'verse' => '2',
                    'start_offset' => 0,
                    'end_offset' => 27,
                    'exact_text' => 'He was in the beginning',
                    'prefix' => null,
                    'suffix' => ' with God',
                ],
            ],
        ])->assertSessionHasNoErrors();

        $highlight = Highlight::query()->firstOrFail();
        $this->assertSame($user->id, $highlight->user_id);
        $this->assertCount(2, $highlight->segments);

        $this->actingAs($user)
            ->get('/read/JHN/1')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reader')
                ->has('highlights', 1)
                ->where('highlights.0.id', $highlight->id)
                ->where('highlights.0.color', 'yellow')
                ->where('highlights.0.segments.0.verse', '1')
                ->where('highlights.0.segments.1.verse', '2'));

        $this->actingAs($user)
            ->patch("/highlights/{$highlight->id}", ['color' => 'blue'])
            ->assertSessionHasNoErrors();
        $this->assertDatabaseHas('highlights', [
            'id' => $highlight->id,
            'color' => 'blue',
        ]);

        $this->actingAs($user)
            ->delete("/highlights/{$highlight->id}")
            ->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('highlights', ['id' => $highlight->id]);
        $this->assertDatabaseCount('highlight_segments', 0);
    }

    public function test_users_cannot_change_another_users_highlight(): void
    {
        $highlight = Highlight::query()->create([
            'user_id' => User::factory()->create()->id,
            'bible_book_id' => $this->book()->id,
            'chapter' => '1',
            'color' => 'rose',
            'selected_text' => 'the Word',
        ]);

        $this->actingAs(User::factory()->create())
            ->delete("/highlights/{$highlight->id}")
            ->assertNotFound();
    }

    private function book(): BibleBook
    {
        $edition = BibleEdition::query()->create([
            'slug' => 'oeb',
            'name' => 'Open English Bible',
            'abbreviation' => 'OEB',
            'language' => 'en',
            'source_format' => 'usfm',
        ]);

        return BibleBook::query()->create([
            'edition_id' => $edition->id,
            'book_code' => 'JHN',
            'name' => 'John',
            'source_path' => '/bibles/oeb/43-John.usfm.db',
            'chapter_count' => 21,
        ]);
    }
}
