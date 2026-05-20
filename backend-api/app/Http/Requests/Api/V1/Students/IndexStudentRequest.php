<?php

namespace App\Http\Requests\Api\V1\Students;

use Illuminate\Foundation\Http\FormRequest;

class IndexStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'status' => ['sometimes', 'nullable', 'string', 'in:pending,active,transferred,graduated,suspended,withdrawn,archived'],
            'school_year_id' => ['sometimes', 'nullable', 'integer', 'exists:school_years,id'],
            'level_id' => ['sometimes', 'nullable', 'integer', 'exists:levels,id'],
            'class_id' => ['sometimes', 'nullable', 'integer', 'exists:classes,id'],
            'sort_by' => ['sometimes', 'string', 'in:id,student_code,first_name,last_name,created_at'],
            'sort_order' => ['sometimes', 'string', 'in:asc,desc'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'per_page' => $this->input('per_page', 25),
            'sort_by' => $this->input('sort_by', 'last_name'),
            'sort_order' => $this->input('sort_order', 'asc'),
        ]);
    }
}
