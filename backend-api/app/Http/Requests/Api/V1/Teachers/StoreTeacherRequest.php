<?php

namespace App\Http\Requests\Api\V1\Teachers;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTeacherRequest extends FormRequest
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
            'user_id' => ['nullable', 'integer'],
            'employee_code' => ['required', 'string', 'max:50', Rule::unique('teachers', 'employee_code')],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:150'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => ['nullable', 'date'],
            'hire_date' => ['nullable', 'date'],
            'qualification' => ['nullable', 'string', 'max:255'],
            'specialization' => ['nullable', 'string', 'max:255'],
            'employment_type' => ['sometimes', Rule::in(['full_time', 'part_time', 'contract', 'temporary'])],
            'years_experience' => ['nullable', 'integer', 'min:0', 'max:80'],
            'salary_base' => ['nullable', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'suspended', 'left'])],
            'emergency_contact_name' => ['nullable', 'string', 'max:150'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string'],
        ];
    }

    protected function prepareForValidation(): void
    {
        // Status defaults to active
        if (! $this->has('status') || ! $this->filled('status')) {
            $this->merge(['status' => 'active']);
        }

        // Auto-generate a unique employee_code if missing or already taken
        $current = $this->input('employee_code');
        $needsGen = ! is_string($current) || trim($current) === '';
        if (! $needsGen) {
            $taken = \App\Models\Teacher::query()
                ->where('employee_code', $current)
                ->exists();
            $needsGen = $taken;
        }
        if ($needsGen) {
            $year = now()->year;
            $prefix = 'ENS-'.$year.'-';
            do {
                $code = $prefix.str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            } while (\App\Models\Teacher::query()->where('employee_code', $code)->exists());
            $this->merge(['employee_code' => $code]);
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'employee_code.required' => 'Le matricule est obligatoire.',
            'employee_code.unique' => 'Ce matricule est déjà utilisé.',
            'first_name.required' => 'Le prénom est obligatoire.',
            'last_name.required' => 'Le nom est obligatoire.',
            'email.email' => "L'e-mail n'est pas valide.",
        ];
    }
}
