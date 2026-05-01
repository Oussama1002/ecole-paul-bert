<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

abstract class BaseApiFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function messages(): array
    {
        return [
            '*.required' => 'Ce champ est obligatoire.',
            '*.string' => 'Ce champ doit être un texte.',
            '*.integer' => 'Ce champ doit être un nombre entier.',
            '*.numeric' => 'Ce champ doit être un nombre.',
            '*.boolean' => 'Ce champ doit être vrai ou faux.',
            '*.array' => 'Ce champ doit être une liste.',
            '*.date' => 'Ce champ doit être une date valide.',
            '*.date_format' => 'Le format de date est invalide.',
            '*.exists' => 'La valeur sélectionnée est invalide.',
            '*.in' => 'La valeur sélectionnée est invalide.',
            '*.min' => 'La valeur est trop petite.',
            '*.max' => 'La valeur est trop grande.',
            '*.email' => 'Adresse e-mail invalide.',
            '*.file' => 'Un fichier valide est attendu.',
            '*.mimes' => 'Format de fichier non autorisé.',
            '*.image' => 'Le fichier doit être une image.',
        ];
    }
}
