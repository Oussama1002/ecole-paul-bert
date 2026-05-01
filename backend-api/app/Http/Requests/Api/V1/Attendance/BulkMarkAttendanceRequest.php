<?php

namespace App\Http\Requests\Api\V1\Attendance;

use Illuminate\Foundation\Http\FormRequest;

class BulkMarkAttendanceRequest extends FormRequest
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
            'attendance_date' => ['required', 'date'],
            'schedule_entry_id' => ['nullable', 'integer', 'exists:schedule_entries,id'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'teacher_id' => ['nullable', 'integer', 'exists:teachers,id'],

            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.student_id' => ['required', 'integer', 'exists:students,id'],
            'items.*.attendance_status' => ['required', 'in:present,absent,late'],
            'items.*.minutes_late' => ['nullable', 'integer', 'min:0', 'max:600'],
            'items.*.remarks' => ['nullable', 'string', 'max:2000'],
        ];
    }
}

