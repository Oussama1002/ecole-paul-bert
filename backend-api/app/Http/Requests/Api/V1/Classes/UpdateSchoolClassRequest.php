<?php

namespace App\Http\Requests\Api\V1\Classes;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSchoolClassRequest extends FormRequest
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
        $schoolClass = $this->route('schoolClass');

        return [
            'level_id' => ['sometimes', 'integer', 'exists:levels,id'],
            'school_year_id' => ['prohibited'],
            'school_year_ids' => ['sometimes', 'nullable', 'array'],
            'school_year_ids.*' => ['integer', 'exists:school_years,id'],
            'name' => ['sometimes', 'string', 'max:100'],
            'code' => [
                'sometimes',
                'string',
                'max:50',
                Rule::unique('classes', 'code')->ignore($schoolClass->id),
            ],
            'section' => ['sometimes', 'nullable', 'string', 'max:100'],
            'max_students' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'room_label' => ['sometimes', 'nullable', 'string', 'max:100'],
            'main_teacher_id' => ['sometimes', 'nullable', 'integer', 'exists:teachers,id'],
            'status' => ['sometimes', 'string', 'in:active,inactive,archived'],
        ];
    }
}
