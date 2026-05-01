<?php

namespace App\Http\Requests\Api\V1\SchoolYears;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSchoolYearRequest extends FormRequest
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
        $year = $this->route('schoolYear');

        return [
            'name' => [
                'sometimes',
                'string',
                'max:50',
                Rule::unique('school_years', 'name')->ignore($year->id),
            ],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date', 'after:start_date'],
            'is_current' => ['sometimes', 'boolean'],
            'status' => ['sometimes', Rule::in(['planned', 'active', 'closed'])],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $start = $this->input('start_date', $this->route('schoolYear')->start_date?->format('Y-m-d'));
            $end = $this->input('end_date', $this->route('schoolYear')->end_date?->format('Y-m-d'));
            if ($start && $end && strtotime((string) $end) <= strtotime((string) $start)) {
                $validator->errors()->add('end_date', 'La date de fin doit être postérieure à la date de début.');
            }
        });
    }
}
