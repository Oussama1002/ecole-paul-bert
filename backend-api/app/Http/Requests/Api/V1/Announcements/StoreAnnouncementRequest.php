<?php

namespace App\Http\Requests\Api\V1\Announcements;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'audience_type' => ['required', Rule::in(['all', 'students', 'teachers', 'staff', 'parents', 'class_specific'])],
            'class_id' => [
                'nullable',
                'integer',
                'exists:classes,id',
                Rule::requiredIf(fn () => $this->input('audience_type') === 'class_specific'),
            ],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'priority' => ['nullable', Rule::in(['low', 'normal', 'high', 'urgent'])],
            'status' => ['nullable', Rule::in(['draft', 'published', 'archived'])],
        ];
    }
}
