<?php

namespace App\Http\Requests\Api\V1\SimpleFinance;

use App\Http\Requests\Api\V1\BaseApiFormRequest;

class SimpleFinanceSummaryRequest extends BaseApiFormRequest
{
    public function rules(): array
    {
        return [
            'month' => 'nullable|date_format:Y-m',
        ];
    }
}
