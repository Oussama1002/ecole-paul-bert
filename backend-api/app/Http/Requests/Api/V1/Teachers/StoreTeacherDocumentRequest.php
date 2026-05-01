<?php

namespace App\Http\Requests\Api\V1\Teachers;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTeacherDocumentRequest extends FormRequest
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
            'file' => ['required', 'file', 'max:12288', 'mimes:pdf,doc,docx,jpg,jpeg,png'],
            'document_type' => [
                'required',
                'string',
                'max:100',
                Rule::in(['contract', 'certificate', 'addendum', 'id_proof', 'other']),
            ],
            'title' => ['nullable', 'string', 'max:255'],
            'issued_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after_or_equal:issued_at'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
