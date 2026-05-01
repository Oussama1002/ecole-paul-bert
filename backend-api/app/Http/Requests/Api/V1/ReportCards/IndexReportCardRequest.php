<?php

namespace App\Http\Requests\Api\V1\ReportCards;

use App\Http\Requests\Api\V1\BaseApiFormRequest;

class IndexReportCardRequest extends BaseApiFormRequest
{
    public function rules(): array
    {
        return [
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'evaluation_period_id' => ['nullable', 'integer', 'exists:evaluation_periods,id'],
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'student_id' => ['nullable', 'integer', 'exists:students,id'],
            'status' => ['nullable', 'in:draft,published,archived'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
