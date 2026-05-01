<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubjectResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'level_id' => $this->level_id,
            'name' => $this->name,
            'code' => $this->code,
            'description' => $this->description,
            'coefficient' => $this->coefficient !== null ? (string) $this->coefficient : null,
            'is_optional' => (bool) $this->is_optional,
            'status' => $this->status,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'level' => LevelResource::make($this->whenLoaded('level')),
        ];
    }
}
