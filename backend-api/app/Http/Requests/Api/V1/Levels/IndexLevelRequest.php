<?php

namespace App\Http\Requests\Api\V1\Levels;

use Illuminate\Foundation\Http\FormRequest;

class IndexLevelRequest extends FormRequest
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
            'sort_by' => ['sometimes', 'string', 'in:id,name,code,sort_order,created_at'],
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
