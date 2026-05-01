<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScheduleEntryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'school_year_id' => $this->school_year_id,
            'term_id' => $this->term_id,
            'class_id' => $this->class_id,
            'subject_id' => $this->subject_id,
            'teacher_id' => $this->teacher_id,
            'room_id' => $this->room_id,
            'day_of_week' => $this->day_of_week,
            'start_time' => is_string($this->start_time) ? substr($this->start_time, 0, 5) : $this->start_time,
            'end_time' => is_string($this->end_time) ? substr($this->end_time, 0, 5) : $this->end_time,
            'session_type' => $this->session_type,
            'is_recurring' => (bool) $this->is_recurring,
            'effective_start_date' => $this->effective_start_date?->format('Y-m-d'),
            'effective_end_date' => $this->effective_end_date?->format('Y-m-d'),
            'status' => $this->status,
            'notes' => $this->notes,
            'school_class' => $this->whenLoaded('schoolClass', function () {
                $c = $this->schoolClass;

                return ['id' => $c->id, 'name' => $c->name, 'code' => $c->code];
            }),
            'subject' => $this->whenLoaded('subject', function () {
                $s = $this->subject;

                return ['id' => $s->id, 'name' => $s->name, 'code' => $s->code];
            }),
            'room' => $this->whenLoaded('room', function () {
                $r = $this->room;

                return $r ? ['id' => $r->id, 'name' => $r->name, 'code' => $r->code] : null;
            }),
            'teacher' => $this->whenLoaded('teacher', function () {
                $t = $this->teacher;

                return [
                    'id' => $t->id,
                    'first_name' => $t->first_name,
                    'last_name' => $t->last_name,
                    'employee_code' => $t->employee_code,
                ];
            }),
        ];
    }
}
