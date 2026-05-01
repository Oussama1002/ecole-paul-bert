<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class TeacherDocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $url = null;
        if ($this->file_path && Storage::disk('public')->exists($this->file_path)) {
            $url = Storage::disk('public')->url($this->file_path);
        }

        return [
            'id' => $this->id,
            'teacher_id' => $this->teacher_id,
            'document_type' => $this->document_type,
            'title' => $this->title,
            'file_path' => $this->file_path,
            'file_url' => $url,
            'uploaded_by' => $this->uploaded_by,
            'issued_at' => $this->issued_at?->format('Y-m-d'),
            'expires_at' => $this->expires_at?->format('Y-m-d'),
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
