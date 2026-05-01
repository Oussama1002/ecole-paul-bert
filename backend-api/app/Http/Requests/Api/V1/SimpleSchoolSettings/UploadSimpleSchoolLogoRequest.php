<?php

namespace App\Http\Requests\Api\V1\SimpleSchoolSettings;

use App\Http\Requests\Api\V1\BaseApiFormRequest;
use Illuminate\Validation\Rule;

class UploadSimpleSchoolLogoRequest extends BaseApiFormRequest
{
    public function rules(): array
    {
        return [
            'logo' => ['required', 'file', 'max:2048', Rule::image()],
        ];
    }
}
