<?php

namespace App\Console\Commands;

use App\Services\WebpLibrary;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Process;
use RuntimeException;
use Throwable;

class ImportWebpLibrary extends Command
{
    protected $signature = 'bible:import-webp {source : WEB USFM ZIP archive or extracted directory}';

    protected $description = 'Import the World English Bible USFM source and update its book catalogue';

    public function handle(WebpLibrary $library): int
    {
        try {
            $source = $this->argument('source');
            if (! is_string($source)) {
                throw new RuntimeException('The WEB source must be a file or directory path.');
            }

            $result = $library->import($source);
            $compile = Process::path(base_path())
                ->timeout(300)
                ->run(['node', 'scripts/compile-scripture-chapters.mjs', '--edition=webp']);
            if ($compile->failed()) {
                throw new RuntimeException(trim($compile->errorOutput()) ?: 'Unable to compile WEB chapter payloads.');
            }
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info("Imported {$result['imported']} World English Bible books.");
        $this->info('Compiled versioned chapter payloads for the reader and public API.');
        if ($result['ignored'] !== []) {
            $this->line('Ignored non-canonical/supporting files: '.count($result['ignored']));
        }
        $this->call('bible:index-search', ['--edition' => 'webp']);

        return self::SUCCESS;
    }
}
