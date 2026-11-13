<?php

namespace App\Http\Controllers;

use App\Models\BibleBook;
use App\Models\BibleEdition;
use App\Models\ScriptureSearchVerse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SearchController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $query = Str::of($request->string('q')->toString())->squish()->limit(160, '')->toString();
        $edition = $this->edition($request);
        $bookCode = strtoupper($request->string('book')->limit(12)->toString());
        $reference = $query !== '' ? $this->reference($query, $edition) : null;
        $results = null;

        if ($query !== '' && $reference === null) {
            $terms = collect(preg_split('/\s+/u', Str::lower($query)) ?: [])
                ->filter(fn (string $term) => mb_strlen($term) >= 2)
                ->unique()
                ->take(8);
            if ($terms->isEmpty()) {
                $terms = collect([Str::lower($query)]);
            }

            $results = ScriptureSearchVerse::query()
                ->where('edition_id', $edition->id)
                ->when($bookCode !== '', fn (Builder $builder) => $builder->where('book_code', $bookCode))
                ->when($terms->isNotEmpty(), function (Builder $builder) use ($terms): void {
                    foreach ($terms as $term) {
                        $builder->whereRaw('lower(text) like ?', ['%'.$this->escapeLike($term).'%']);
                    }
                })
                ->orderByRaw('case when lower(text) like ? then 0 else 1 end', ['%'.$this->escapeLike(Str::lower($query)).'%'])
                ->orderBy('canon_position')
                ->orderByRaw('cast(chapter as integer)')
                ->orderBy('verse')
                ->paginate(12)
                ->withQueryString()
                ->through(fn (ScriptureSearchVerse $verse) => [
                    'id' => $verse->id,
                    'bookCode' => $verse->book_code,
                    'bookName' => $verse->book_name,
                    'chapter' => $verse->chapter,
                    'verse' => $verse->verse,
                    'sectionTitle' => $verse->section_title,
                    'text' => $verse->text,
                    'url' => route('reader.show', [
                        'book' => $verse->book_code,
                        'chapter' => $verse->chapter,
                        'translation' => $edition->slug,
                    ], false).'#verse-'.$verse->verse,
                ]);
        }

        return Inertia::render('search', [
            'query' => $query,
            'edition' => [
                'slug' => $edition->slug,
                'name' => $edition->name,
                'abbreviation' => $edition->abbreviation,
            ],
            'editions' => BibleEdition::query()->whereHas('books')->orderBy('name')->get(['slug', 'name', 'abbreviation']),
            'books' => $edition->books()->orderBy('canon_position')->get(['book_code', 'name'])->map(fn (BibleBook $book) => [
                'code' => $book->book_code,
                'name' => $book->name,
            ]),
            'selectedBook' => $bookCode,
            'reference' => $reference,
            'results' => $results,
            'indexReady' => ScriptureSearchVerse::query()->where('edition_id', $edition->id)->exists(),
        ]);
    }

    private function edition(Request $request): BibleEdition
    {
        $requested = $request->string('translation')->limit(48)->toString();
        if ($requested !== '') {
            $edition = BibleEdition::query()->where('slug', $requested)->whereHas('books')->first();
            if ($edition) {
                return $edition;
            }
        }

        return $request->user()?->preferredEdition
            ?? BibleEdition::query()->where('slug', 'oeb')->firstOrFail();
    }

    /** @return array<string, mixed>|null */
    private function reference(string $query, BibleEdition $edition): ?array
    {
        if (! preg_match('/^(.+?)\s+(\d{1,3})(?:\s*:\s*(\d{1,3}[a-z]?)(?:\s*[-–—]\s*(\d{1,3}[a-z]?))?)?$/iu', $query, $match)) {
            return null;
        }

        $needle = Str::of($match[1])->lower()->replaceMatches('/[^a-z0-9]+/u', '')->toString();
        $book = $edition->books()->get()->first(function (BibleBook $book) use ($needle): bool {
            $names = [$book->book_code, $book->name, $book->long_name];

            return collect($names)->filter()->contains(fn (string $name) => Str::of($name)->lower()->replaceMatches('/[^a-z0-9]+/u', '')->toString() === $needle)
                || $this->commonAlias($needle) === $book->book_code;
        });
        if (! $book || (int) $match[2] < 1 || (int) $match[2] > $book->chapter_count) {
            return null;
        }

        $start = $match[3] ?? null;
        $end = $match[4] ?? null;
        $url = route('reader.show', ['book' => $book->book_code, 'chapter' => $match[2], 'translation' => $edition->slug], false);
        if ($start) {
            $url .= '#verse-'.$start;
        }

        return [
            'bookCode' => $book->book_code,
            'bookName' => $book->name,
            'chapter' => $match[2],
            'verseStart' => $start,
            'verseEnd' => $end,
            'label' => $book->name.' '.$match[2].($start ? ':'.$start.($end ? '–'.$end : '') : ''),
            'url' => $url,
        ];
    }

    private function commonAlias(string $alias): ?string
    {
        return [
            'jn' => 'JHN', 'jhn' => 'JHN', 'mt' => 'MAT', 'matt' => 'MAT', 'mk' => 'MRK',
            'lk' => 'LUK', 'acts' => 'ACT', 'ps' => 'PSA', 'psalm' => 'PSA', 'psalms' => 'PSA',
            'rev' => 'REV', 'revelations' => 'REV', '1cor' => '1CO', '2cor' => '2CO',
            '1thess' => '1TH', '2thess' => '2TH', '1tim' => '1TI', '2tim' => '2TI',
            '1pet' => '1PE', '2pet' => '2PE', '1john' => '1JN', '2john' => '2JN', '3john' => '3JN',
        ][$alias] ?? null;
    }

    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
