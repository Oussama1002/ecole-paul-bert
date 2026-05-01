<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SchoolClassResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'level_id' => $this->level_id,
            'school_year_id' => $this->school_year_id,
            'name' => $this->name,
            'code' => $this->code,
            'section' => $this->section,
            'max_students' => $this->max_students,
            'room_label' => $this->room_label,
            'main_teacher_id' => $this->main_teacher_id,
            'status' => $this->status,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'level' => LevelResource::make($this->whenLoaded('level')),
            'school_year' => SchoolYearResource::make($this->whenLoaded('schoolYear')),
            'main_teacher' => $this->whenLoaded('mainTeacher', function () {
                if (! $this->mainTeacher) {
                    return null;
                }

                return [
                    'id' => $this->mainTeacher->id,
                    'first_name' => $this->mainTeacher->first_name,
                    'last_name' => $this->mainTeacher->last_name,
                    'employee_code' => $this->mainTeacher->employee_code,
                ];
            }),
        ];
    }
}
