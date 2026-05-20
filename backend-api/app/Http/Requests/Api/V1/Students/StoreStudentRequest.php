<?php

namespace App\Http\Requests\Api\V1\Students;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStudentRequest extends FormRequest
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
            'student_code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('students', 'student_code')->whereNull('deleted_at'),
            ],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'first_name_ar' => ['nullable', 'string', 'max:100'],
            'last_name_ar' => ['nullable', 'string', 'max:100'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => ['required', 'date', 'before:today'],
            'place_of_birth' => ['nullable', 'string', 'max:150'],
            'nationality' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'status' => ['sometimes', Rule::in(['pending', 'active', 'transferred', 'graduated', 'suspended', 'withdrawn', 'archived'])],
            'admission_date' => ['nullable', 'date'],
            'registration_date' => ['nullable', 'date'],
            'previous_school' => ['nullable', 'string', 'max:255'],
            'blood_group' => ['nullable', 'string', 'max:10'],
            'medical_notes' => ['nullable', 'string'],
            'special_needs' => ['nullable', 'string'],
            'emergency_contact_name' => ['nullable', 'string', 'max:150'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:30'],
            'parent_phone_1' => ['nullable', 'string', 'max:30'],
            'parent_phone_2' => ['nullable', 'string', 'max:30'],
            'parent_phone_3' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string'],
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $hasYear = $this->filled('school_year_id');
            $hasClass = $this->filled('class_id');
            if ($hasYear xor $hasClass) {
                $validator->errors()->add(
                    'class_id',
                    'Sélectionnez l’année scolaire et la classe pour inscrire l’élève.'
                );
            }
        });
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('status')) {
            $this->merge(['status' => 'active']);
        }

        // Auto-generate a unique student_code if missing or already taken
        $current = $this->input('student_code');
        $needsGen = ! is_string($current) || trim($current) === '';
        if (! $needsGen) {
            $taken = \App\Models\Student::query()
                ->whereNull('deleted_at')
                ->where('student_code', $current)
                ->exists();
            $needsGen = $taken;
        }
        if ($needsGen) {
            $year = now()->year;
            $prefix = 'ELE-'.$year.'-';
            do {
                $code = $prefix.str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            } while (
                \App\Models\Student::query()
                    ->whereNull('deleted_at')
                    ->where('student_code', $code)
                    ->exists()
            );
            $this->merge(['student_code' => $code]);
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'student_code.required' => 'Le matricule est obligatoire.',
            'student_code.unique' => 'Ce matricule est déjà utilisé par un autre élève.',
            'first_name.required' => 'Le prénom est obligatoire.',
            'last_name.required' => 'Le nom est obligatoire.',
            'date_of_birth.required' => 'La date de naissance est obligatoire.',
            'date_of_birth.before' => 'La date de naissance doit être antérieure à aujourd’hui.',
            'gender.in' => 'Le genre est invalide.',
        ];
    }
}
