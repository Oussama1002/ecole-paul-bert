<?php

namespace App\Http\Requests\Api\V1\Finance;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFeeTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('feeType')?->id ?? null;

        return [
            'name' => ['sometimes', 'string', 'max:150'],
            'code' => ['sometimes', 'string', 'max:50', 'unique:fee_types,code,'.($id ?? 'NULL')],
            'frequency' => ['sometimes', 'in:once,monthly,term,yearly'],
            'start_date' => ['sometimes', 'nullable', 'date'],
            'default_amount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.unique' => 'Ce code est déjà utilisé par un autre type de frais.',
            'frequency.in' => 'Périodicité invalide.',
            'start_date.date' => 'Date de début invalide.',
            'default_amount.numeric' => 'Le montant doit être un nombre.',
            'default_amount.min' => 'Le montant ne peut pas être négatif.',
        ];
    }
}

