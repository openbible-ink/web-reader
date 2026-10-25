<?php

use App\Services\OebSourcePatcher;
use Tests\TestCase;

uses(TestCase::class);

test('it applies and reports documented OEB source patches', function () {
    $source = <<<'USFM'
\id EZK
\c 37
\v 28 My dwelling place also shall be with them; and I will be their God, and they shall be my people.
\v 29 And the nations shall know that I am Jehovah who sanctifieth Israel, when my sanctuary shall be in the midst of them forevermore.”’
USFM;

    $result = app(OebSourcePatcher::class)->apply('26-Ezekiel.usfm.db', $source);

    expect($result['applied'])->toBe(['oeb-ezk-37-verse-numbering-001'])
        ->and($result['source'])->toContain('\\v 27 My dwelling place')
        ->and($result['source'])->toContain('\\v 28 And the nations')
        ->and($result['source'])->not->toContain('\\v 29 And the nations');
});

test('it fails visibly when upstream no longer matches a documented patch', function () {
    $alreadyCorrected = <<<'USFM'
\id EZK
\c 37
\v 27 My dwelling place also shall be with them; and I will be their God, and they shall be my people.
\v 28 And the nations shall know that I am Jehovah who sanctifieth Israel, when my sanctuary shall be in the midst of them forevermore.”’
USFM;

    expect(fn () => app(OebSourcePatcher::class)->apply('26-Ezekiel.usfm.db', $alreadyCorrected))
        ->toThrow(RuntimeException::class, 'upstream may have corrected this text');
});
