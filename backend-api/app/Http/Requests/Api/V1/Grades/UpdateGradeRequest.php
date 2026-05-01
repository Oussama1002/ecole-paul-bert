<?php

namespace App\Http\Requests\Api\V1\Grades;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGradeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'score' => ['sometimes', 'numeric', 'min:0'],
            'max_score' => ['sometimes', 'numeric', 'min:1'],
            'coefficient' => ['sometimes', 'nullable', 'numeric', 'min:0.1', 'max:50'],
            'appreciation' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'is_validated' => ['sometimes', 'boolean'],
        ];
    }
}

