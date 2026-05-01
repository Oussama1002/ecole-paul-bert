<?php

namespace App\Http\Requests\Api\V1\Attendance;

use Illuminate\Foundation\Http\FormRequest;

class StoreAttendanceRecordRequest extends FormRequest
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
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'teacher_id' => ['nullable', 'integer', 'exists:teachers,id'],
            'schedule_entry_id' => ['nullable', 'integer', 'exists:schedule_entries,id'],
            'attendance_date' => ['required', 'date'],
            'attendance_status' => ['required', 'in:present,absent,late'],
            'minutes_late' => ['nullable', 'integer', 'min:0', 'max:600'],
            'remarks' => ['nullable', 'string', 'max:2000'],
        ];
    }
}

