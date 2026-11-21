<?php

namespace Tests\Feature;

use App\Models\BibleEdition;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScriptureChapterDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_compiled_chapter_is_served_through_the_versioned_api(): void
    {
        $edition = BibleEdition::query()->create([
            'slug' => 'oeb', 'name' => 'Open English Bible', 'abbreviation' => 'OEB',
            'language' => 'en', 'source_format' => 'usfm', 'variant_profile' => 'oeb',
        ]);
        $edition->books()->create([
            'book_code' => 'JHN', 'name' => 'John',
            'source_path' => '/bibles/oeb/43-John.usfm.db', 'chapter_count' => 21,
        ]);

        $response = $this->get('/api/v1/editions/oeb/books/JHN/chapters/1');

        $response->assertOk()
            ->assertHeader('Content-Type', 'application/json; charset=UTF-8')
            ->assertHeader('Content-Encoding', 'gzip');
        $decoded = gzdecode($response->getContent());
        $this->assertIsString($decoded);
        $payload = json_decode($decoded, true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame('open-bible-scripture-chapter', $payload['schema']);
        $this->assertSame('1.0.0', $payload['schemaVersion']);
        $this->assertSame('JHN', $payload['book']);
        $this->assertSame('1', $payload['chapter']);
        $this->assertSame('bible-ast', $payload['document']['schema']);
        $this->assertNotEmpty($payload['document']['indexes']['verses']);
    }

    public function test_unknown_or_out_of_range_chapters_are_not_exposed(): void
    {
        $this->get('/api/v1/editions/oeb/books/JHN/chapters/999')->assertNotFound();
    }
}
