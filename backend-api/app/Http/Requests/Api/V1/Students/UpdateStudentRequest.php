<?php

namespace App\Http\Requests\Api\V1\Students;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStudentRequest extends FormRequest
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
        $student = $this->route('student');

        return [
            'student_code' => [
                'sometimes',
                'string',
                'max:50',
                Rule::unique('students', 'student_code')
                    ->ignore($student->id)
                    ->whereNull('deleted_at'),
            ],
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'first_name_ar' => ['sometimes', 'nullable', 'string', 'max:100'],
            'last_name_ar' => ['sometimes', 'nullable', 'string', 'max:100'],
            'gender' => ['sometimes', 'nullable', Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => ['sometimes', 'date', 'before:today'],
            'place_of_birth' => ['sometimes', 'nullable', 'string', 'max:150'],
            'nationality' => ['sometimes', 'nullable', 'string', 'max:100'],
            'address' => ['sometimes', 'nullable', 'string'],
            'city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'status' => ['sometimes', Rule::in(['pending', 'active', 'transferred', 'graduated', 'suspended', 'withdrawn'])],
            'admission_date' => ['sometimes', 'nullable', 'date'],
            'registration_date' => ['sometimes', 'nullable', 'date'],
            'previous_school' => ['sometimes', 'nullable', 'string', 'max:255'],
            'blood_group' => ['sometimes', 'nullable', 'string', 'max:10'],
            'medical_notes' => ['sometimes', 'nullable', 'string'],
            'special_needs' => ['sometimes', 'nullable', 'string'],
            'emergency_contact_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'emergency_contact_phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'parent_phone_1' => ['sometimes', 'nullable', 'string', 'max:30'],
            'parent_phone_2' => ['sometimes', 'nullable', 'string', 'max:30'],
            'parent_phone_3' => ['sometimes', 'nullable', 'string', 'max:30'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
