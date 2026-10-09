<?php

namespace Tests\Feature;

use App\Models\ScriptureArtwork;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ScriptureArtworkTest extends TestCase
{
    use RefreshDatabase;

    public function test_artwork_can_be_attached_to_a_passage_and_sent_to_the_reader(): void
    {
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

        $this->get(route('home'))
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
        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reader')
                ->has('artworks', 0));
    }
}
