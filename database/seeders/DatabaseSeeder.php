<?php

namespace Database\Seeders;

use App\Models\BibleBook;
use App\Models\BibleEdition;
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

        User::query()->firstOrCreate(
            ['email' => 'test@example.com'],
            User::factory()->make([
                'username' => 'testuser',
                'name' => 'Test User',
            ])->getAttributes(),
        );

        $oeb = BibleEdition::query()->updateOrCreate(
            ['slug' => 'oeb'],
            [
                'name' => 'Open English Bible',
                'abbreviation' => 'OEB',
                'language' => 'en',
                'licence' => 'CC0',
                'attribution' => 'Open English Bible',
                'source_format' => 'usfm',
                'variant_profile' => 'oeb',
            ],
        );

        BibleBook::query()->updateOrCreate(
            ['edition_id' => $oeb->id, 'book_code' => 'JHN'],
            [
                'name' => 'John',
                'long_name' => 'The Gospel according to John',
                'source_path' => '/bibles/oeb/43-John.usfm.db',
                'chapter_count' => 21,
                'canon_position' => 43,
            ],
        );

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
