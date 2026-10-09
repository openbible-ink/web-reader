<?php

use App\Http\Controllers\ReaderController;
use Illuminate\Support\Facades\Route;

Route::get('/', ReaderController::class)->name('home');
Route::inertia('/search', 'search')->name('search');
Route::inertia('/books/john', 'book-overview')->name('books.john');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
