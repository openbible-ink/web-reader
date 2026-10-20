<?php

namespace App\Http\Controllers;

use App\Models\BibleBook;
use App\Models\Note;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class NoteController extends Controller
{
    public function index(Request $request): Response
    {
        $notes = $request->user()->notes()
            ->with(['book.edition', 'segments'])
            ->latest('updated_at')
            ->get()
            ->map(fn (Note $note) => $this->serialize($note));

        return Inertia::render('notes', ['notes' => $notes]);
    }

    public function show(Request $request, Note $note): Response
    {
        $this->authorizeOwner($request, $note);
        $note->load(['book.edition', 'segments']);

        /** @var BibleBook $book */
        $book = $note->book;

        return Inertia::render('note-show', [
            'note' => [
                'id' => $note->id,
                'title' => $note->title,
                'bodyMarkdown' => $note->body_markdown,
                'anchorType' => $note->anchor_type,
                'selectedText' => $note->selected_text,
                'sectionTitle' => $note->section_title,
                'verseStart' => $note->verse_start,
                'verseEnd' => $note->verse_end,
                'chapter' => $note->chapter,
                'reference' => $this->reference($book->name, $note),
                'attachmentLabel' => $note->section_title ?: $this->reference($book->name, $note),
                'updatedAt' => $note->updated_at?->toISOString(),
            ],
            'edition' => [
                'slug' => $book->edition->slug,
                'name' => $book->edition->name,
                'abbreviation' => $book->edition->abbreviation,
                'language' => $book->edition->language,
                'variantProfile' => $book->edition->variant_profile,
            ],
            'book' => [
                'code' => $book->book_code,
                'name' => $book->name,
                'sourceUrl' => asset($book->source_path),
            ],
            'readerUrl' => route('reader.show', [
                'edition' => $book->edition->slug,
                'book' => $book->book_code,
                'chapter' => $note->chapter,
            ], absolute: false),
            'editUrl' => route('reader.show', [
                'edition' => $book->edition->slug,
                'book' => $book->book_code,
                'chapter' => $note->chapter,
                'note' => $note->id,
                'fullscreen' => 1,
            ], absolute: false),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        DB::transaction(function () use ($request, $data): void {
            $note = $request->user()->notes()->create($this->attributes($data));
            $this->replaceSegments($note, $data['segments'] ?? []);
        });

        return back();
    }

    public function update(Request $request, Note $note): RedirectResponse
    {
        $this->authorizeOwner($request, $note);
        $data = $this->validated($request);

        DB::transaction(function () use ($note, $data): void {
            $note->update($this->attributes($data));
            $this->replaceSegments($note, $data['segments'] ?? []);
        });

        return back();
    }

    public function destroy(Request $request, Note $note): RedirectResponse
    {
        $this->authorizeOwner($request, $note);
        $note->delete();

        return back();
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        return $request->validate([
            'bible_book_id' => ['required', 'uuid', 'exists:bible_books,id'],
            'chapter' => ['required', 'string', 'max:16'],
            'anchor_type' => ['required', Rule::in(['verse', 'range', 'section', 'selection'])],
            'title' => ['required', 'string', 'max:180'],
            'body_markdown' => ['required', 'string', 'max:100000'],
            'selected_text' => ['nullable', 'string', 'max:20000'],
            'section_key' => ['nullable', 'string', 'max:255'],
            'section_title' => ['nullable', 'string', 'max:255'],
            'verse_start' => ['nullable', 'required_if:anchor_type,range', 'string', 'max:16'],
            'verse_end' => ['nullable', 'required_if:anchor_type,range', 'string', 'max:16'],
            'segments' => ['array', 'max:200'],
            'segments.*.verse' => ['required', 'string', 'max:16'],
            'segments.*.start_offset' => ['required', 'integer', 'min:0'],
            'segments.*.end_offset' => ['required', 'integer', 'gt:segments.*.start_offset'],
            'segments.*.exact_text' => ['required', 'string', 'max:10000'],
            'segments.*.prefix' => ['nullable', 'string', 'max:64'],
            'segments.*.suffix' => ['nullable', 'string', 'max:64'],
        ]);
    }

    /** @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function attributes(array $data): array
    {
        return collect($data)->except('segments')->all();
    }

    /** @param array<int, array<string, mixed>> $segments */
    private function replaceSegments(Note $note, array $segments): void
    {
        $note->segments()->delete();
        $note->segments()->createMany(collect($segments)->map(
            fn (array $segment, int $position) => [
                ...$segment,
                'prefix' => filled($segment['prefix'] ?? null) ? $segment['prefix'] : null,
                'suffix' => filled($segment['suffix'] ?? null) ? $segment['suffix'] : null,
                'position' => $position,
            ],
        )->all());
    }

    private function authorizeOwner(Request $request, Note $note): void
    {
        abort_unless($note->user_id === $request->user()->id, 404);
    }

    /** @return array<string, mixed> */
    private function serialize(Note $note): array
    {
        /** @var BibleBook $book */
        $book = $note->book;

        return [
            'id' => $note->id,
            'title' => $note->title,
            'bodyMarkdown' => $note->body_markdown,
            'anchorType' => $note->anchor_type,
            'selectedText' => $note->selected_text,
            'reference' => $this->reference($book->name, $note),
            'edition' => [
                'name' => $book->edition->name,
                'abbreviation' => $book->edition->abbreviation,
            ],
            'readerUrl' => route('reader.show', [
                'edition' => $book->edition->slug,
                'book' => $book->book_code,
                'chapter' => $note->chapter,
            ], absolute: false),
            'noteUrl' => route('notes.show', $note, absolute: false),
            'editUrl' => route('reader.show', [
                'edition' => $book->edition->slug,
                'book' => $book->book_code,
                'chapter' => $note->chapter,
                'note' => $note->id,
                'fullscreen' => 1,
            ], absolute: false),
            'updatedAt' => $note->updated_at?->toISOString(),
        ];
    }

    private function reference(string $bookName, Note $note): string
    {
        if (! $note->verse_start) {
            return "{$bookName} {$note->chapter}";
        }

        $verses = $note->verse_start === $note->verse_end || ! $note->verse_end
            ? $note->verse_start
            : "{$note->verse_start}–{$note->verse_end}";

        return "{$bookName} {$note->chapter}:{$verses}";
    }
}
