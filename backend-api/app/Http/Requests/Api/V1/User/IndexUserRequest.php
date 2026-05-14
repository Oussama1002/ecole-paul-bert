<?php

namespace App\Http\Requests\Api\V1\User;

use Illuminate\Foundation\Http\FormRequest;

class IndexUserRequest extends FormRequest
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
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'role_id' => ['sometimes', 'nullable', 'integer', 'exists:roles,id'],
            'status' => ['sometimes', 'nullable', 'string', 'in:active,inactive,suspended'],
            'sort_by' => ['sometimes', 'string', 'in:id,created_at,email,last_name,last_login_at'],
            'sort_order' => ['sometimes', 'string', 'in:asc,desc'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'per_page' => $this->input('per_page', 15),
            'sort_by' => $this->input('sort_by', 'created_at'),
            'sort_order' => $this->input('sort_order', 'desc'),
        ]);
    }
}
