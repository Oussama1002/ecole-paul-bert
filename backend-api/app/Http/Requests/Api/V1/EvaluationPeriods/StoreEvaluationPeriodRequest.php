<?php

namespace App\Http\Requests\Api\V1\EvaluationPeriods;

use App\Models\AcademicTerm;
use App\Models\EvaluationPeriod;
use App\Models\SchoolYear;
use App\Support\DateRangeOverlap;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEvaluationPeriodRequest extends FormRequest
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
        $syId = $this->input('school_year_id');

        return [
            'school_year_id' => ['required', 'integer', 'exists:school_years,id'],
            'term_id' => ['nullable', 'integer', 'exists:academic_terms,id'],
            'name' => ['required', 'string', 'max:100'],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('evaluation_periods', 'code')->where(
                    fn ($q) => $q->where('school_year_id', $syId)
                ),
            ],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'is_closed' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('sort_order')) {
            $syId = $this->input('school_year_id');
            $max = $syId
                ? (int) EvaluationPeriod::query()->where('school_year_id', $syId)->max('sort_order')
                : 0;
            $this->merge(['sort_order' => $max + 1]);
        }

        $this->merge([
            'is_closed' => $this->boolean('is_closed'),
        ]);
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $syId = $this->input('school_year_id');
            $termId = $this->input('term_id');
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

            if ($termId) {
                $term = AcademicTerm::query()->find($termId);
                if (! $term) {
                    return;
                }
                if ((int) $term->school_year_id !== (int) $syId) {
                    $validator->errors()->add('term_id', 'Le trimestre doit appartenir à la même année scolaire.');

                    return;
                }
                if ($s->lt($term->start_date->copy()->startOfDay()) || $e->gt($term->end_date->copy()->startOfDay())) {
                    $validator->errors()->add('start_date', 'Les dates doivent être incluses dans le trimestre sélectionné.');
                }
            }

            $ranges = EvaluationPeriod::query()
                ->where('school_year_id', $syId)
                ->get(['start_date', 'end_date'])
                ->map(fn ($p) => [
                    'start' => $p->start_date->copy()->startOfDay(),
                    'end' => $p->end_date->copy()->startOfDay(),
                ]);
            if (DateRangeOverlap::overlapsAny($s, $e, $ranges)) {
                $validator->errors()->add('start_date', 'Chevauchement avec une autre période d’évaluation sur cette année.');
            }
        });
    }
}
