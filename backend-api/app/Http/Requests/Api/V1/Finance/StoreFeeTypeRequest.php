<?php

namespace App\Http\Requests\Api\V1\Finance;

use Illuminate\Foundation\Http\FormRequest;

class StoreFeeTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'code' => ['required', 'string', 'max:50', 'unique:fee_types,code'],
            'frequency' => ['required', 'in:once,monthly,term,yearly'],
            'start_date' => ['required', 'date'],
            'default_amount' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Le libellé est obligatoire.',
            'code.required' => 'Le code est obligatoire.',
            'code.unique' => 'Ce code existe déjà (ex. MENSUEL). Modifiez le type existant dans la liste ou utilisez un autre code.',
            'frequency.required' => 'La périodicité est obligatoire.',
            'frequency.in' => 'Périodicité invalide.',
            'start_date.required' => 'La date de début des échéances est obligatoire.',
            'start_date.date' => 'Date de début invalide.',
            'default_amount.numeric' => 'Le montant doit être un nombre.',
            'default_amount.min' => 'Le montant ne peut pas être négatif.',
        ];
    }
}

