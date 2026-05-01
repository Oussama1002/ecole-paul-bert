<?php

namespace App\Http\Requests\Api\V1\Attendance;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAttendanceRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'attendance_status' => ['sometimes', 'in:present,absent,late'],
            'minutes_late' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:600'],
            'remarks' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}

