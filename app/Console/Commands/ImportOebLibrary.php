<?php

namespace App\Console\Commands;

use App\Services\OebLibrary;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Process;
use RuntimeException;
use Throwable;

class ImportOebLibrary extends Command
{
    protected $signature = 'bible:import-oeb {source : Directory containing the OEB *.usfm.db files}';

    protected $description = 'Import Open English Bible USFM source files and update the book catalogue';

    public function handle(OebLibrary $library): int
    {
        try {
            $result = $library->import($this->argument('source'));
            $audit = Process::path(base_path())
                ->timeout(120)
                ->run(['node', 'scripts/audit-scripture-integrity.mjs', '--json']);

            if ($audit->failed()) {
                throw new RuntimeException(trim($audit->errorOutput()) ?: 'The scripture-integrity audit failed.');
            }

            /** @var array{files: int, errors: int, warnings: int}|null $auditReport */
            $auditReport = json_decode(trim($audit->output()), true);
            if (! is_array($auditReport)) {
                throw new RuntimeException('The scripture-integrity audit returned an unreadable report.');
            }
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info("Imported {$result['imported']} OEB books.");
        $this->info("Integrity audit passed for {$auditReport['files']} books ({$auditReport['errors']} known errors, {$auditReport['warnings']} known warnings; no baseline drift).");
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
