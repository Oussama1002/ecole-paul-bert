<?php

namespace App\Http\Requests\Api\V1\ReportCards;

use App\Http\Requests\Api\V1\BaseApiFormRequest;

class GenerateReportCardRequest extends BaseApiFormRequest
{
    public function rules(): array
    {
        return [
            'school_year_id' => ['required', 'integer', 'exists:school_years,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'evaluation_period_id' => ['required', 'integer', 'exists:evaluation_periods,id'],
        ];
    }
}
