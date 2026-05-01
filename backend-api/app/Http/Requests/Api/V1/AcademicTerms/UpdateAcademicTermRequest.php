<?php

namespace App\Http\Requests\Api\V1\AcademicTerms;

use App\Models\AcademicTerm;
use App\Models\SchoolYear;
use App\Support\DateRangeOverlap;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAcademicTermRequest extends FormRequest
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
            'school_year_id' => ['sometimes', 'integer', 'exists:school_years,id'],
            'name' => ['sometimes', 'string', 'max:100'],
            'code' => ['sometimes', 'string', 'max:50'],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $term = $this->route('academicTerm');
            $syId = $this->input('school_year_id', $term->school_year_id);
            $start = $this->input('start_date', $term->start_date?->format('Y-m-d'));
            $end = $this->input('end_date', $term->end_date?->format('Y-m-d'));
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

            $ranges = AcademicTerm::query()
                ->where('school_year_id', $syId)
                ->where('id', '!=', $term->id)
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
