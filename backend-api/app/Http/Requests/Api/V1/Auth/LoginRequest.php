<?php

namespace App\Http\Requests\Api\V1\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
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
            // Accepte email OU identifiant (username) pour la connexion.
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ];
    }
}
