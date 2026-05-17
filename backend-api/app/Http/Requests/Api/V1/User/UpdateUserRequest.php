<?php

namespace App\Http\Requests\Api\V1\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
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
        $user = $this->route('user');

        return [
            'role_id' => ['sometimes', 'integer', 'exists:roles,id'],
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'email' => [
                'sometimes',
                'string',
                'email',
                'max:150',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'username' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('users', 'username')->ignore($user->id),
            ],
            'phone' => ['nullable', 'string', 'max:30'],
            'password' => ['sometimes', 'nullable', 'string', 'min:8', 'confirmed'],
            'status' => ['sometimes', 'string', Rule::in(['active', 'inactive', 'suspended'])],
            'gender' => ['nullable', 'string', Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => ['nullable', 'date'],
            'address' => ['nullable', 'string', 'max:65535'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.email' => "L'e-mail n'est pas valide.",
            'email.unique' => 'Cet e-mail est déjà utilisé par un autre compte.',
            'username.unique' => 'Cet identifiant est déjà utilisé.',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $user = $this->route('user');
            $actor = $this->user();

            if (
                $this->filled('status')
                && $this->input('status') !== 'active'
                && $actor
                && $user
                && (int) $actor->id === (int) $user->id
            ) {
                $validator->errors()->add('status', 'Vous ne pouvez pas désactiver votre propre compte.');
            }
        });
    }
}
