<?php

namespace Tests\Feature;

use App\Models\BibleEdition;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SeoTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_scripture_pages_receive_translation_neutral_canonical_urls(): void
    {
        $this->seedJohn();

        $this->get('/read/JHN/1?translation=oeb')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('canonicalUrl', route('reader.show', ['book' => 'JHN', 'chapter' => '1'])));

        $this->get('/books/JHN')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('canonicalUrl', route('books.show', ['book' => 'JHN'])));
    }

    public function test_sitemap_lists_book_and_chapter_pages_once_across_editions(): void
    {
        $this->seedJohn();
        $this->seedJohn('webp');

        $response = $this->get('/sitemap.xml')->assertOk();

        $response->assertHeader('Content-Type', 'application/xml');
        $this->assertSame(1, substr_count($response->getContent(), '/books/JHN'));
        $this->assertSame(1, substr_count($response->getContent(), '/read/JHN/1'));
        $this->assertSame(1, substr_count($response->getContent(), '/read/JHN/2'));
    }

    private function seedJohn(string $slug = 'oeb'): void
    {
        $edition = BibleEdition::query()->create([
            'slug' => $slug,
            'name' => $slug === 'oeb' ? 'Open English Bible' : 'World English Bible',
            'abbreviation' => strtoupper($slug),
            'language' => 'en',
            'source_format' => 'usfm',
        ]);

        $edition->books()->create([
            'book_code' => 'JHN',
            'name' => 'John',
            'source_path' => "/bibles/{$slug}/43-JHN.usfm",
            'chapter_count' => 2,
            'canon_position' => 43,
        ]);
    }
}
