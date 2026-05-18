<?php

namespace App\Http\Requests\Api\V1\SimpleSchoolSettings;

use App\Http\Requests\Api\V1\BaseApiFormRequest;

class UploadSimpleSchoolLogoRequest extends BaseApiFormRequest
{
    public function rules(): array
    {
        // String 'image' rule — Rule::image() doesn't exist on older Laravel
        return [
            'logo' => ['required', 'file', 'image', 'max:10240'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'logo.required' => 'Veuillez sélectionner une image.',
            'logo.image' => "Le fichier doit être une image (JPG, PNG, GIF, WEBP).",
            'logo.max' => 'L\'image ne doit pas dépasser 10 Mo.',
        ];
    }
}
