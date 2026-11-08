<?php

namespace App\Http\Requests\Api\V1\Imports;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared validation for the bulk CSV/Excel import endpoints
 * (students & teachers). Accepts a single uploaded spreadsheet, max 5 MB.
 */
class ImportFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route-level permission middleware already gates access.
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // 5 MB = 5120 KB. `txt` is allowed because some browsers report
            // CSV uploads with a text/plain mime type.
            'file' => ['required', 'file', 'max:5120', 'mimes:csv,txt,xlsx,xls'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required' => 'Veuillez sélectionner un fichier à importer.',
            'file.file' => 'Le fichier téléversé est invalide.',
            'file.max' => 'Le fichier ne doit pas dépasser 5 Mo.',
            'file.mimes' => 'Formats acceptés : CSV, XLSX ou XLS.',
        ];
    }
}
