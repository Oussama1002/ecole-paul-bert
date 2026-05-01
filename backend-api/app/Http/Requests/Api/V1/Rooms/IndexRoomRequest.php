<?php

namespace App\Http\Requests\Api\V1\Rooms;

use Illuminate\Foundation\Http\FormRequest;

class IndexRoomRequest extends FormRequest
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
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'room_type' => ['sometimes', 'nullable', 'string', 'in:classroom,lab,hall,office,library,sports,other'],
            'status' => ['sometimes', 'nullable', 'string', 'in:available,unavailable,maintenance'],
            'sort_by' => ['sometimes', 'string', 'in:id,name,code,capacity,created_at'],
            'sort_order' => ['sometimes', 'string', 'in:asc,desc'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'per_page' => $this->input('per_page', 30),
            'sort_by' => $this->input('sort_by', 'name'),
            'sort_order' => $this->input('sort_order', 'asc'),
        ]);
    }
}
