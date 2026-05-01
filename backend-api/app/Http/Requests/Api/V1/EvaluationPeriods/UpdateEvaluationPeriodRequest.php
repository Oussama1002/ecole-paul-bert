<?php

namespace App\Http\Requests\Api\V1\EvaluationPeriods;

use App\Models\AcademicTerm;
use App\Models\EvaluationPeriod;
use App\Models\SchoolYear;
use App\Support\DateRangeOverlap;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEvaluationPeriodRequest extends FormRequest
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
        $period = $this->route('evaluationPeriod');
        $syId = $this->input('school_year_id', $period->school_year_id);

        return [
            'school_year_id' => ['sometimes', 'integer', 'exists:school_years,id'],
            'term_id' => ['sometimes', 'nullable', 'integer', 'exists:academic_terms,id'],
            'name' => ['sometimes', 'string', 'max:100'],
            'code' => [
                'sometimes',
                'string',
                'max:50',
                Rule::unique('evaluation_periods', 'code')
                    ->where(fn ($q) => $q->where('school_year_id', $syId))
                    ->ignore($period->id),
            ],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date'],
            'is_closed' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $period = $this->route('evaluationPeriod');
            $syId = $this->input('school_year_id', $period->school_year_id);
            $termId = $this->input('term_id', $period->term_id);
            $start = $this->input('start_date', $period->start_date?->format('Y-m-d'));
            $end = $this->input('end_date', $period->end_date?->format('Y-m-d'));
            if (! $syId || ! $start || ! $end) {
                return;
            }
            if (strtotime((string) $end) <= strtotime((string) $start)) {
                $validator->errors()->add('end_date', 'La date de fin doit être postérieure à la date de début.');

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
                ->where('id', '!=', $period->id)
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
