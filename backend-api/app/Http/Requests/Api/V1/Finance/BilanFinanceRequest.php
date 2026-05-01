<?php

namespace App\Http\Requests\Api\V1\Finance;

use Illuminate\Foundation\Http\FormRequest;

class BilanFinanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'period_type' => ['nullable', 'in:monthly,yearly,custom'],
        ];
    }
}
