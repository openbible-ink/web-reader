<?php

namespace Tests\Feature;

use App\Models\BibleBook;
use App\Models\BibleEdition;
use App\Models\Bookmark;
use App\Models\Highlight;
use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();
    }

    public function test_dashboard_shows_the_users_recent_bookmarks(): void
    {
        $user = User::factory()->create();
        $edition = BibleEdition::query()->create([
            'slug' => 'oeb',
            'name' => 'Open English Bible',
            'abbreviation' => 'OEB',
            'language' => 'en',
            'source_format' => 'usfm',
        ]);
        $book = BibleBook::query()->create([
            'edition_id' => $edition->id,
            'book_code' => 'JHN',
            'name' => 'John',
            'source_path' => '/bibles/oeb/43-John.usfm.db',
            'chapter_count' => 21,
        ]);
        $bookmark = Bookmark::query()->create([
            'user_id' => $user->id,
            'bible_book_id' => $book->id,
            'chapter' => '1',
            'verse_start' => '35',
            'verse_end' => '51',
            'title' => 'Calling the disciples',
        ]);
        $highlight = Highlight::query()->create([
            'user_id' => $user->id,
            'bible_book_id' => $book->id,
            'chapter' => '1',
            'color' => 'green',
            'selected_text' => 'Follow me',
        ]);
        $highlight->segments()->create([
            'verse' => '43',
            'start_offset' => 53,
            'end_offset' => 62,
            'exact_text' => 'Follow me',
            'position' => 0,
        ]);
        $note = Note::query()->create([
            'user_id' => $user->id,
            'bible_book_id' => $book->id,
            'chapter' => '1',
            'anchor_type' => 'verse',
            'title' => 'Following Jesus',
            'body_markdown' => 'A short reflection on discipleship.',
            'verse_start' => '43',
            'verse_end' => '43',
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard')
                ->where('bookmarkCount', 1)
                ->where('highlightCount', 1)
                ->where('noteCount', 1)
                ->has('notes', 1)
                ->where('notes.0.title', 'Following Jesus')
                ->where('notes.0.reference', 'John 1:43')
                ->where('notes.0.readerUrl', "/read/oeb/JHN/1?note={$note->id}")
                ->has('highlights', 1)
                ->where('highlights.0.selectedText', 'Follow me')
                ->where('highlights.0.color', 'green')
                ->where('highlights.0.reference', 'John 1:43')
                ->where('highlights.0.readerUrl', '/read/oeb/JHN/1')
                ->has('bookmarks', 1)
                ->where('bookmarks.0.title', 'Calling the disciples')
                ->where('bookmarks.0.reference', 'John 1:35–51')
                ->where('bookmarks.0.readerUrl', "/read/oeb/JHN/1?bookmark={$bookmark->id}"));
    }
}
