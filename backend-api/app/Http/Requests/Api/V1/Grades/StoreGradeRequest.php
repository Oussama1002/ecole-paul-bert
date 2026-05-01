<?php

namespace App\Http\Requests\Api\V1\Grades;

use Illuminate\Foundation\Http\FormRequest;

class StoreGradeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'school_year_id' => ['required', 'integer', 'exists:school_years,id'],
            'term_id' => ['nullable', 'integer', 'exists:academic_terms,id'],
            'evaluation_period_id' => ['required', 'integer', 'exists:evaluation_periods,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'teacher_id' => ['nullable', 'integer', 'exists:teachers,id'],

            'score' => ['required', 'numeric', 'min:0'],
            'max_score' => ['required', 'numeric', 'min:1'],
            'coefficient' => ['nullable', 'numeric', 'min:0.1', 'max:50'],
            'appreciation' => ['nullable', 'string', 'max:2000'],
        ];
    }
}

