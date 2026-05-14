<?php

namespace App\Http\Requests\Api\V1\Announcements;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['nullable', Rule::in(['draft', 'published', 'archived'])],
            'audience_type' => ['nullable', Rule::in(['all', 'students', 'teachers', 'staff', 'parents', 'class_specific'])],
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:500'],
        ];
    }
}
