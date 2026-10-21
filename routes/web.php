<?php

use App\Http\Controllers\BookmarkController;
use App\Http\Controllers\BookOverviewController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HighlightController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\ReaderController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route('reader.show', [
    'book' => 'JHN',
    'chapter' => '1',
]))->name('home');

Route::get('/books/john', fn () => redirect()->route('books.show', [
    'book' => 'JHN',
]))->name('books.john');
Route::get('/read/{book}/{chapter}', ReaderController::class)->name('reader.show');
Route::get('/books/{book}', BookOverviewController::class)->name('books.show');
Route::get('/read/{edition}/{book}/{chapter}', fn (Request $request, string $edition, string $book, string $chapter) => redirect()->route(
    'reader.show',
    ['book' => $book, 'chapter' => $chapter, ...$request->query()],
))->name('reader.legacy');
Route::get('/books/{edition}/{book}', fn (string $edition, string $book) => redirect()->route('books.show', [
    'book' => $book,
]))->name('books.legacy');
Route::inertia('/search', 'search')->name('search');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('bookmarks', [BookmarkController::class, 'index'])->name('bookmarks.index');
    Route::post('bookmarks', [BookmarkController::class, 'store'])->name('bookmarks.store');
    Route::patch('bookmarks/{bookmark}', [BookmarkController::class, 'update'])->name('bookmarks.update');
    Route::delete('bookmarks/{bookmark}', [BookmarkController::class, 'destroy'])->name('bookmarks.destroy');
    Route::get('highlights', [HighlightController::class, 'index'])->name('highlights.index');
    Route::post('highlights', [HighlightController::class, 'store'])->name('highlights.store');
    Route::patch('highlights/{highlight}', [HighlightController::class, 'update'])->name('highlights.update');
    Route::delete('highlights/{highlight}', [HighlightController::class, 'destroy'])->name('highlights.destroy');
    Route::get('notes', [NoteController::class, 'index'])->name('notes.index');
    Route::get('notes/{note}', [NoteController::class, 'show'])->name('notes.show');
    Route::post('notes', [NoteController::class, 'store'])->name('notes.store');
    Route::patch('notes/{note}', [NoteController::class, 'update'])->name('notes.update');
    Route::delete('notes/{note}', [NoteController::class, 'destroy'])->name('notes.destroy');
});

require __DIR__.'/settings.php';
