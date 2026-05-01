<?php

namespace App\Http\Requests\Api\V1\Subjects;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSubjectRequest extends FormRequest
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
        $subject = $this->route('subject');

        return [
            'level_id' => ['sometimes', 'nullable', 'integer', 'exists:levels,id'],
            'name' => ['sometimes', 'string', 'max:150'],
            'code' => [
                'sometimes',
                'string',
                'max:50',
                Rule::unique('subjects', 'code')->ignore($subject->id),
            ],
            'description' => ['sometimes', 'nullable', 'string'],
            'coefficient' => ['sometimes', 'numeric', 'min:0', 'max:999.99'],
            'is_optional' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'string', 'in:active,inactive'],
        ];
    }
}
