<?php

namespace App\Http\Requests\Api\V1\SimpleFinance;

use App\Http\Requests\Api\V1\BaseApiFormRequest;
use App\Models\FinanceJournalEntry;
use Illuminate\Validation\Rule;

class IndexSimpleFinanceJournalRequest extends BaseApiFormRequest
{
    public function rules(): array
    {
        return [
            'month' => 'nullable|date_format:Y-m',
            'from' => 'nullable|date',
            'to' => 'nullable|date',
            'entry_type' => ['nullable', Rule::in(FinanceJournalEntry::TYPES)],
            'cost_type' => ['nullable', Rule::in(FinanceJournalEntry::COST_TYPES)],
            'include_deleted' => 'nullable|boolean',
            'per_page' => 'nullable|integer|min:1|max:500',
        ];
    }
}
