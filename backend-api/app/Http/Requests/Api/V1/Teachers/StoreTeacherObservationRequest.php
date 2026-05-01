<?php

namespace App\Http\Requests\Api\V1\Teachers;

use App\Models\TeacherObservation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTeacherObservationRequest extends FormRequest
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
            'type' => ['required', 'string', Rule::in(TeacherObservation::TYPES)],
            'comment' => ['required', 'string', 'max:4000'],
        ];
    }
}
