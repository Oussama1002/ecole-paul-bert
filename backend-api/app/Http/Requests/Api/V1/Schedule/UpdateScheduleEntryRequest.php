<?php

namespace App\Http\Requests\Api\V1\Schedule;

use App\Models\ScheduleEntry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateScheduleEntryRequest extends FormRequest
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
        $entry = $this->route('scheduleEntry');
        $schoolYearId = (int) ($this->input('school_year_id') ?? $entry->school_year_id);

        return [
            'school_year_id' => ['sometimes', 'integer', 'exists:school_years,id'],
            'term_id' => [
                'nullable',
                'integer',
                Rule::exists('academic_terms', 'id')->where(
                    fn ($q) => $q->where('school_year_id', $schoolYearId)
                ),
            ],
            'class_id' => ['sometimes', 'integer', 'exists:classes,id'],
            'subject_id' => ['sometimes', 'integer', 'exists:subjects,id'],
            'teacher_id' => ['sometimes', 'integer', 'exists:teachers,id'],
            'room_id' => ['nullable', 'integer', 'exists:rooms,id'],
            'day_of_week' => ['sometimes', Rule::in([
                'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
            ])],
            'start_time' => ['sometimes', 'string', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'end_time' => ['sometimes', 'string', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'session_type' => ['sometimes', Rule::in(['course', 'exam', 'support', 'activity', 'meeting'])],
            'is_recurring' => ['sometimes', 'boolean'],
            'effective_start_date' => ['nullable', 'date'],
            'effective_end_date' => ['nullable', 'date', 'after_or_equal:effective_start_date'],
            'status' => ['sometimes', Rule::in(['draft', 'published', 'cancelled'])],
            'notes' => ['nullable', 'string'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            if ($v->errors()->isNotEmpty()) {
                return;
            }
            /** @var ScheduleEntry $entry */
            $entry = $this->route('scheduleEntry');
            $startRaw = $this->has('start_time')
                ? (string) $this->input('start_time')
                : (string) $entry->start_time;
            $endRaw = $this->has('end_time')
                ? (string) $this->input('end_time')
                : (string) $entry->end_time;
            $start = $this->normalizeTime($startRaw);
            $end = $this->normalizeTime($endRaw);
            if ($this->timeToMinutes($end) <= $this->timeToMinutes($start)) {
                $v->errors()->add(
                    'end_time',
                    'L’heure de fin doit être strictement après l’heure de début.'
                );
            }
        });
    }

    private function timeToMinutes(string $time): int
    {
        if (preg_match('/^(\d{2}):(\d{2})(?::(\d{2}))?/', $time, $m)) {
            return (int) $m[1] * 60 + (int) $m[2];
        }

        return 0;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('start_time')) {
            $this->merge(['start_time' => $this->normalizeTime((string) $this->input('start_time'))]);
        }
        if ($this->has('end_time')) {
            $this->merge(['end_time' => $this->normalizeTime((string) $this->input('end_time'))]);
        }
    }

    private function normalizeTime(string $t): string
    {
        $t = trim($t);
        if (preg_match('/^\d{2}:\d{2}$/', $t)) {
            return $t.':00';
        }

        return $t;
    }
}
