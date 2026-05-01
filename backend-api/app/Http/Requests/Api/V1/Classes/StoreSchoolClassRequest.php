<?php

namespace App\Http\Requests\Api\V1\Classes;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSchoolClassRequest extends FormRequest
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
        $schoolYearId = $this->input('school_year_id');

        return [
            'level_id' => ['required', 'integer', 'exists:levels,id'],
            'school_year_id' => ['required', 'integer', 'exists:school_years,id'],
            'name' => ['required', 'string', 'max:100'],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('classes', 'code')->where(
                    fn ($q) => $q->where('school_year_id', $schoolYearId)
                ),
            ],
            'section' => ['nullable', 'string', 'max:100'],
            'max_students' => ['nullable', 'integer', 'min:1'],
            'room_label' => ['nullable', 'string', 'max:100'],
            'main_teacher_id' => ['nullable', 'integer', 'exists:teachers,id'],
            'status' => ['sometimes', 'string', 'in:active,inactive,archived'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('status')) {
            $this->merge(['status' => 'active']);
        }
    }
}
