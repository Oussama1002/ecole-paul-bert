<?php

namespace App\Http\Requests\Api\V1\Guardians;

use Illuminate\Foundation\Http\FormRequest;

class AttachGuardianRequest extends FormRequest
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
            'guardian_id' => ['required', 'integer', 'exists:guardians,id'],
            'is_legal_guardian' => ['sometimes', 'boolean'],
            'can_receive_notifications' => ['sometimes', 'boolean'],
            'can_pickup_student' => ['sometimes', 'boolean'],
            'is_primary_contact' => ['sometimes', 'boolean'],
        ];
    }

}
