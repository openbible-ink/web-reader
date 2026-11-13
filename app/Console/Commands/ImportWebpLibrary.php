<?php

namespace App\Console\Commands;

use App\Services\WebpLibrary;
use Illuminate\Console\Command;
use Throwable;

class ImportWebpLibrary extends Command
{
    protected $signature = 'bible:import-webp {source : WEB USFM ZIP archive or extracted directory}';

    protected $description = 'Import the World English Bible USFM source and update its book catalogue';

    public function handle(WebpLibrary $library): int
    {
        try {
            $result = $library->import($this->argument('source'));
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info("Imported {$result['imported']} World English Bible books.");
        if ($result['ignored'] !== []) {
            $this->line('Ignored non-canonical/supporting files: '.count($result['ignored']));
        }
        $this->call('bible:index-search', ['--edition' => 'webp']);

        return self::SUCCESS;
    }
}
