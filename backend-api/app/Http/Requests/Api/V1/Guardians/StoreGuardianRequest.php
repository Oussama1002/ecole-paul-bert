<?php

namespace App\Http\Requests\Api\V1\Guardians;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGuardianRequest extends FormRequest
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
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'relationship_type' => ['required', Rule::in(['father', 'mother', 'guardian', 'other'])],
            'phone' => ['required', 'string', 'max:30', 'unique:guardians,phone'],
            'alternate_phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150', 'unique:guardians,email'],
            'profession' => ['nullable', 'string', 'max:150'],
            'national_id' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
        ];
    }
}
