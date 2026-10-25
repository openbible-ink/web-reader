<?php

namespace App\Console\Commands;

use App\Services\OebLibrary;
use Illuminate\Console\Command;
use Throwable;

class ImportOebLibrary extends Command
{
    protected $signature = 'bible:import-oeb {source : Directory containing the OEB *.usfm.db files}';

    protected $description = 'Import Open English Bible USFM source files and update the book catalogue';

    public function handle(OebLibrary $library): int
    {
        try {
            $result = $library->import($this->argument('source'));
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info("Imported {$result['imported']} OEB books.");
        if ($result['patches'] !== []) {
            $this->info('Applied documented source patches:');
            foreach ($result['patches'] as $patch) {
                $this->line("  {$patch}");
            }
        }
        if ($result['missing'] !== []) {
            $this->warn('Not present in the supplied source:');
            foreach ($result['missing'] as $position => $name) {
                $this->line(sprintf('  %02d %s', $position, $name));
            }
        }
        if ($result['incomplete'] !== []) {
            $this->warn('Skipped because the supplied file is incomplete:');
            foreach ($result['incomplete'] as $position => $name) {
                $this->line(sprintf('  %02d %s', $position, $name));
            }
        }

        return self::SUCCESS;
    }
}
