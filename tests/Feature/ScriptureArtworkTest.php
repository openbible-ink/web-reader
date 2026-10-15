<?php

namespace Tests\Feature;

use App\Models\BibleBook;
use App\Models\BibleEdition;
use App\Models\ScriptureArtwork;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ScriptureArtworkTest extends TestCase
{
    use RefreshDatabase;

    public function test_artwork_can_be_attached_to_a_passage_and_sent_to_the_reader(): void
    {
        [$edition, $book] = $this->john();
        $artwork = ScriptureArtwork::query()->create([
            'image_path' => '/images/scripture/john-olive-branch.png',
            'title' => 'Vintage Olive Branch Botanical Study',
            'alt_text' => 'A vintage botanical study of an olive branch.',
            'approach' => 'symbolic',
            'focal_point_x' => 66,
            'focal_point_y' => 42,
        ]);

        $artwork->passages()->create([
            'book_code' => 'JHN',
            'chapter' => '1',
            'role' => 'hero',
        ]);

        $this->get(route('reader.show', [$edition, $book, '1']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reader')
                ->has('artworks', 1)
                ->where('artworks.0.id', $artwork->id)
                ->where('artworks.0.reference.book', 'JHN')
                ->where('artworks.0.reference.chapter', '1')
                ->where('artworks.0.role', 'hero')
                ->where('artworks.0.focalPoint.x', 66)
                ->where('artworks.0.focalPoint.y', 42));
    }

    public function test_reader_has_no_artwork_fallback_when_no_placement_matches(): void
    {
        [$edition, $book] = $this->john();

        $this->get(route('reader.show', [$edition, $book, '1']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reader')
                ->has('artworks', 0));
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
            'source_path' => '/bibles/oeb/43-John.usfm.db', 'chapter_count' => 21,
        ]);

        return [$edition, $book];
    }
}
