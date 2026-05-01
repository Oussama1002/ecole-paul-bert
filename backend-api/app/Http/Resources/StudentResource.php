<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_code' => $this->student_code,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'first_name_ar' => $this->first_name_ar,
            'last_name_ar' => $this->last_name_ar,
            'photo_path' => $this->photo_path,
            'gender' => $this->gender,
            'date_of_birth' => $this->date_of_birth?->format('Y-m-d'),
            'place_of_birth' => $this->place_of_birth,
            'nationality' => $this->nationality,
            'address' => $this->address,
            'city' => $this->city,
            'status' => $this->status,
            'admission_date' => $this->admission_date?->format('Y-m-d'),
            'registration_date' => $this->registration_date?->format('Y-m-d'),
            'previous_school' => $this->previous_school,
            'blood_group' => $this->blood_group,
            'medical_notes' => $this->medical_notes,
            'special_needs' => $this->special_needs,
            'emergency_contact_name' => $this->emergency_contact_name,
            'emergency_contact_phone' => $this->emergency_contact_phone,
            'parent_phone_1' => $this->parent_phone_1,
            'parent_phone_2' => $this->parent_phone_2,
            'parent_phone_3' => $this->parent_phone_3,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
            'guardians' => GuardianResource::collection($this->whenLoaded('guardians')),
            'enrollments' => EnrollmentResource::collection($this->whenLoaded('enrollments')),
        ];
    }
}
