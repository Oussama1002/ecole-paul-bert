<?php

namespace App\Http\Requests\Api\V1\Enrollments;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEnrollmentRequest extends FormRequest
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
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'school_year_id' => ['required', 'integer', 'exists:school_years,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'enrollment_number' => ['required', 'string', 'max:100'],
            'enrollment_date' => ['required', 'date'],
            'academic_status' => ['sometimes', Rule::in([
                'enrolled', 're_enrolled', 'transferred_in', 'transferred_out', 'completed', 'cancelled',
            ])],
            'admission_type' => ['sometimes', Rule::in(['new', 'renewal', 'transfer'])],
            'registration_status' => ['sometimes', Rule::in(['draft', 'submitted', 'validated', 'rejected'])],
            'remarks' => ['nullable', 'string'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'academic_status' => $this->input('academic_status', 'enrolled'),
            'admission_type' => $this->input('admission_type', 'new'),
            'registration_status' => $this->input('registration_status', 'draft'),
        ]);
    }
}
