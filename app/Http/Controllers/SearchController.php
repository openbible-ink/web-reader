<?php

namespace App\Http\Controllers;

use App\Models\BibleBook;
use App\Models\BibleEdition;
use App\Models\Note;
use App\Models\ScriptureSearchVerse;
use App\Models\User;
use App\Support\CanonicalBookMetadata;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SearchController extends Controller
{
    private const PAGE_SIZE = 12;

    private const REGEX_MAX_LENGTH = 120;

    private const REGEX_CANDIDATE_LIMIT = 5000;

    public function __invoke(Request $request): Response|JsonResponse
    {
        $query = Str::of($request->string('q')->toString())->squish()->limit(160, '')->toString();
        $edition = $this->edition($request);
        $bookCode = strtoupper($request->string('book')->limit(12)->toString());
        $books = $edition->books()->orderBy('canon_position')->get(['book_code', 'name', 'long_name', 'canon_position']);
        $parsed = $this->parseSearchQuery($query, $books);
        ['text' => $searchText, 'scopes' => $searchScopes, 'filters' => $searchFilters] = $parsed;
        ['pattern' => $regex, 'databasePattern' => $databaseRegex, 'error' => $regexError, 'wordAnchored' => $regexWordAnchored] = $this->compileRegex($searchText);
        $tokenBookCodes = collect($searchFilters)->where('kind', 'book')->pluck('bookCode')->filter()->values();
        $effectiveBookCodes = $tokenBookCodes->when($bookCode !== '', fn ($codes) => $codes->push($bookCode))->unique()->values();
        $testaments = collect($searchFilters)->where('kind', 'testament')->pluck('value')->unique()->values();
        $categoryBookCodes = collect($searchFilters)->where('kind', 'category')
            ->flatMap(fn (array $filter) => CanonicalBookMetadata::bookCodesForCategory($filter['label']))->unique()->values();
        $strongNumbers = collect($searchFilters)->where('kind', 'strong')->pluck('value')->unique()->values();
        if ($strongNumbers->isNotEmpty()) {
            $searchText = '';
            $searchScopes = ['verse'];
        }
        $reference = $searchText !== '' ? $this->reference($searchText, $edition) : null;
        $results = null;
        $distribution = null;

        if ($query !== '' && $reference === null && $regexError === null) {
            $terms = $regex === null ? $this->searchTerms($searchText) : collect();
            $columns = collect($searchScopes)->map(fn (string $scope) => match ($scope) {
                'headings' => 'section_title',
                'footnotes' => 'footnote_text',
                default => 'text',
            })->unique()->values();

            $results = in_array('notes', $searchScopes, true)
                ? $this->noteSearchResults($request, $effectiveBookCodes, $testaments, $categoryBookCodes, $terms, $regex, $databaseRegex, $regexWordAnchored)
                : ($strongNumbers->isEmpty() && (in_array('headings', $searchScopes, true) || $regex !== null)
                ? $this->aggregatedSearchResults($request, $edition, $effectiveBookCodes, $testaments, $categoryBookCodes, $searchText, $terms, $searchScopes, $regex, $databaseRegex, $regexWordAnchored)
                : ScriptureSearchVerse::query()
                    ->where('edition_id', $edition->id)
                    ->when($effectiveBookCodes->isNotEmpty(), fn (Builder $builder) => $builder->whereIn('book_code', $effectiveBookCodes))
                    ->when($testaments->isNotEmpty(), fn (Builder $builder) => $builder->where(function (Builder $query) use ($testaments): void {
                        if ($testaments->contains('old')) {
                            $query->orWhereBetween('canon_position', [1, 39]);
                        }
                        if ($testaments->contains('new')) {
                            $query->orWhere('canon_position', '>=', 40);
                        }
                    }))
                    ->when($categoryBookCodes->isNotEmpty(), fn (Builder $builder) => $builder->whereIn('book_code', $categoryBookCodes))
                    ->when($strongNumbers->isNotEmpty(), fn (Builder $builder) => $this->applyStrongFilters($builder, $strongNumbers))
                    ->when($terms->isNotEmpty(), fn (Builder $builder) => $this->applyScriptureTextSearch($builder, $columns, $terms))
                    ->when($terms->isEmpty(), function (Builder $builder) use ($columns): void {
                        $builder->where(function (Builder $match) use ($columns): void {
                            foreach ($columns as $column) {
                                $match->orWhere(function (Builder $content) use ($column): void {
                                    $this->addNonemptyColumn($content, $column);
                                });
                            }
                        });
                    })
                    ->when($searchText !== '', fn (Builder $builder) => $builder->orderByRaw(
                        "case when lower(coalesce(text, '') || ' ' || coalesce(section_title, '') || ' ' || coalesce(footnote_text, '')) like ? then 0 else 1 end",
                        ['%'.$this->escapeLike(Str::lower($searchText)).'%'],
                    ))
                    ->orderBy('canon_position')
                    ->orderByRaw('cast(chapter as integer)')
                    ->orderBy('verse')
                    ->paginate(self::PAGE_SIZE)
                    ->withQueryString()
                    ->through(fn (ScriptureSearchVerse $verse) => [
                        'id' => $verse->id,
                        'bookCode' => $verse->book_code,
                        'bookName' => $verse->book_name,
                        'chapter' => $verse->chapter,
                        'verse' => $verse->verse,
                        'sectionTitle' => $verse->section_title,
                        'footnoteText' => $verse->footnote_text,
                        'strongMatches' => $strongNumbers
                            ->flatMap(fn (string $strong) => $verse->strong_terms[$strong] ?? [])
                            ->filter()->unique()->values()->all(),
                        'matchedIn' => $strongNumbers->isNotEmpty() && $terms->isEmpty()
                            ? ['verse']
                            : collect([
                                'verse' => $verse->text,
                                'headings' => $verse->section_title,
                                'footnotes' => $verse->footnote_text,
                            ])->filter(fn (?string $value, string $scope) => in_array($scope, $searchScopes, true)
                            && $value !== null
                            && ($terms->isEmpty() || $terms->contains(fn (string $term) => str_contains(Str::lower($value), $term))))
                                ->keys()->values()->all(),
                        'text' => $verse->text,
                        'url' => route('reader.show', [
                            'book' => $verse->book_code,
                            'chapter' => $verse->chapter,
                            'translation' => $edition->slug,
                        ], false).'#verse-'.$verse->verse,
                    ]));

            if (! in_array('notes', $searchScopes, true)) {
                $distribution = $this->searchDistribution(
                    $edition,
                    $books,
                    $effectiveBookCodes,
                    $testaments,
                    $categoryBookCodes,
                    $terms,
                    $searchText,
                    $searchScopes,
                    $regex,
                    $databaseRegex,
                    $regexWordAnchored,
                    $strongNumbers,
                );
            }
        }

        if ($request->boolean('quick')) {
            return response()->json([
                'props' => [
                    'results' => $results,
                    'reference' => $reference,
                    'regexError' => $regexError,
                ],
            ]);
        }

        return Inertia::render('search', [
            'query' => $query,
            'searchText' => $searchText,
            'searchScopes' => $searchScopes,
            'searchFilters' => $searchFilters,
            'isRegex' => $regex !== null,
            'regexError' => $regexError,
            'edition' => [
                'slug' => $edition->slug,
                'name' => $edition->name,
                'abbreviation' => $edition->abbreviation,
            ],
            'editions' => BibleEdition::query()->whereHas('books')->orderBy('name')->get(['slug', 'name', 'abbreviation']),
            'books' => $books->map(fn (BibleBook $book) => [
                'code' => $book->book_code,
                'name' => $book->name,
                'testament' => ($book->canon_position ?? 40) <= 39 ? 'old' : 'new',
                'category' => CanonicalBookMetadata::category($book->book_code),
            ]),
            'categories' => CanonicalBookMetadata::categories(),
            'selectedBook' => $effectiveBookCodes->first() ?? '',
            'reference' => $reference,
            'results' => $results,
            'distribution' => $distribution,
            'indexReady' => ScriptureSearchVerse::query()->where('edition_id', $edition->id)->exists(),
        ]);
    }

    /**
     * @param  Collection<int, BibleBook>  $books
     * @param  Collection<int, string>  $bookCodes
     * @param  Collection<int, string>  $testaments
     * @param  Collection<int, string>  $categoryBookCodes
     * @param  Collection<int, string>  $terms
     * @param  array<int, string>  $searchScopes
     * @return array{books: array<int, array{code: string, name: string, testament: string, category: string, count: int}>, testaments: array<int, array{key: string, name: string, count: int}>, total: int}
     */
    private function searchDistribution(BibleEdition $edition, Collection $books, Collection $bookCodes, Collection $testaments, Collection $categoryBookCodes, Collection $terms, string $searchText, array $searchScopes, ?string $regex, ?string $databaseRegex, bool $regexWordAnchored, Collection $strongNumbers): array
    {
        if ($regex === null) {
            $indexVersion = Cache::get(
                "scripture-search-index-version:{$edition->id}",
                ScriptureSearchVerse::query()->where('edition_id', $edition->id)->max('updated_at'),
            );
            $cacheKey = 'search-distribution:'.sha1(json_encode([
                'v3-relative-density',
                $edition->id,
                $indexVersion,
                $bookCodes->all(),
                $testaments->all(),
                $categoryBookCodes->all(),
                $searchText,
                $searchScopes,
                $strongNumbers->all(),
            ], JSON_THROW_ON_ERROR));

            return Cache::remember(
                $cacheKey,
                now()->addMinutes(15),
                fn (): array => $this->databaseSearchDistribution(
                    $edition,
                    $books,
                    $bookCodes,
                    $testaments,
                    $categoryBookCodes,
                    $terms,
                    $searchScopes,
                    $strongNumbers,
                ),
            );
        }

        $rows = ScriptureSearchVerse::query()
            ->where('edition_id', $edition->id)
            ->when($bookCodes->isNotEmpty(), fn (Builder $builder) => $builder->whereIn('book_code', $bookCodes))
            ->when($testaments->isNotEmpty(), fn (Builder $builder) => $builder->where(function (Builder $query) use ($testaments): void {
                if ($testaments->contains('old')) {
                    $query->orWhereBetween('canon_position', [1, 39]);
                }
                if ($testaments->contains('new')) {
                    $query->orWhere('canon_position', '>=', 40);
                }
            }))
            ->when($categoryBookCodes->isNotEmpty(), fn (Builder $builder) => $builder->whereIn('book_code', $categoryBookCodes))
            ->when($strongNumbers->isNotEmpty(), fn (Builder $builder) => $this->applyStrongFilters($builder, $strongNumbers))
            ->when(
                DB::getDriverName() === 'pgsql' && $databaseRegex !== null,
                fn (Builder $builder) => $this->applyScriptureRegexSearch($builder, $searchScopes, $databaseRegex),
            )
            ->orderBy('canon_position')
            ->limit(self::REGEX_CANDIDATE_LIMIT)
            ->get(['book_code', 'canon_position', 'chapter', 'section_key', 'section_title', 'footnote_text', 'text']);

        $counts = collect();
        $seenHeadings = [];

        foreach ($rows as $row) {
            $values = collect();
            if (in_array('verse', $searchScopes, true) && $row->text) {
                $values->push($row->text);
            }
            if (in_array('footnotes', $searchScopes, true) && $row->footnote_text) {
                $values->push($row->footnote_text);
            }
            if (in_array('headings', $searchScopes, true) && $row->section_title) {
                $headingKey = implode('|', [$row->book_code, $row->chapter, $row->section_key ?: Str::slug($row->section_title)]);
                if (! isset($seenHeadings[$headingKey])) {
                    $seenHeadings[$headingKey] = true;
                    $values->push($row->section_title);
                }
            }

            $haystack = Str::lower($values->join(' '));
            $matches = $this->matchesRegex($haystack, $regex, $regexWordAnchored);
            if (! $matches) {
                continue;
            }

            $instances = $values->sum(fn (string $value) => $this->occurrenceCount($value, $terms, $regex, $regexWordAnchored));
            if ($instances > 0) {
                $counts->put($row->book_code, ($counts->get($row->book_code, 0) + $instances));
            }
        }

        $wordCounts = $this->bookWordCounts($edition);
        $bookDistribution = $books->map(function (BibleBook $book) use ($counts, $wordCounts): array {
            $count = (int) $counts->get($book->book_code, 0);
            $wordCount = (int) $wordCounts->get($book->book_code, 0);

            return [
                'code' => $book->book_code,
                'name' => $book->name,
                'testament' => ($book->canon_position ?? 40) <= 39 ? 'old' : 'new',
                'category' => CanonicalBookMetadata::category($book->book_code),
                'count' => $count,
                'wordCount' => $wordCount,
            ];
        })->values();

        $oldTestament = $bookDistribution->where('testament', 'old');
        $newTestament = $bookDistribution->where('testament', 'new');

        return [
            'books' => $bookDistribution->all(),
            'testaments' => [
                $this->testamentDistribution('old', 'Old Testament', $oldTestament),
                $this->testamentDistribution('new', 'New Testament', $newTestament),
            ],
            'total' => (int) $bookDistribution->sum('count'),
        ];
    }

    /**
     * Aggregate ordinary search distributions inside the database. Only the
     * small per-book totals are transferred to PHP.
     *
     * @param  Collection<int, BibleBook>  $books
     * @param  Collection<int, string>  $bookCodes
     * @param  Collection<int, string>  $testaments
     * @param  Collection<int, string>  $categoryBookCodes
     * @param  Collection<int, string>  $terms
     * @param  array<int, string>  $searchScopes
     * @return array{books: array<int, array{code: string, name: string, testament: string, category: string, count: int}>, testaments: array<int, array{key: string, name: string, count: int}>, total: int}
     */
    private function databaseSearchDistribution(BibleEdition $edition, Collection $books, Collection $bookCodes, Collection $testaments, Collection $categoryBookCodes, Collection $terms, array $searchScopes, Collection $strongNumbers): array
    {
        $columns = collect($searchScopes)->map(fn (string $scope) => match ($scope) {
            'headings' => 'section_title',
            'footnotes' => 'footnote_text',
            default => 'text',
        })->unique()->values();
        $base = ScriptureSearchVerse::query()
            ->where('edition_id', $edition->id)
            ->when($bookCodes->isNotEmpty(), fn (Builder $builder) => $builder->whereIn('book_code', $bookCodes))
            ->when($testaments->isNotEmpty(), fn (Builder $builder) => $builder->where(function (Builder $query) use ($testaments): void {
                if ($testaments->contains('old')) {
                    $query->orWhereBetween('canon_position', [1, 39]);
                }
                if ($testaments->contains('new')) {
                    $query->orWhere('canon_position', '>=', 40);
                }
            }))
            ->when($categoryBookCodes->isNotEmpty(), fn (Builder $builder) => $builder->whereIn('book_code', $categoryBookCodes));
        $this->applyStrongFilters($base, $strongNumbers);

        if ($terms->isEmpty() && $strongNumbers->isNotEmpty()) {
            $counts = (clone $base)
                ->select('book_code')
                ->selectRaw('count(*) as match_count')
                ->groupBy('book_code')
                ->pluck('match_count', 'book_code');

            return $this->distributionFromCounts($books, $edition, $counts);
        }

        $this->applyScriptureTextSearch($base, $columns, $terms);
        $counts = collect();

        foreach ($columns as $column) {
            $source = clone $base;
            $source->whereNotNull($column)->where($column, '!=', '');

            if ($column === 'section_title') {
                $source = ScriptureSearchVerse::query()
                    ->fromSub(
                        $source->select(['book_code', 'chapter', 'section_key', 'section_title'])->distinct(),
                        'matching_headings',
                    );
            }

            foreach ($terms as $term) {
                $scopeCounts = (clone $source)
                    ->select('book_code')
                    ->selectRaw(match ($column) {
                        'section_title' => "sum((length(lower(section_title)) - length(replace(lower(section_title), ?, ''))) / nullif(length(?), 0)) as match_count",
                        'footnote_text' => "sum((length(lower(footnote_text)) - length(replace(lower(footnote_text), ?, ''))) / nullif(length(?), 0)) as match_count",
                        default => "sum((length(lower(text)) - length(replace(lower(text), ?, ''))) / nullif(length(?), 0)) as match_count",
                    }, [$term, $term])
                    ->groupBy('book_code')
                    ->pluck('match_count', 'book_code');

                foreach ($scopeCounts as $code => $count) {
                    $counts->put($code, (int) $counts->get($code, 0) + (int) $count);
                }
            }
        }

        $wordCounts = $this->bookWordCounts($edition);
        $bookDistribution = $books->map(function (BibleBook $book) use ($counts, $wordCounts): array {
            $count = (int) $counts->get($book->book_code, 0);
            $wordCount = (int) $wordCounts->get($book->book_code, 0);

            return [
                'code' => $book->book_code,
                'name' => $book->name,
                'testament' => ($book->canon_position ?? 40) <= 39 ? 'old' : 'new',
                'category' => CanonicalBookMetadata::category($book->book_code),
                'count' => $count,
                'wordCount' => $wordCount,
            ];
        })->values();

        $oldTestament = $bookDistribution->where('testament', 'old');
        $newTestament = $bookDistribution->where('testament', 'new');

        return [
            'books' => $bookDistribution->all(),
            'testaments' => [
                $this->testamentDistribution('old', 'Old Testament', $oldTestament),
                $this->testamentDistribution('new', 'New Testament', $newTestament),
            ],
            'total' => (int) $bookDistribution->sum('count'),
        ];
    }

    /**
     * @param  Collection<int, BibleBook>  $books
     * @param  Collection<string, int|string>  $counts
     * @return array{books: array<int, array{code: string, name: string, testament: string, category: string, count: int, wordCount: int}>, testaments: array<int, array{key: string, name: string, count: int, wordCount: int}>, total: int}
     */
    private function distributionFromCounts(Collection $books, BibleEdition $edition, Collection $counts): array
    {
        $wordCounts = $this->bookWordCounts($edition);
        $bookDistribution = $books->map(function (BibleBook $book) use ($counts, $wordCounts): array {
            return [
                'code' => $book->book_code,
                'name' => $book->name,
                'testament' => ($book->canon_position ?? 40) <= 39 ? 'old' : 'new',
                'category' => CanonicalBookMetadata::category($book->book_code),
                'count' => (int) $counts->get($book->book_code, 0),
                'wordCount' => (int) $wordCounts->get($book->book_code, 0),
            ];
        })->values();

        return [
            'books' => $bookDistribution->all(),
            'testaments' => [
                $this->testamentDistribution('old', 'Old Testament', $bookDistribution->where('testament', 'old')),
                $this->testamentDistribution('new', 'New Testament', $bookDistribution->where('testament', 'new')),
            ],
            'total' => (int) $bookDistribution->sum('count'),
        ];
    }

    /** @param Collection<int, string> $strongNumbers */
    private function applyStrongFilters(Builder $builder, Collection $strongNumbers): void
    {
        foreach ($strongNumbers as $strong) {
            $builder->whereJsonContains('strong_numbers', $strong);
        }
    }

    /** @return Collection<string, int> */
    private function bookWordCounts(BibleEdition $edition): Collection
    {
        return ScriptureSearchVerse::query()
            ->where('edition_id', $edition->id)
            ->select('book_code')
            ->selectRaw(DB::getDriverName() === 'pgsql'
                ? "sum(case when btrim(coalesce(text, '')) = '' then 0 else coalesce(array_length(regexp_split_to_array(btrim(text), E'\\\\s+'), 1), 0) end) as word_count"
                : "sum(case when trim(text) = '' then 0 else length(trim(text)) - length(replace(trim(text), ' ', '')) + 1 end) as word_count")
            ->groupBy('book_code')
            ->pluck('word_count', 'book_code')
            ->map(fn ($count): int => (int) $count);
    }

    /**
     * @param  Collection<int, array{code: string, name: string, testament: string, category: string, count: int, wordCount: int}>  $books
     * @return array{key: string, name: string, count: int, wordCount: int}
     */
    private function testamentDistribution(string $key, string $name, Collection $books): array
    {
        $count = (int) $books->sum('count');
        $wordCount = (int) $books->sum('wordCount');

        return [
            'key' => $key,
            'name' => $name,
            'count' => $count,
            'wordCount' => $wordCount,
        ];
    }

    /** @param Collection<int, string> $terms */
    private function occurrenceCount(string $value, Collection $terms, ?string $regex, bool $regexWordAnchored): int
    {
        if ($regex !== null) {
            if ($regexWordAnchored) {
                return collect(preg_split('/[^\p{L}\p{N}\p{M}]+/u', $value) ?: [])
                    ->filter()
                    ->sum(fn (string $word) => preg_match($regex, $word) === 1 ? 1 : 0);
            }

            return preg_match_all($regex, $value, $matches) ?: 0;
        }

        $lower = Str::lower($value);

        return (int) $terms->sum(fn (string $term) => mb_substr_count($lower, $term));
    }

    /** @param Collection<int, BibleBook> $books
     * @return array{text: string, scopes: array<int, string>, filters: array<int, array<string, string>>}
     */
    private function parseSearchQuery(string $query, $books): array
    {
        preg_match_all('/(?:^|\s)in:(verse(?:-?text)?|headings?|sections?|footnotes?|notes?)(?=\s|$)/iu', $query, $matches);
        $scopes = collect($matches[1])->map(fn (string $scope) => match (Str::lower($scope)) {
            'heading', 'headings', 'section', 'sections' => 'headings',
            'footnote', 'footnotes' => 'footnotes',
            'note', 'notes' => 'notes',
            default => 'verse',
        })->unique()->values()->all();

        $filters = collect();
        foreach ($scopes as $scope) {
            $filters->push(['kind' => 'in', 'value' => $scope, 'label' => $scope]);
        }

        $remaining = preg_replace('/(?:^|\s)in:(?:verse(?:-?text)?|headings?|sections?|footnotes?|notes?)(?=\s|$)/iu', ' ', $query) ?? $query;
        $remaining = preg_replace_callback('/(?:^|\s)(book|testament|category|strong):([^\s]+)(?=\s|$)/iu', function (array $match) use ($books, $filters): string {
            $kind = Str::lower($match[1]);
            $value = Str::lower($match[2]);
            if ($kind === 'strong') {
                $strong = strtoupper($value);
                if (preg_match('/^[GH][0-9]{1,5}$/', $strong) !== 1) {
                    return $match[0];
                }
                $filters->push(['kind' => 'strong', 'value' => $strong, 'label' => $strong]);

                return ' ';
            }
            if ($kind === 'book') {
                $needle = Str::of($value)->replace('-', '')->replaceMatches('/[^a-z0-9]+/u', '')->toString();
                $book = $books->first(fn (BibleBook $book) => collect([$book->book_code, $book->name, $book->long_name])
                    ->filter()->contains(fn (string $name) => Str::of($name)->lower()->replaceMatches('/[^a-z0-9]+/u', '')->toString() === $needle)
                    || $this->commonAlias($needle) === $book->book_code);
                if (! $book) {
                    return $match[0];
                }
                $filters->push(['kind' => 'book', 'value' => Str::slug($book->name), 'label' => $book->name, 'bookCode' => $book->book_code]);

                return ' ';
            }
            if ($kind === 'testament') {
                $canonical = match ($value) {
                    'old', 'ot' => 'old', 'new', 'nt' => 'new', default => null
                };
                if (! $canonical) {
                    return $match[0];
                }
                $filters->push(['kind' => 'testament', 'value' => $canonical, 'label' => $canonical === 'old' ? 'Old Testament' : 'New Testament']);

                return ' ';
            }
            $category = collect(CanonicalBookMetadata::categories())->first(fn (string $category) => Str::slug($category) === Str::slug($value));
            if (! $category) {
                return $match[0];
            }
            $filters->push(['kind' => 'category', 'value' => Str::slug($category), 'label' => $category]);

            return ' ';
        }, $remaining) ?? $remaining;

        return [
            'text' => Str::of($remaining)->squish()->toString(),
            'scopes' => $scopes ?: ['verse', 'headings', 'footnotes'],
            'filters' => $filters->unique(fn (array $filter) => $filter['kind'].':'.$filter['value'])->values()->all(),
        ];
    }

    /**
     * @param  Collection<int, string>  $bookCodes
     * @param  Collection<int, string>  $testaments
     * @param  Collection<int, string>  $categoryBookCodes
     * @param  Collection<int, string>  $terms
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    private function noteSearchResults(Request $request, Collection $bookCodes, Collection $testaments, Collection $categoryBookCodes, Collection $terms, ?string $regex, ?string $databaseRegex, bool $regexWordAnchored): LengthAwarePaginator
    {
        if (! $request->user()) {
            return Note::query()->whereRaw('1 = 0')->paginate(self::PAGE_SIZE)->through(
                fn (Note $note): array => $this->serializeNoteSearchResult($note),
            );
        }

        $query = $request->user()->notes()
            ->with(['book.edition', 'tags'])
            ->when($bookCodes->isNotEmpty(), fn (Builder $builder) => $builder->whereIn('book_code', $bookCodes))
            ->when($categoryBookCodes->isNotEmpty(), fn (Builder $builder) => $builder->whereIn('book_code', $categoryBookCodes))
            ->when($testaments->isNotEmpty(), fn (Builder $builder) => $builder->whereHas('book', function (Builder $book) use ($testaments): void {
                $book->where(function (Builder $canon) use ($testaments): void {
                    if ($testaments->contains('old')) {
                        $canon->orWhereBetween('canon_position', [1, 39]);
                    }
                    if ($testaments->contains('new')) {
                        $canon->orWhere('canon_position', '>=', 40);
                    }
                });
            }));

        if ($regex !== null && DB::getDriverName() !== 'pgsql') {
            $notes = $query->latest('updated_at')->limit(self::REGEX_CANDIDATE_LIMIT)->get()
                ->filter(function (Note $note) use ($regex, $regexWordAnchored): bool {
                    $haystack = implode(' ', [
                        $note->title,
                        $note->body_markdown,
                        $note->section_title,
                        $note->selected_text,
                        $note->tags->pluck('name')->join(' '),
                    ]);

                    return $this->matchesRegex($haystack, $regex, $regexWordAnchored);
                });
            $page = LengthAwarePaginator::resolveCurrentPage();

            return new LengthAwarePaginator(
                $notes->forPage($page, self::PAGE_SIZE)->map(fn (Note $note): array => $this->serializeNoteSearchResult($note))->values(),
                $notes->count(),
                self::PAGE_SIZE,
                $page,
                ['path' => $request->url(), 'query' => $request->query()],
            );
        }

        if ($regex !== null && $databaseRegex !== null) {
            $query->where(function (Builder $match) use ($databaseRegex): void {
                $match->whereRaw("concat_ws(' ', title, body_markdown, section_title, selected_text) ~* ?", [$databaseRegex])
                    ->orWhereHas('tags', fn (Builder $tags) => $tags->whereRaw('name ~* ?', [$databaseRegex]));
            });
        } elseif ($terms->isNotEmpty()) {
            foreach ($terms as $term) {
                $query->where(function (Builder $match) use ($term): void {
                    if (DB::getDriverName() === 'pgsql') {
                        $match->whereRaw("search_vector @@ plainto_tsquery('english', ?)", [$term]);
                    } else {
                        $value = '%'.$this->escapeLike($term).'%';
                        $match->whereRaw("lower(title || ' ' || body_markdown || ' ' || coalesce(section_title, '') || ' ' || coalesce(selected_text, '')) like ? escape '\\'", [$value]);
                    }
                    $match->orWhereHas('tags', fn (Builder $tags) => $tags->whereRaw('lower(name) like ?', ['%'.$this->escapeLike($term).'%']));
                });
            }
        }

        return $query
            ->latest('updated_at')
            ->paginate(self::PAGE_SIZE)
            ->withQueryString()
            ->through(fn (Note $note): array => $this->serializeNoteSearchResult($note));
    }

    /**
     * @param  Collection<int, string>  $bookCodes
     * @param  Collection<int, string>  $testaments
     * @param  Collection<int, string>  $categoryBookCodes
     * @param  Collection<int, string>  $terms
     * @param  array<int, string>  $searchScopes
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    private function aggregatedSearchResults(Request $request, BibleEdition $edition, Collection $bookCodes, Collection $testaments, Collection $categoryBookCodes, string $searchText, Collection $terms, array $searchScopes, ?string $regex = null, ?string $databaseRegex = null, bool $regexWordAnchored = false): LengthAwarePaginator
    {
        $columns = collect($searchScopes)->map(fn (string $scope) => match ($scope) {
            'headings' => 'section_title',
            'footnotes' => 'footnote_text',
            default => 'text',
        })->unique()->values();
        $rows = ScriptureSearchVerse::query()
            ->where('edition_id', $edition->id)
            ->when($bookCodes->isNotEmpty(), fn (Builder $builder) => $builder->whereIn('book_code', $bookCodes))
            ->when($testaments->isNotEmpty(), fn (Builder $builder) => $builder->where(function (Builder $query) use ($testaments): void {
                if ($testaments->contains('old')) {
                    $query->orWhereBetween('canon_position', [1, 39]);
                }
                if ($testaments->contains('new')) {
                    $query->orWhere('canon_position', '>=', 40);
                }
            }))
            ->when($categoryBookCodes->isNotEmpty(), fn (Builder $builder) => $builder->whereIn('book_code', $categoryBookCodes))
            ->when($terms->isNotEmpty(), fn (Builder $builder) => $this->applyScriptureTextSearch($builder, $columns, $terms))
            ->when(
                $regex !== null && DB::getDriverName() === 'pgsql' && $databaseRegex !== null,
                fn (Builder $builder) => $this->applyScriptureRegexSearch($builder, $searchScopes, $databaseRegex),
            )
            ->when($terms->isEmpty(), function (Builder $builder) use ($columns): void {
                $builder->where(function (Builder $match) use ($columns): void {
                    foreach ($columns as $column) {
                        $match->orWhere(function (Builder $content) use ($column): void {
                            $this->addNonemptyColumn($content, $column);
                        });
                    }
                });
            })
            ->orderBy('canon_position')
            ->orderByRaw('cast(chapter as integer)')
            ->when($regex !== null, fn (Builder $builder) => $builder->limit(self::REGEX_CANDIDATE_LIMIT))
            ->get()
            ->sort(fn (ScriptureSearchVerse $left, ScriptureSearchVerse $right) => ($left->canon_position <=> $right->canon_position)
                ?: ((int) $left->chapter <=> (int) $right->chapter)
                ?: strnatcasecmp($left->verse, $right->verse));

        $matchesAll = fn (?string $value): bool => $value !== null
            && $value !== ''
            && ($regex !== null
                ? $this->matchesRegex($value, $regex, $regexWordAnchored)
                : ($terms->isEmpty() || $terms->every(fn (string $term) => str_contains(Str::lower($value), $term))));
        $sectionGroups = $rows->groupBy(fn (ScriptureSearchVerse $verse) => implode('|', [
            $verse->book_code,
            $verse->chapter,
            $verse->section_key ?: Str::slug($verse->section_title ?? ''),
        ]));
        $seenSections = [];
        $results = collect();

        foreach ($rows as $verse) {
            $sectionKey = implode('|', [
                $verse->book_code,
                $verse->chapter,
                $verse->section_key ?: Str::slug($verse->section_title ?? ''),
            ]);
            $headingMatches = in_array('headings', $searchScopes, true) && $matchesAll($verse->section_title);

            if ($headingMatches && ! isset($seenSections[$sectionKey])) {
                $seenSections[$sectionKey] = true;
                $ordered = $sectionGroups->get($sectionKey)
                    ->sort(fn (ScriptureSearchVerse $left, ScriptureSearchVerse $right) => strnatcasecmp($left->verse, $right->verse))
                    ->values();
                /** @var ScriptureSearchVerse $first */
                $first = $ordered->first();
                /** @var ScriptureSearchVerse $last */
                $last = $ordered->last();
                $verseRange = $first->verse === $last->verse ? $first->verse : $first->verse.'–'.$last->verse;

                $results->push([
                    'id' => 'section-'.$first->id,
                    'kind' => 'section',
                    'bookCode' => $first->book_code,
                    'bookName' => $first->book_name,
                    'chapter' => $first->chapter,
                    'verse' => $first->verse,
                    'verseStart' => $first->verse,
                    'verseEnd' => $last->verse,
                    'sectionTitle' => $first->section_title,
                    'footnoteText' => null,
                    'matchedIn' => ['headings'],
                    'text' => '',
                    'reference' => $first->book_name.' '.$first->chapter.':'.$verseRange,
                    'url' => route('reader.show', [
                        'book' => $first->book_code,
                        'chapter' => $first->chapter,
                        'translation' => $edition->slug,
                        'verses' => $first->verse.($first->verse === $last->verse ? '' : '-'.$last->verse),
                    ], false),
                ]);
            }

            $nonHeadingValues = collect([
                in_array('verse', $searchScopes, true) ? $verse->text : null,
                in_array('footnotes', $searchScopes, true) ? $verse->footnote_text : null,
            ])->filter();
            $nonHeadingMatches = $nonHeadingValues->contains(fn (string $value) => $matchesAll($value));
            if (! $nonHeadingMatches && $headingMatches) {
                continue;
            }
            if (! $headingMatches && ! $nonHeadingMatches) {
                continue;
            }

            $results->push([
                'id' => $verse->id,
                'kind' => 'verse',
                'bookCode' => $verse->book_code,
                'bookName' => $verse->book_name,
                'chapter' => $verse->chapter,
                'verse' => $verse->verse,
                'sectionTitle' => $verse->section_title,
                'footnoteText' => $verse->footnote_text,
                'matchedIn' => collect([
                    'verse' => $verse->text,
                    'headings' => $verse->section_title,
                    'footnotes' => $verse->footnote_text,
                ])->filter(fn (?string $value, string $scope) => in_array($scope, $searchScopes, true) && $matchesAll($value))
                    ->keys()->values()->all(),
                'text' => $verse->text,
                'url' => route('reader.show', [
                    'book' => $verse->book_code,
                    'chapter' => $verse->chapter,
                    'translation' => $edition->slug,
                ], false).'#verse-'.$verse->verse,
            ]);
        }

        $page = LengthAwarePaginator::resolveCurrentPage();

        return new LengthAwarePaginator(
            $results->forPage($page, 12)->values(),
            $results->count(),
            self::PAGE_SIZE,
            $page,
            ['path' => $request->url(), 'query' => $request->query()],
        );
    }

    /** @return array{pattern: string|null, databasePattern: string|null, error: string|null, wordAnchored: bool} */
    private function compileRegex(string $searchText): array
    {
        if (mb_strlen($searchText) < 3 || ! str_starts_with($searchText, '/') || ! str_ends_with($searchText, '/')) {
            return ['pattern' => null, 'databasePattern' => null, 'error' => null, 'wordAnchored' => false];
        }

        $body = substr($searchText, 1, -1);
        if ($body === '') {
            return ['pattern' => null, 'databasePattern' => null, 'error' => 'Enter a pattern between the forward slashes.', 'wordAnchored' => false];
        }
        if (mb_strlen($body) > self::REGEX_MAX_LENGTH) {
            return ['pattern' => null, 'databasePattern' => null, 'error' => 'Keep regular expressions to 120 characters or fewer.', 'wordAnchored' => false];
        }
        if (preg_match('/\(\?|\\\\[1-9]|\\\\g|\\\\k|\(\*|\([^)]*[+*][^)]*\)[+*{]/u', $body) === 1) {
            return ['pattern' => null, 'databasePattern' => null, 'error' => 'This pattern uses a potentially expensive regular-expression feature. Try a simpler expression.', 'wordAnchored' => false];
        }
        if (preg_match('/\\\\(?:p|P|x|u|R|X|C|K|N|Q|E)/u', $body) === 1) {
            return ['pattern' => null, 'databasePattern' => null, 'error' => 'This regular-expression escape is not supported. Try a simpler cross-platform pattern.', 'wordAnchored' => false];
        }
        if (preg_match_all('/[\p{L}\p{N}]/u', $body) < 2) {
            return ['pattern' => null, 'databasePattern' => null, 'error' => 'Include at least two letters or numbers in a regular expression.', 'wordAnchored' => false];
        }

        $pattern = '~(*LIMIT_MATCH=100000)(*LIMIT_RECURSION=10000)(?:'.str_replace('~', '\\~', $body).')~iu';
        if (@preg_match($pattern, '') === false) {
            return ['pattern' => null, 'databasePattern' => null, 'error' => 'This regular expression is not valid. Check its brackets and escape characters.', 'wordAnchored' => false];
        }

        $wordAnchored = str_starts_with($body, '^') && str_ends_with($body, '$') && preg_match('/\s/u', $body) !== 1;

        $databaseBody = str_replace(['\\b', '\\B'], ['\\y', '\\Y'], $body);

        return [
            'pattern' => $pattern,
            'databasePattern' => $wordAnchored
                ? '\\m(?:'.substr($databaseBody, 1, -1).')\\M'
                : $databaseBody,
            'error' => null,
            'wordAnchored' => $wordAnchored,
        ];
    }

    /** @return Collection<int, non-falsy-string> */
    private function searchTerms(string $searchText): Collection
    {
        preg_match_all('/["“]([^"”]+)["”]|([^\s]+)/u', Str::lower($searchText), $matches, PREG_SET_ORDER);

        return collect($matches)
            ->map(fn (array $match) => trim(($match[1] ?? '') !== '' ? $match[1] : ($match[2] ?? '')))
            ->filter(fn (string $term) => mb_strlen($term) >= 2)
            ->unique()
            ->take(8)
            ->values()
            ->map(fn (string $term): string => $term);
    }

    private function matchesRegex(string $value, string $pattern, bool $wordAnchored): bool
    {
        if (preg_match($pattern, $value) === 1) {
            return true;
        }
        if (! $wordAnchored) {
            return false;
        }

        return collect(preg_split('/[^\p{L}\p{N}\p{M}]+/u', $value) ?: [])
            ->filter()
            ->contains(fn (string $word) => preg_match($pattern, $word) === 1);
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

        $user = Auth::user();
        if ($user instanceof User) {
            $preferredEdition = BibleEdition::query()->whereKey($user->preferred_edition_id)->first();
            if ($preferredEdition !== null) {
                return $preferredEdition;
            }
        }

        return BibleEdition::query()->where('slug', 'oeb')->firstOrFail();
    }

    /** @return array<string, mixed>|null */
    private function reference(string $query, BibleEdition $edition): ?array
    {
        if (! preg_match('/^(.+?)\s+(\d{1,3})(?:(?:\s*:\s*|\s+)(\d{1,3}[a-z]?)(?:(?:\s*[-–—]\s*|\s+)(\d{1,3}[a-z]?))?)?$/iu', $query, $match)) {
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
        if ($start && $end && (int) $end < (int) $start) {
            return null;
        }

        $parameters = [
            'book' => $book->book_code,
            'chapter' => $match[2],
            'translation' => $edition->slug,
        ];
        if ($start) {
            $parameters['verses'] = $start.($end ? '-'.$end : '');
        }
        $url = route('reader.show', $parameters, false);

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

    /**
     * @param  Builder<ScriptureSearchVerse>  $query
     * @param  Collection<int, string>  $columns
     * @param  Collection<int, string>  $terms
     */
    private function applyScriptureTextSearch(Builder $query, Collection $columns, Collection $terms): void
    {
        if (DB::getDriverName() === 'pgsql') {
            foreach ($terms as $term) {
                $query->where(function (Builder $match) use ($columns, $term): void {
                    $function = str_contains($term, ' ') ? 'phraseto_tsquery' : 'plainto_tsquery';
                    foreach ($columns as $column) {
                        $vector = match ($column) {
                            'section_title' => 'heading_search_vector',
                            'footnote_text' => 'footnote_search_vector',
                            default => 'text_search_vector',
                        };
                        $match->orWhereRaw("{$vector} @@ {$function}('english', ?)", [$term]);
                    }
                });
            }

            return;
        }

        foreach ($terms as $term) {
            $query->where(function (Builder $match) use ($columns, $term): void {
                foreach ($columns as $column) {
                    $this->addColumnTerm($match, $column, $term);
                }
            });
        }
    }

    /** @param Builder<ScriptureSearchVerse> $query
     * @param  array<int, string>  $searchScopes
     */
    private function applyScriptureRegexSearch(Builder $query, array $searchScopes, string $databaseRegex): void
    {
        $query->where(function (Builder $match) use ($searchScopes, $databaseRegex): void {
            foreach ($searchScopes as $scope) {
                $column = match ($scope) {
                    'headings' => 'section_title',
                    'footnotes' => 'footnote_text',
                    default => 'text',
                };
                $match->orWhereRaw("coalesce({$column}, '') ~* ?", [$databaseRegex]);
            }
        });
    }

    /** @param Builder<ScriptureSearchVerse> $query */
    private function addColumnTerm(Builder $query, string $column, string $term): void
    {
        $value = '%'.$this->escapeLike($term).'%';

        match ($column) {
            'section_title' => $query->orWhereRaw('lower(section_title) like ?', [$value]),
            'footnote_text' => $query->orWhereRaw('lower(footnote_text) like ?', [$value]),
            default => $query->orWhereRaw('lower(text) like ?', [$value]),
        };
    }

    /** @param Builder<ScriptureSearchVerse> $query */
    private function addNonemptyColumn(Builder $query, string $column): void
    {
        match ($column) {
            'section_title' => $query->whereNotNull('section_title')->where('section_title', '!=', ''),
            'footnote_text' => $query->whereNotNull('footnote_text')->where('footnote_text', '!=', ''),
            default => $query->whereNotNull('text')->where('text', '!=', ''),
        };
    }

    /** @return array<string, mixed> */
    private function serializeNoteSearchResult(Note $note): array
    {
        $bookName = $note->book->name;
        $reference = "{$bookName} {$note->chapter}";
        if ($note->verse_start) {
            $reference .= $note->chapter_end && $note->chapter_end !== $note->chapter
                ? ":{$note->verse_start}–{$note->chapter_end}:{$note->verse_end}"
                : ':'.($note->verse_start === $note->verse_end || ! $note->verse_end
                    ? $note->verse_start
                    : "{$note->verse_start}–{$note->verse_end}");
        }
        $plainText = Str::of($note->body_markdown)
            ->replaceMatches('/[#>*_\`\\[\\]()!-]+/u', ' ')
            ->squish()
            ->limit(220)
            ->toString();

        return [
            'id' => 'note-'.$note->id,
            'kind' => 'note',
            'title' => $note->title,
            'bookCode' => $note->book_code,
            'bookName' => $bookName,
            'chapter' => $note->chapter,
            'verse' => $note->verse_start ?? '',
            'reference' => $reference,
            'sectionTitle' => $note->section_title,
            'footnoteText' => null,
            'matchedIn' => ['notes'],
            'text' => $plainText,
            'tags' => $note->tags->map(fn ($tag) => [
                'id' => $tag->id,
                'name' => $tag->name,
                'slug' => $tag->slug,
            ])->values()->all(),
            'url' => route('notes.show', $note, false),
        ];
    }
}
