<?php

namespace App\Http\Requests\Api\V1\Finance;

use Illuminate\Foundation\Http\FormRequest;

class UpdateExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'school_year_id' => ['sometimes', 'nullable', 'integer', 'exists:school_years,id'],
            'expense_category_id' => ['sometimes', 'integer', 'exists:expense_categories,id'],
            'expense_date' => ['sometimes', 'date'],
            'amount' => ['sometimes', 'numeric', 'min:0.01'],
            'cost_type' => ['sometimes', 'in:fixed,variable'],
            'vendor' => ['sometimes', 'nullable', 'string', 'max:150'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ];
    }
}

