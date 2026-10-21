<?php

namespace Database\Seeders;

use App\Models\ScriptureArtwork;
use App\Models\User;
use App\Services\OebLibrary;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(OebLibrary $oebLibrary): void
    {
        // User::factory(10)->create();

        User::query()->firstOrCreate(
            ['email' => 'test@example.com'],
            User::factory()->make([
                'username' => 'testuser',
                'name' => 'Test User',
            ])->getAttributes(),
        );

        $oebLibrary->import(public_path('bibles/oeb'));

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
                'role' => 'hero',
                'sort_order' => 0,
            ],
            [
                'edition_id' => null,
                'versification' => 'nrsv',
                'chapter' => '1',
                'verse_start' => null,
                'verse_end' => null,
            ],
        );
    }
}
