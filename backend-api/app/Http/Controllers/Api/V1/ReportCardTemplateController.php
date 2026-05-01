<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ReportCards\UpdateReportCardTemplateRequest;
use App\Http\Responses\ApiResponse;
use App\Services\AuditLogger;
use App\Support\ReportCardTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportCardTemplateController extends Controller
{
    public function __construct(
        private AuditLogger $audit
    ) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success([
            'template' => ReportCardTemplate::get(),
            'defaults' => ReportCardTemplate::default(),
        ], 'Modèle de bulletin.');
    }

    public function update(UpdateReportCardTemplateRequest $request): JsonResponse
    {
        $before = ReportCardTemplate::get();
        $data = $request->validated();

        $saved = ReportCardTemplate::save($data, $request->user()?->id);
        $this->audit->log(
            $request->user(),
            'settings.updated',
            null,
            ['report_card_template' => $before],
            ['report_card_template' => $saved],
            $request
        );

        return ApiResponse::success([
            'template' => $saved,
        ], 'Modèle de bulletin enregistré.');
    }

    public function reset(Request $request): JsonResponse
    {
        $before = ReportCardTemplate::get();
        $saved = ReportCardTemplate::reset($request->user()?->id);
        $this->audit->log(
            $request->user(),
            'settings.updated',
            null,
            ['report_card_template' => $before],
            ['report_card_template' => $saved],
            $request
        );

        return ApiResponse::success([
            'template' => $saved,
        ], 'Modèle de bulletin réinitialisé.');
    }
}
