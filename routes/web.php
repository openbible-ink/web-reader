<?php

use App\Http\Controllers\BookOverviewController;
use App\Http\Controllers\BookmarkController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HighlightController;
use App\Http\Controllers\ReaderController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route('reader.show', [
    'edition' => 'oeb',
    'book' => 'JHN',
    'chapter' => '1',
]))->name('home');

Route::get('/read/{edition:slug}/{book:book_code}/{chapter}', ReaderController::class)
    ->scopeBindings()
    ->name('reader.show');
Route::get('/books/{edition:slug}/{book:book_code}', BookOverviewController::class)
    ->scopeBindings()
    ->name('books.show');
Route::get('/books/john', fn () => redirect()->route('books.show', [
    'edition' => 'oeb',
    'book' => 'JHN',
]))->name('books.john');
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
});

require __DIR__.'/settings.php';
