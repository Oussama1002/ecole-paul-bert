<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        try {
            DB::connection()->getPdo();
            $db = 'ok';
        } catch (\Throwable) {
            $db = 'error';
        }

        return ApiResponse::success([
            'app' => config('app.name'),
            'environment' => config('app.env'),
            'database' => $db,
        ], 'Service disponible.');
    }
}
