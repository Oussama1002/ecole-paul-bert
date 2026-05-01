<?php

namespace App\Http\Requests\Api\V1\Enrollments;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEnrollmentRequest extends FormRequest
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
            'class_id' => ['sometimes', 'integer', 'exists:classes,id'],
            'enrollment_number' => ['sometimes', 'string', 'max:100'],
            'enrollment_date' => ['sometimes', 'date'],
            'academic_status' => ['sometimes', Rule::in([
                'enrolled', 're_enrolled', 'transferred_in', 'transferred_out', 'completed', 'cancelled',
            ])],
            'admission_type' => ['sometimes', Rule::in(['new', 'renewal', 'transfer'])],
            'registration_status' => ['sometimes', Rule::in(['draft', 'submitted', 'validated', 'rejected'])],
            'remarks' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
