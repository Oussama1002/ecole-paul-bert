<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\DashboardDataService;
use App\Services\SimpleDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardDataService $dashboardData,
        private readonly SimpleDashboardService $simpleDashboard,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();
        $user->loadMissing('role');

        $schoolYearId = $request->filled('school_year_id')
            ? (int) $request->input('school_year_id')
            : null;

        $data = $this->dashboardData->build($user, $schoolYearId);

        return ApiResponse::success($data, 'Tableau de bord.');
    }

    /**
     * Simple-mode dashboard: 5 headline KPIs + revenue trend.
     * Same permission as the rich dashboard (dashboard.view).
     */
    public function simple(Request $request): JsonResponse
    {
        $request->validate([
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
        ]);

        $schoolYearId = $request->filled('school_year_id')
            ? (int) $request->input('school_year_id')
            : null;

        $data = $this->simpleDashboard->build($schoolYearId);

        return ApiResponse::success($data, 'Tableau de bord simple.');
    }
}
