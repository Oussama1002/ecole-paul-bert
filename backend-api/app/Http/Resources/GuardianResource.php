<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GuardianResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'relationship_type' => $this->relationship_type,
            'phone' => $this->phone,
            'alternate_phone' => $this->alternate_phone,
            'email' => $this->email,
            'profession' => $this->profession,
            'national_id' => $this->national_id,
            'address' => $this->address,
            'city' => $this->city,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'pivot' => $this->when($this->pivot !== null, function () {
                return [
                    'is_legal_guardian' => (bool) $this->pivot->is_legal_guardian,
                    'can_receive_notifications' => (bool) $this->pivot->can_receive_notifications,
                    'can_pickup_student' => (bool) $this->pivot->can_pickup_student,
                    'is_primary_contact' => (bool) ($this->pivot->is_primary_contact ?? false),
                ];
            }),
        ];
    }
}
