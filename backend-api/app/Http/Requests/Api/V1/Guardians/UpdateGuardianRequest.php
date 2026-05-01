<?php

namespace App\Http\Requests\Api\V1\Guardians;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGuardianRequest extends FormRequest
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
        $g = $this->route('guardian');

        return [
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'relationship_type' => ['sometimes', Rule::in(['father', 'mother', 'guardian', 'other'])],
            'phone' => ['sometimes', 'string', 'max:30', Rule::unique('guardians', 'phone')->ignore($g->id)],
            'alternate_phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'email' => ['sometimes', 'nullable', 'email', 'max:150', Rule::unique('guardians', 'email')->ignore($g->id)],
            'profession' => ['sometimes', 'nullable', 'string', 'max:150'],
            'national_id' => ['sometimes', 'nullable', 'string', 'max:100'],
            'address' => ['sometimes', 'nullable', 'string'],
            'city' => ['sometimes', 'nullable', 'string', 'max:100'],
        ];
    }
}
