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
            'role' => 'hero',
        ]);

        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reader')
                ->where('artwork.id', $artwork->id)
                ->where('artwork.reference.book', 'JHN')
                ->where('artwork.role', 'hero')
                ->where('artwork.focalPoint.x', 66)
                ->where('artwork.focalPoint.y', 42));
    }
}
