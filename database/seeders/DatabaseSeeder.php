<?php

namespace Database\Seeders;

use App\Models\ScriptureArtwork;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $johnArtwork = ScriptureArtwork::query()->updateOrCreate(
            ['image_path' => '/images/scripture/john-olive-branch.png'],
            [
                'title' => 'Vintage Olive Branch Botanical Study',
                'alt_text' => 'A vintage botanical study of an olive branch with dark green leaves and ripe olives on aged parchment.',
                'caption' => 'Olive branch botanical study for the Gospel according to John.',
                'approach' => 'symbolic',
                'attribution' => null,
                'license' => null,
                'source_url' => null,
                'focal_point_x' => 66,
                'focal_point_y' => 42,
            ],
        );

        $johnArtwork->passages()->updateOrCreate(
            [
                'book_code' => 'JHN',
                'chapter' => null,
                'verse_start' => null,
                'verse_end' => null,
                'role' => 'hero',
            ],
            ['sort_order' => 0],
        );
    }
}
