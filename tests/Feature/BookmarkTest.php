<?php

namespace Tests\Feature;

use App\Models\BibleBook;
use App\Models\BibleEdition;
use App\Models\Bookmark;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BookmarkTest extends TestCase
{
    use RefreshDatabase;

    public function test_bookmark_pages_and_mutations_require_authentication(): void
    {
        $this->get('/bookmarks')->assertRedirect('/login');
        $this->post('/bookmarks')->assertRedirect('/login');
    }

    public function test_user_can_create_update_list_and_remove_a_bookmark(): void
    {
        $user = User::factory()->create();
        $book = $this->book();

        $this->actingAs($user)->post('/bookmarks', [
            'bible_book_id' => $book->id,
            'chapter' => '1',
            'verse_start' => '19',
            'verse_end' => '28',
            'title' => 'The preparation',
        ])->assertSessionHasNoErrors();

        $bookmark = Bookmark::query()->firstOrFail();
        $this->assertSame($user->id, $bookmark->user_id);

        $this->actingAs($user)->get('/bookmarks')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('bookmarks')
                ->has('bookmarks', 1)
                ->where('bookmarks.0.reference', 'John 1:19–28')
                ->where('bookmarks.0.readerUrl', "/read/JHN/1?bookmark={$bookmark->id}"));

        $this->actingAs($user)
            ->get("/read/JHN/1?bookmark={$bookmark->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reader')
                ->where('focusedBookmark.id', $bookmark->id)
                ->where('focusedBookmark.title', 'The preparation')
                ->where('focusedBookmark.verseStart', '19')
                ->where('focusedBookmark.verseEnd', '28'));

        $this->actingAs($user)->patch("/bookmarks/{$bookmark->id}", [
            'bible_book_id' => $book->id,
            'chapter' => '1',
            'verse_start' => '19',
            'verse_end' => '30',
            'title' => 'John prepares the way',
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('bookmarks', [
            'id' => $bookmark->id,
            'verse_end' => '30',
            'title' => 'John prepares the way',
        ]);

        $this->actingAs($user)
            ->delete("/bookmarks/{$bookmark->id}")
            ->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('bookmarks', ['id' => $bookmark->id]);
    }

    public function test_exact_duplicate_ranges_are_rejected(): void
    {
        $user = User::factory()->create();
        $book = $this->book();
        Bookmark::query()->create([
            'user_id' => $user->id,
            'bible_book_id' => $book->id,
            'chapter' => '1',
            'verse_start' => '1',
            'verse_end' => '5',
        ]);

        $this->actingAs($user)->post('/bookmarks', [
            'bible_book_id' => $book->id,
            'chapter' => '1',
            'verse_start' => '1',
            'verse_end' => '5',
        ])->assertSessionHasErrors('verse_start');

        $this->assertDatabaseCount('bookmarks', 1);
    }

    public function test_users_cannot_change_another_users_bookmark(): void
    {
        $bookmark = Bookmark::query()->create([
            'user_id' => User::factory()->create()->id,
            'bible_book_id' => $this->book()->id,
            'chapter' => '1',
        ]);

        $this->actingAs(User::factory()->create())
            ->delete("/bookmarks/{$bookmark->id}")
            ->assertNotFound();
    }

    public function test_users_cannot_open_another_users_bookmark_in_focused_reader(): void
    {
        $bookmark = Bookmark::query()->create([
            'user_id' => User::factory()->create()->id,
            'bible_book_id' => $this->book()->id,
            'chapter' => '1',
            'verse_start' => '1',
            'verse_end' => '5',
        ]);

        $this->actingAs(User::factory()->create())
            ->get("/read/JHN/1?bookmark={$bookmark->id}")
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
