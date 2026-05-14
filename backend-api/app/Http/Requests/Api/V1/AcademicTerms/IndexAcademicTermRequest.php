<?php

namespace App\Http\Requests\Api\V1\AcademicTerms;

use Illuminate\Foundation\Http\FormRequest;

class IndexAcademicTermRequest extends FormRequest
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
            'school_year_id' => ['sometimes', 'nullable', 'integer', 'exists:school_years,id'],
            'is_active' => ['sometimes', 'nullable', 'boolean'],
            'sort_by' => ['sometimes', 'string', 'in:id,sort_order,start_date,end_date,created_at'],
            'sort_order' => ['sometimes', 'string', 'in:asc,desc'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'per_page' => $this->input('per_page', 50),
            'sort_by' => $this->input('sort_by', 'sort_order'),
            'sort_order' => $this->input('sort_order', 'asc'),
        ]);
    }
}
