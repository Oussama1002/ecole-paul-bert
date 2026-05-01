<?php

namespace App\Http\Requests\Api\V1\Classes;

use Illuminate\Foundation\Http\FormRequest;

class IndexSchoolClassRequest extends FormRequest
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
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'school_year_id' => ['sometimes', 'nullable', 'integer', 'exists:school_years,id'],
            'level_id' => ['sometimes', 'nullable', 'integer', 'exists:levels,id'],
            'status' => ['sometimes', 'nullable', 'string', 'in:active,inactive,archived'],
            'sort_by' => ['sometimes', 'string', 'in:id,name,code,created_at'],
            'sort_order' => ['sometimes', 'string', 'in:asc,desc'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'per_page' => $this->input('per_page', 25),
            'sort_by' => $this->input('sort_by', 'name'),
            'sort_order' => $this->input('sort_order', 'asc'),
        ]);
    }
}
