<?php

namespace App\Http\Requests\Api\V1\Schedule;

use App\Http\Requests\Api\V1\BaseApiFormRequest;
use App\Models\ScheduleEntry;
use App\Models\SchoolClass;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateScheduleEntryRequest extends BaseApiFormRequest
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

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'school_year_id' => 'année scolaire',
            'class_id' => 'classe',
            'subject_id' => 'matière',
            'teacher_id' => 'enseignant',
            'room_id' => 'salle',
            'day_of_week' => 'jour',
            'start_time' => 'heure de début',
            'end_time' => 'heure de fin',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return array_merge(parent::messages(), [
            'class_id.exists' => 'La classe sélectionnée n’existe pas.',
            'school_year_id.exists' => 'L’année scolaire sélectionnée n’existe pas.',
            'term_id.exists' => 'La période sélectionnée n’appartient pas à cette année scolaire.',
            'subject_id.exists' => 'La matière sélectionnée n’existe pas.',
            'teacher_id.exists' => 'L’enseignant sélectionné n’existe pas.',
            'room_id.exists' => 'La salle sélectionnée n’existe pas.',
            'day_of_week.in' => 'Le jour sélectionné est invalide.',
            'start_time.regex' => 'L’heure de début doit être au format HH:MM.',
            'end_time.regex' => 'L’heure de fin doit être au format HH:MM.',
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            if ($v->errors()->isNotEmpty()) {
                return;
            }
            /** @var ScheduleEntry $entry */
            $entry = $this->route('scheduleEntry');
            $schoolYearId = (int) ($this->input('school_year_id') ?? $entry->school_year_id);
            $classId = (int) ($this->input('class_id') ?? $entry->class_id);
            $class = SchoolClass::query()->find($classId);
            if (! $class || ! $class->isOfferedInSchoolYear($schoolYearId)) {
                $v->errors()->add(
                    'class_id',
                    'Cette classe n’est pas rattachée à l’année scolaire sélectionnée.'
                );

                return;
            }

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
