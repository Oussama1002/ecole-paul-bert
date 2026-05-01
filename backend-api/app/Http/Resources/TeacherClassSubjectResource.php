<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeacherClassSubjectResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'teacher_id' => $this->teacher_id,
            'class_id' => $this->class_id,
            'subject_id' => $this->subject_id,
            'school_year_id' => $this->school_year_id,
            'weekly_hours' => $this->weekly_hours !== null ? (string) $this->weekly_hours : null,
            'is_primary' => $this->is_primary,
            'status' => $this->status,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'school_class' => $this->whenLoaded('schoolClass', function () {
                $c = $this->schoolClass;

                return [
                    'id' => $c->id,
                    'name' => $c->name,
                    'code' => $c->code,
                    'level_id' => $c->level_id,
                ];
            }),
            'subject' => $this->whenLoaded('subject', function () {
                $s = $this->subject;

                return [
                    'id' => $s->id,
                    'name' => $s->name,
                    'code' => $s->code,
                ];
            }),
            'school_year' => $this->whenLoaded('schoolYear', function () {
                $y = $this->schoolYear;

                return [
                    'id' => $y->id,
                    'name' => $y->name,
                ];
            }),
        ];
    }
}
