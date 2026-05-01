<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EnrollmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'school_year_id' => $this->school_year_id,
            'class_id' => $this->class_id,
            'school_year_name' => $this->schoolYear?->name,
            'class_name' => $this->schoolClass?->name,
            'enrollment_number' => $this->enrollment_number,
            'enrollment_date' => $this->enrollment_date?->format('Y-m-d'),
            'academic_status' => $this->academic_status,
            'admission_type' => $this->admission_type,
            'registration_status' => $this->registration_status,
            'remarks' => $this->remarks,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'school_year' => SchoolYearResource::make($this->whenLoaded('schoolYear')),
            'school_class' => SchoolClassResource::make($this->whenLoaded('schoolClass')),
        ];
    }
}
