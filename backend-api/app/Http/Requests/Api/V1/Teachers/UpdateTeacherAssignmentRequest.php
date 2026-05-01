<?php

namespace App\Http\Requests\Api\V1\Teachers;

use App\Models\TeacherClassSubject;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateTeacherAssignmentRequest extends FormRequest
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
            'class_id' => ['sometimes', 'integer', Rule::exists('classes', 'id')],
            'subject_id' => ['sometimes', 'integer', Rule::exists('subjects', 'id')],
            'school_year_id' => ['sometimes', 'integer', Rule::exists('school_years', 'id')],
            'weekly_hours' => ['nullable', 'numeric', 'min:0', 'max:80'],
            'is_primary' => ['sometimes', 'boolean'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var TeacherClassSubject $assignment */
            $assignment = $this->route('teacherClassSubject');
            $teacherId = $assignment->teacher_id;
            $classId = (int) ($this->input('class_id') ?? $assignment->class_id);
            $subjectId = (int) ($this->input('subject_id') ?? $assignment->subject_id);
            $yearId = (int) ($this->input('school_year_id') ?? $assignment->school_year_id);

            $exists = TeacherClassSubject::query()
                ->where('teacher_id', $teacherId)
                ->where('class_id', $classId)
                ->where('subject_id', $subjectId)
                ->where('school_year_id', $yearId)
                ->where('id', '!=', $assignment->id)
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
