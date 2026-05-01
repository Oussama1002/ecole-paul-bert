<?php

namespace App\Http\Requests\Api\V1\Subjects;

use Illuminate\Foundation\Http\FormRequest;

class StoreSubjectRequest extends FormRequest
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
            'level_id' => ['nullable', 'integer', 'exists:levels,id'],
            'name' => ['required', 'string', 'max:150'],
            'code' => ['required', 'string', 'max:50', 'unique:subjects,code'],
            'description' => ['nullable', 'string'],
            'coefficient' => ['nullable', 'numeric', 'min:0', 'max:999.99'],
            'is_optional' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'string', 'in:active,inactive'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'coefficient' => $this->input('coefficient', 1),
            'status' => $this->input('status', 'active'),
            'is_optional' => $this->boolean('is_optional'),
        ]);
    }
}
