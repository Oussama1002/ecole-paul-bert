<?php

namespace App\Http\Requests\Api\V1\Rooms;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoomRequest extends FormRequest
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
        $room = $this->route('room');

        return [
            'name' => ['sometimes', 'string', 'max:100'],
            'code' => [
                'sometimes',
                'string',
                'max:50',
                Rule::unique('rooms', 'code')->ignore($room->id),
            ],
            'room_type' => ['sometimes', Rule::in(['classroom', 'lab', 'hall', 'office', 'library', 'sports', 'other'])],
            'capacity' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'in:available,unavailable,maintenance'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
