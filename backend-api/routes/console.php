<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Support\Qa\ClientFlowRunner;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

Artisan::command('qa:client-flow-test', function () {
    $result = app(ClientFlowRunner::class)->run();
    $this->line(json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    if (($result['status'] ?? 'failed') !== 'passed') {
        return 1;
    }

    return 0;
})->purpose('Run client end-to-end QA flow checks');
