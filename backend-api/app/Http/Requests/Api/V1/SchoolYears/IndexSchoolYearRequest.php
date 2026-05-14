<?php

namespace App\Http\Requests\Api\V1\SchoolYears;

use Illuminate\Foundation\Http\FormRequest;

class IndexSchoolYearRequest extends FormRequest
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
            'status' => ['sometimes', 'nullable', 'string', 'in:planned,active,closed'],
            'is_current' => ['sometimes', 'nullable', 'boolean'],
            'sort_by' => ['sometimes', 'string', 'in:id,name,start_date,end_date,created_at'],
            'sort_order' => ['sometimes', 'string', 'in:asc,desc'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'per_page' => $this->input('per_page', 15),
            'sort_by' => $this->input('sort_by', 'start_date'),
            'sort_order' => $this->input('sort_order', 'desc'),
        ]);
    }
}
