<?php

namespace App\Http\Requests\Api\V1\AcademicTerms;

use App\Models\AcademicTerm;
use App\Models\SchoolYear;
use App\Support\DateRangeOverlap;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;

class StoreAcademicTermRequest extends FormRequest
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
            'school_year_id' => ['required', 'integer', 'exists:school_years,id'],
            'name' => ['required', 'string', 'max:100'],
            'code' => ['required', 'string', 'max:50'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'sort_order' => $this->input('sort_order', 1),
            'is_active' => $this->boolean('is_active', true),
        ]);
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $syId = $this->input('school_year_id');
            $start = $this->input('start_date');
            $end = $this->input('end_date');
            if (! $syId || ! $start || ! $end) {
                return;
            }
            $sy = SchoolYear::query()->find($syId);
            if (! $sy) {
                return;
            }
            $s = Carbon::parse((string) $start)->startOfDay();
            $e = Carbon::parse((string) $end)->startOfDay();
            if ($s->lt($sy->start_date->copy()->startOfDay()) || $e->gt($sy->end_date->copy()->startOfDay())) {
                $validator->errors()->add('start_date', 'Les dates doivent être incluses dans l’année scolaire.');
            }

            $ranges = AcademicTerm::query()
                ->where('school_year_id', $syId)
                ->get(['start_date', 'end_date'])
                ->map(fn ($t) => [
                    'start' => $t->start_date->copy()->startOfDay(),
                    'end' => $t->end_date->copy()->startOfDay(),
                ]);
            if (DateRangeOverlap::overlapsAny($s, $e, $ranges)) {
                $validator->errors()->add('start_date', 'Chevauchement avec un autre trimestre sur cette année.');
            }
        });
    }
}
