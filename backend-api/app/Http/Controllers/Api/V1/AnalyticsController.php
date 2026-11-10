<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(private AnalyticsService $analytics) {}

    public function enrollment(): JsonResponse
    {
        return ApiResponse::success(
            $this->analytics->getEnrollmentTrends(),
            'Évolution des effectifs.'
        );
    }

    public function finance(Request $request): JsonResponse
    {
        $year = $this->yearParam($request);

        return ApiResponse::success(
            $this->analytics->getFinanceTrends($year),
            'Évolution financière.'
        );
    }

    public function attendance(Request $request): JsonResponse
    {
        $year = $this->yearParam($request);

        return ApiResponse::success(
            $this->analytics->getAttendanceTrends($year),
            'Évolution de l’assiduité.'
        );
    }

    public function grades(): JsonResponse
    {
        return ApiResponse::success(
            $this->analytics->getGradeTrends(),
            'Évolution des résultats scolaires.'
        );
    }

    public function teachers(): JsonResponse
    {
        return ApiResponse::success(
            $this->analytics->getTeacherTrends(),
            'Évolution du corps enseignant.'
        );
    }

    public function summary(): JsonResponse
    {
        return ApiResponse::success(
            $this->analytics->getSummary(),
            'Synthèse pluriannuelle.'
        );
    }

    private function yearParam(Request $request): ?string
    {
        $year = $request->query('year');

        return is_string($year) && trim($year) !== '' ? trim($year) : null;
    }
}
