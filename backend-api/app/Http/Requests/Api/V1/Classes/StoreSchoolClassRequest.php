<?php

namespace App\Http\Requests\Api\V1\Classes;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSchoolClassRequest extends FormRequest
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
            'level_id' => ['required', 'integer', 'exists:levels,id'],
            'school_year_id' => ['prohibited'],
            'school_year_ids' => ['sometimes', 'nullable', 'array'],
            'school_year_ids.*' => ['integer', 'exists:school_years,id'],
            'name' => ['required', 'string', 'max:100'],
            'code' => [
                'sometimes',
                'string',
                'max:50',
                Rule::unique('classes', 'code'),
            ],
            'section' => ['nullable', 'string', 'max:100'],
            'max_students' => ['nullable', 'integer', 'min:1'],
            'room_label' => ['nullable', 'string', 'max:100'],
            'main_teacher_id' => ['nullable', 'integer', 'exists:teachers,id'],
            'status' => ['sometimes', 'string', 'in:active,inactive,archived'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('status')) {
            $this->merge(['status' => 'active']);
        }

        // Code is auto-generated from the name (unique per school year, hidden from the form)
        if (! $this->filled('code') && $this->filled('name')) {
            $base = strtoupper(\Illuminate\Support\Str::slug((string) $this->input('name'))) ?: 'CLS';
            $base = substr($base, 0, 40);
            $code = $base;
            $n = 1;
            while (\App\Models\SchoolClass::query()->where('code', $code)->exists()) {
                $n++;
                $code = $base.'-'.$n;
            }
            $this->merge(['code' => $code]);
        }
    }
}
