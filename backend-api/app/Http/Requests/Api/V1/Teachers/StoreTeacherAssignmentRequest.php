<?php

namespace App\Http\Requests\Api\V1\Teachers;

use App\Models\Teacher;
use App\Models\TeacherClassSubject;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreTeacherAssignmentRequest extends FormRequest
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
            'class_id' => ['required', 'integer', Rule::exists('classes', 'id')],
            'subject_id' => ['required', 'integer', Rule::exists('subjects', 'id')],
            'school_year_id' => ['required', 'integer', Rule::exists('school_years', 'id')],
            'weekly_hours' => ['nullable', 'numeric', 'min:0', 'max:80'],
            'is_primary' => ['sometimes', 'boolean'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var Teacher $teacher */
            $teacher = $this->route('teacher');
            if (! $this->filled(['class_id', 'subject_id', 'school_year_id'])) {
                return;
            }
            $exists = TeacherClassSubject::query()
                ->where('teacher_id', $teacher->id)
                ->where('class_id', (int) $this->input('class_id'))
                ->where('subject_id', (int) $this->input('subject_id'))
                ->where('school_year_id', (int) $this->input('school_year_id'))
                ->exists();
            if ($exists) {
                $validator->errors()->add(
                    'class_id',
                    'Une affectation identique existe déjà pour cette année scolaire.'
                );
            }
        });
    }
}
