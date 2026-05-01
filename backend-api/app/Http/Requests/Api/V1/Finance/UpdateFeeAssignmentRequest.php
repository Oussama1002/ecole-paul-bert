<?php

namespace App\Http\Requests\Api\V1\Finance;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFeeAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount_due' => ['sometimes', 'numeric', 'min:0'],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'discount_amount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'scholarship_amount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}

