<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReaderNavigationTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_placeholder_is_available(): void
    {
        $this->get(route('search'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('search'));
    }

    public function test_john_overview_placeholder_is_available(): void
    {
        $this->get(route('books.john'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('book-overview'));
    }
}
