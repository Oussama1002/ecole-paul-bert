<?php

namespace App\Http\Requests\Api\V1\Schedule;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexScheduleEntryRequest extends FormRequest
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
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'teacher_id' => ['nullable', 'integer', 'exists:teachers,id'],
            'room_id' => ['nullable', 'integer', 'exists:rooms,id'],
            'day_of_week' => ['nullable', Rule::in([
                'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
            ])],
            'status' => ['nullable', Rule::in(['draft', 'published', 'cancelled'])],
            'sort_by' => ['nullable', 'string', Rule::in(['day_of_week', 'start_time', 'created_at'])],
            'sort_order' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'sort_by' => $this->input('sort_by', 'day_of_week'),
            'sort_order' => $this->input('sort_order', 'asc'),
            'per_page' => $this->input('per_page', 50),
        ]);
    }
}
