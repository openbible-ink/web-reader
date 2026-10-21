<?php

namespace Tests\Feature;

use App\Models\BibleBook;
use App\Models\BibleEdition;
use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class NoteTest extends TestCase
{
    use RefreshDatabase;

    public function test_note_routes_require_authentication(): void
    {
        $this->get('/notes')->assertRedirect('/login');
        $this->post('/notes')->assertRedirect('/login');
    }

    public function test_user_can_create_edit_view_and_delete_a_selection_note(): void
    {
        $user = User::factory()->create();
        $book = $this->book();
        $payload = [
            'bible_book_id' => $book->id,
            'chapter' => '1',
            'anchor_type' => 'selection',
            'title' => 'The Word and creation',
            'body_markdown' => "## Observation\n\nThe opening echoes **Genesis**.",
            'selected_text' => 'In the beginning was the Word',
            'verse_start' => '1',
            'verse_end' => '1',
            'segments' => [[
                'verse' => '1',
                'start_offset' => 0,
                'end_offset' => 29,
                'exact_text' => 'In the beginning was the Word',
                'prefix' => null,
                'suffix' => ', and',
            ]],
        ];

        $this->actingAs($user)->post('/notes', $payload)->assertSessionHasNoErrors();
        $note = Note::query()->firstOrFail();
        $this->assertCount(1, $note->segments);

        $this->actingAs($user)->get("/notes/{$note->id}")->assertOk()->assertInertia(
            fn (Assert $page) => $page
                ->component('note-show')
                ->where('note.title', 'The Word and creation')
                ->where('note.reference', 'John 1:1')
                ->where('note.bodyMarkdown', $payload['body_markdown'])
                ->where('edition.abbreviation', 'OEB')
                ->where('book.code', 'JHN')
                ->where('readerUrl', '/read/JHN/1')
                ->where('editUrl', "/read/JHN/1?note={$note->id}&fullscreen=1"),
        );

        $this->actingAs($user)->get('/notes')->assertOk()->assertInertia(
            fn (Assert $page) => $page
                ->component('notes')
                ->has('notes', 1)
                ->where('notes.0.title', 'The Word and creation')
                ->where('notes.0.reference', 'John 1:1')
                ->where('notes.0.noteUrl', "/notes/{$note->id}")
                ->where('notes.0.editUrl', "/read/JHN/1?note={$note->id}&fullscreen=1"),
        );

        $this->actingAs($user)->get("/read/JHN/1?note={$note->id}")->assertOk()->assertInertia(
            fn (Assert $page) => $page
                ->component('reader')
                ->where('focusedNoteId', $note->id)
                ->where('focusedNoteExpanded', false)
                ->where('notes.0.bodyMarkdown', $payload['body_markdown'])
                ->where('notes.0.segments.0.verse', '1'),
        );

        $this->actingAs($user)->get("/read/JHN/1?note={$note->id}&fullscreen=1")->assertOk()->assertInertia(
            fn (Assert $page) => $page
                ->where('focusedNoteId', $note->id)
                ->where('focusedNoteExpanded', true),
        );

        $payload['title'] = 'Creation and the Word';
        $this->actingAs($user)->patch("/notes/{$note->id}", $payload)->assertSessionHasNoErrors();
        $this->assertDatabaseHas('notes', ['id' => $note->id, 'title' => 'Creation and the Word']);

        $this->actingAs($user)->delete("/notes/{$note->id}")->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('notes', ['id' => $note->id]);
        $this->assertDatabaseCount('note_segments', 0);
    }

    public function test_users_cannot_change_another_users_note(): void
    {
        $note = Note::query()->create([
            'user_id' => User::factory()->create()->id,
            'bible_book_id' => $this->book()->id,
            'chapter' => '1',
            'anchor_type' => 'verse',
            'title' => 'Private note',
            'body_markdown' => 'Private thoughts.',
            'verse_start' => '1',
            'verse_end' => '1',
        ]);

        $this->actingAs(User::factory()->create())->delete("/notes/{$note->id}")->assertNotFound();
        $this->actingAs(User::factory()->create())->get("/notes/{$note->id}")->assertNotFound();
    }

    public function test_user_can_create_a_verse_range_note(): void
    {
        $user = User::factory()->create();
        $book = $this->book();

        $this->actingAs($user)->post('/notes', [
            'bible_book_id' => $book->id,
            'chapter' => '4',
            'anchor_type' => 'range',
            'title' => 'John 4:7–10',
            'body_markdown' => 'A note spanning several verses.',
            'verse_start' => '7',
            'verse_end' => '10',
            'segments' => [],
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('notes', [
            'user_id' => $user->id,
            'anchor_type' => 'range',
            'verse_start' => '7',
            'verse_end' => '10',
        ]);

        $this->actingAs($user)->get('/notes')->assertOk()->assertInertia(
            fn (Assert $page) => $page
                ->where('notes.0.reference', 'John 4:7–10'),
        );
    }

    public function test_note_index_provides_books_for_structured_note_creation(): void
    {
        $user = User::factory()->create();
        $book = $this->book();

        $this->actingAs($user)->get('/notes')->assertOk()->assertInertia(
            fn (Assert $page) => $page
                ->has('books', 1)
                ->where('books.0.id', $book->id)
                ->where('books.0.code', 'JHN')
                ->where('books.0.chapterCount', 21)
                ->where('books.0.edition.abbreviation', 'OEB'),
        );
    }

    public function test_note_range_end_cannot_precede_its_start(): void
    {
        $user = User::factory()->create();
        $book = $this->book();

        $this->actingAs($user)->post('/notes', [
            'bible_book_id' => $book->id,
            'chapter' => '4',
            'anchor_type' => 'range',
            'title' => 'Invalid range',
            'body_markdown' => 'This should not be saved.',
            'verse_start' => '10',
            'verse_end' => '7',
            'segments' => [],
        ])->assertSessionHasErrors('verse_end');

        $this->assertDatabaseCount('notes', 0);
    }

    public function test_user_can_create_a_note_spanning_chapters(): void
    {
        $user = User::factory()->create();
        $book = $this->book();

        $this->actingAs($user)->post('/notes', [
            'bible_book_id' => $book->id,
            'chapter' => '1',
            'chapter_end' => '2',
            'anchor_type' => 'range',
            'title' => 'John 1:18–2:4',
            'body_markdown' => 'A note spanning a chapter boundary.',
            'verse_start' => '18',
            'verse_end' => '4',
            'segments' => [],
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('notes', [
            'chapter' => '1',
            'chapter_end' => '2',
            'verse_start' => '18',
            'verse_end' => '4',
        ]);

        $this->actingAs($user)->get('/notes')->assertOk()->assertInertia(
            fn (Assert $page) => $page
                ->where('notes.0.reference', 'John 1:18–2:4'),
        );
    }

    private function book(): BibleBook
    {
        $edition = BibleEdition::query()->create([
            'slug' => 'oeb', 'name' => 'Open English Bible', 'abbreviation' => 'OEB',
            'language' => 'en', 'source_format' => 'usfm',
        ]);

        return BibleBook::query()->create([
            'edition_id' => $edition->id, 'book_code' => 'JHN', 'name' => 'John',
            'source_path' => '/bibles/oeb/43-John.usfm.db', 'chapter_count' => 21,
        ]);
    }
}
