<?php

namespace App\Http\Requests\Api\V1\SimpleSchoolSettings;

use App\Http\Requests\Api\V1\BaseApiFormRequest;

class UploadSimpleSchoolLogoRequest extends BaseApiFormRequest
{
    public function rules(): array
    {
        // String 'image' rule — Rule::image() doesn't exist on older Laravel
        return [
            'logo' => ['required', 'file', 'image', 'max:2048'],
        ];
    }
}
