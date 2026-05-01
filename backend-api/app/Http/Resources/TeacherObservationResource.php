<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeacherObservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'teacher_id' => (int) $this->teacher_id,
            'type' => $this->type,
            'comment' => $this->comment,
            'created_by' => $this->created_by ? (int) $this->created_by : null,
            'created_at' => optional($this->created_at)->toIso8601String(),
            'updated_at' => optional($this->updated_at)->toIso8601String(),
            'author' => $this->whenLoaded('author', fn () => [
                'id' => $this->author?->id,
                'name' => trim(($this->author?->first_name ?? '').' '.($this->author?->last_name ?? '')) ?: $this->author?->email,
            ]),
        ];
    }
}
