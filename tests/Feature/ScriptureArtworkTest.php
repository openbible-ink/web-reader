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

        $this->get(route('reader.show', ['book' => 'JHN', 'chapter' => '1']))
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

        $this->get(route('reader.show', ['book' => 'JHN', 'chapter' => '1']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reader')
                ->has('artworks', 0));
    }

    public function test_section_artwork_and_section_target_are_sent_to_the_reader(): void
    {
        [$edition, $book] = $this->john();
        $artwork = ScriptureArtwork::query()->create([
            'image_path' => '/images/scripture/preparation.png',
            'title' => 'The Preparation',
            'alt_text' => 'Artwork for the preparation section.',
            'approach' => 'narrative',
        ]);
        $artwork->passages()->create([
            'edition_id' => $edition->id,
            'book_code' => 'JHN',
            'chapter' => '1',
            'section_key' => 'n_000105',
            'verse_start' => '19',
            'verse_end' => '34',
            'role' => 'hero',
        ]);

        $this->get(route('reader.show', ['book' => 'JHN', 'chapter' => '1', 'section' => 'the-preparation']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('focusedSectionKey', 'the-preparation')
                ->where('artworks.0.reference.sectionKey', 'n_000105')
                ->where('artworks.0.reference.verseStart', '19')
                ->where('artworks.0.reference.verseEnd', '34'));
    }

    public function test_section_artwork_requires_an_edition_and_canonical_range(): void
    {
        [$edition, $book] = $this->john();
        $artwork = ScriptureArtwork::query()->create([
            'image_path' => '/images/scripture/preparation.png',
            'title' => 'The Preparation',
            'alt_text' => 'Artwork for the preparation section.',
            'approach' => 'narrative',
        ]);

        $this->expectException(\LogicException::class);
        $this->expectExceptionMessage('Section artwork must belong to a specific Bible edition.');

        $artwork->passages()->create([
            'book_code' => 'JHN',
            'chapter' => '1',
            'section_key' => 'n_000105',
            'verse_start' => '19',
            'verse_end' => '34',
            'role' => 'hero',
        ]);
    }

    public function test_section_artwork_is_only_sent_to_its_edition_while_canonical_artwork_crosses_editions(): void
    {
        [$oeb, $oebJohn] = $this->john();
        $other = BibleEdition::query()->create([
            'slug' => 'other', 'name' => 'Other Translation', 'abbreviation' => 'OTH',
            'language' => 'en', 'source_format' => 'usfm', 'variant_profile' => 'other',
        ]);
        $other->books()->create([
            'book_code' => 'JHN', 'name' => 'John',
            'source_path' => '/bibles/other/43-John.usfm.db', 'chapter_count' => 21,
        ]);

        $sectionArtwork = ScriptureArtwork::query()->create([
            'image_path' => '/images/scripture/oeb-preparation.png',
            'title' => 'OEB Preparation',
            'alt_text' => 'Artwork for the OEB preparation section.',
            'approach' => 'narrative',
        ]);
        $sectionArtwork->passages()->create([
            'edition_id' => $oeb->id,
            'book_code' => 'JHN',
            'chapter' => '1',
            'section_key' => 'n_000105',
            'verse_start' => '19',
            'verse_end' => '34',
            'role' => 'hero',
        ]);

        $canonicalArtwork = ScriptureArtwork::query()->create([
            'image_path' => '/images/scripture/john-range.png',
            'title' => 'John 1:19–34',
            'alt_text' => 'Artwork for John 1:19–34.',
            'approach' => 'narrative',
        ]);
        $canonicalArtwork->passages()->create([
            'book_code' => 'JHN',
            'chapter' => '1',
            'verse_start' => '19',
            'verse_end' => '34',
            'role' => 'hero',
        ]);

        $this->get('/read/JHN/1?translation=oeb')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('artworks', 2)
                ->where('artworks.0.id', $sectionArtwork->id)
                ->where('artworks.1.id', $canonicalArtwork->id));

        $this->get('/read/JHN/1?translation=other')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('artworks', 1)
                ->where('artworks.0.id', $canonicalArtwork->id));
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
