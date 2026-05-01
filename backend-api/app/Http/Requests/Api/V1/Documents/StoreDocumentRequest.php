<?php

namespace App\Http\Requests\Api\V1\Documents;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $allowedMimes = array_values(array_filter((array) config('documents.upload.allowed_mimes')));
        $maxKb = (int) (config('documents.upload.max_kb') ?? 10240);
        $scopes = (array) config('documents.visibility_scopes');

        return [
            'file' => ['required', 'file', 'max:'.$maxKb, Rule::mimetypes($allowedMimes)],
            'category' => ['nullable', 'string', 'max:50'],
            'document_type' => ['nullable', 'string', 'max:50'],
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'visibility_scope' => ['nullable', Rule::in($scopes)],
            'is_confidential' => ['nullable', 'boolean'],

            'student_id' => ['nullable', 'integer', 'exists:students,id'],
            'teacher_id' => ['nullable', 'integer', 'exists:teachers,id'],
            'invoice_id' => ['nullable', 'integer', 'exists:invoices,id'],
            'payment_id' => ['nullable', 'integer', 'exists:payments,id'],
            'expense_id' => ['nullable', 'integer', 'exists:expenses,id'],
        ];
    }
}

