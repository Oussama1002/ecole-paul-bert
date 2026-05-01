<?php

namespace App\Http\Requests\Api\V1\Attendance;

use Illuminate\Foundation\Http\FormRequest;

class JustifyAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'is_justified' => ['required', 'boolean'],
            'justification_note' => ['nullable', 'string', 'max:2000'],
        ];
    }
}

