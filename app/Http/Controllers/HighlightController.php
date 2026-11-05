<?php

namespace App\Http\Controllers;

use App\Models\BibleBook;
use App\Models\Highlight;
use App\Support\HighlightLabels;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class HighlightController extends Controller
{
    public function index(Request $request): Response
    {
        $colours = ['yellow', 'green', 'blue', 'rose'];
        $requestedColour = $request->string('colour')->toString();
        $activeColour = in_array($requestedColour, $colours, true)
            ? $requestedColour
            : null;

        $baseQuery = $request->user()->highlights();
        $colourCounts = array_fill_keys($colours, 0);
        foreach ((clone $baseQuery)
            ->selectRaw('color, count(*) as aggregate')
            ->groupBy('color')
            ->pluck('aggregate', 'color') as $colour => $count) {
            if (array_key_exists($colour, $colourCounts)) {
                $colourCounts[$colour] = (int) $count;
            }
        }

        $highlights = $baseQuery
            ->with(['book.edition', 'segments'])
            ->when($activeColour, fn ($query) => $query->where('color', $activeColour))
            ->latest()
            ->paginate(8)
            ->withQueryString()
            ->through(fn (Highlight $highlight) => $this->serialize($highlight));

        return Inertia::render('highlights', [
            'highlights' => [
                'data' => $highlights->items(),
                'currentPage' => $highlights->currentPage(),
                'lastPage' => $highlights->lastPage(),
                'perPage' => $highlights->perPage(),
                'total' => $highlights->total(),
                'from' => $highlights->firstItem(),
                'to' => $highlights->lastItem(),
            ],
            'highlightLabels' => HighlightLabels::forUser($request->user()),
            'colourCounts' => $colourCounts,
            'activeColour' => $activeColour,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        DB::transaction(function () use ($request, $data): void {
            $bookCode = BibleBook::query()->whereKey($data['bible_book_id'])->value('book_code');
            abort_unless(is_string($bookCode), 404);
            $highlight = $request->user()->highlights()->create([
                'bible_book_id' => $data['bible_book_id'],
                'book_code' => $bookCode,
                'chapter' => $data['chapter'],
                'anchor_type' => 'selection',
                'color' => $data['color'],
                'selected_text' => $data['selected_text'],
            ]);

            /** @var array<int, array<string, mixed>> $segments */
            $segments = $data['segments'];
            $highlight->segments()->createMany(
                collect($segments)->map(fn (array $segment, int $position) => [
                    ...$segment,
                    'prefix' => filled($segment['prefix'] ?? null) ? $segment['prefix'] : null,
                    'suffix' => filled($segment['suffix'] ?? null) ? $segment['suffix'] : null,
                    'position' => $position,
                ])->all(),
            );
        });

        return back();
    }

    public function update(Request $request, Highlight $highlight): RedirectResponse
    {
        $this->authorizeOwner($request, $highlight);
        $data = $request->validate([
            'color' => ['required', Rule::in(['yellow', 'green', 'blue', 'rose'])],
        ]);
        $highlight->update($data);

        return back();
    }

    public function destroy(Request $request, Highlight $highlight): RedirectResponse
    {
        $this->authorizeOwner($request, $highlight);
        $highlight->delete();

        return back();
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        return $request->validate([
            'bible_book_id' => ['required', 'uuid', 'exists:bible_books,id'],
            'chapter' => ['required', 'string', 'max:16'],
            'color' => ['required', Rule::in(['yellow', 'green', 'blue', 'rose'])],
            'selected_text' => ['required', 'string', 'max:20000'],
            'segments' => ['required', 'array', 'min:1', 'max:200'],
            'segments.*.verse' => ['required', 'string', 'max:16'],
            'segments.*.start_offset' => ['required', 'integer', 'min:0'],
            'segments.*.end_offset' => ['required', 'integer', 'gt:segments.*.start_offset'],
            'segments.*.exact_text' => ['required', 'string', 'max:10000'],
            'segments.*.prefix' => ['nullable', 'string', 'max:64'],
            'segments.*.suffix' => ['nullable', 'string', 'max:64'],
        ]);
    }

    private function authorizeOwner(Request $request, Highlight $highlight): void
    {
        abort_unless($highlight->user_id === $request->user()->id, 404);
    }

    /** @return array<string, mixed> */
    private function serialize(Highlight $highlight): array
    {
        /** @var BibleBook $book */
        $book = $highlight->book;
        $firstVerse = $highlight->segments->first()?->verse;
        $lastVerse = $highlight->segments->last()?->verse;
        $verses = $firstVerse === $lastVerse ? $firstVerse : "{$firstVerse}–{$lastVerse}";

        return [
            'id' => $highlight->id,
            'color' => $highlight->color,
            'selectedText' => $highlight->selected_text,
            'reference' => "{$book->name} {$highlight->chapter}:{$verses}",
            'edition' => [
                'name' => $book->edition->name,
                'abbreviation' => $book->edition->abbreviation,
            ],
            'readerUrl' => route('reader.show', [
                'book' => $book->book_code,
                'chapter' => $highlight->chapter,
            ], absolute: false),
            'createdAt' => $highlight->created_at?->toISOString(),
        ];
    }
}
