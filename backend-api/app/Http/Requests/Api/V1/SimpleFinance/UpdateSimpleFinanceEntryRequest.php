<?php

namespace App\Http\Requests\Api\V1\SimpleFinance;

use App\Http\Requests\Api\V1\BaseApiFormRequest;
use App\Models\FinanceJournalEntry;
use Illuminate\Validation\Rule;

class UpdateSimpleFinanceEntryRequest extends BaseApiFormRequest
{
    public function rules(): array
    {
        return [
            'entry_date' => ['sometimes', 'date'],
            'entry_type' => ['sometimes', Rule::in(FinanceJournalEntry::TYPES)],
            'cost_type' => ['nullable', Rule::in(FinanceJournalEntry::COST_TYPES)],
            'category' => ['nullable', 'string', 'max:80'],
            'label' => ['sometimes', 'string', 'max:160'],
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'note' => ['nullable', 'string', 'max:2000'],
            'attachment' => ['nullable', 'file', 'max:5120', 'mimes:pdf,jpg,jpeg,png,webp'],
        ];
    }
}
