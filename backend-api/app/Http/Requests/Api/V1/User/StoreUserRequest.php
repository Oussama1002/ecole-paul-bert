<?php

namespace App\Http\Requests\Api\V1\User;

use App\Models\Role;
use App\Models\Teacher;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];

        if ($this->has('username') && trim((string) $this->input('username')) === '') {
            $merge['username'] = null;
        }

        if ($this->filled('teacher_id')) {
            $teacher = Teacher::query()->find((int) $this->input('teacher_id'));
            if ($teacher) {
                if (! $this->filled('email') && filled($teacher->email)) {
                    $merge['email'] = $teacher->email;
                }
                if (! $this->filled('first_name')) {
                    $merge['first_name'] = $teacher->first_name;
                }
                if (! $this->filled('last_name')) {
                    $merge['last_name'] = $teacher->last_name;
                }
                if (! $this->filled('phone') && filled($teacher->phone)) {
                    $merge['phone'] = $teacher->phone;
                }
            }
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'teacher_id' => ['nullable', 'integer', 'exists:teachers,id'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:150', 'unique:users,email'],
            'username' => ['nullable', 'string', 'max:100', 'unique:users,username'],
            'phone' => ['nullable', 'string', 'max:30'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'status' => ['sometimes', 'string', Rule::in(['active', 'inactive', 'suspended'])],
            'gender' => ['nullable', 'string', Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => ['nullable', 'date'],
            'address' => ['nullable', 'string', 'max:65535'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $roleId = (int) $this->input('role_id');
            if ($roleId <= 0) {
                $validator->errors()->add('role_id', 'Le rôle est obligatoire.');

                return;
            }

            $teacherId = $this->input('teacher_id');
            if ($teacherId === null || $teacherId === '') {
                return;
            }

            $role = Role::query()->find($roleId);
            if ($role?->code !== 'teacher') {
                $validator->errors()->add(
                    'teacher_id',
                    'La fiche enseignant ne peut être liée qu’à un compte avec le rôle Enseignant.'
                );

                return;
            }

            $teacher = Teacher::query()->find((int) $teacherId);
            if (! $teacher) {
                return;
            }

            if ($teacher->user_id !== null) {
                $validator->errors()->add(
                    'teacher_id',
                    'Cet enseignant a déjà un compte utilisateur lié.'
                );
            }

            if (! filled($teacher->email) && ! $this->filled('email')) {
                $validator->errors()->add(
                    'email',
                    'Renseignez un e-mail pour ce compte (la fiche enseignant n’en a pas).'
                );
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'role_id.required' => 'Le rôle est obligatoire.',
            'first_name.required' => 'Le prénom est obligatoire.',
            'last_name.required' => 'Le nom est obligatoire.',
            'email.required' => "L'e-mail est obligatoire.",
            'email.email' => "L'e-mail n'est pas valide.",
            'email.unique' => 'Cet e-mail est déjà utilisé par un autre compte.',
            'username.unique' => 'Cet identifiant est déjà utilisé.',
            'password.required' => 'Le mot de passe est obligatoire.',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
            'teacher_id.exists' => 'Fiche enseignant introuvable.',
        ];
    }
}
