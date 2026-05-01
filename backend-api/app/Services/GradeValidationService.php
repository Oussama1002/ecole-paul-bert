<?php

namespace App\Services;

use App\Models\EvaluationPeriod;
use Illuminate\Validation\ValidationException;

class GradeValidationService
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function validateBusinessRules(array $payload): void
    {
        /** @var EvaluationPeriod $period */
        $period = EvaluationPeriod::query()->findOrFail((int) $payload['evaluation_period_id']);

        $schoolYearId = (int) $payload['school_year_id'];
        if ((int) $period->school_year_id !== $schoolYearId) {
            throw ValidationException::withMessages([
                'evaluation_period_id' => ['La période ne correspond pas à l’année scolaire.'],
            ]);
        }

        if (! empty($payload['term_id']) && (int) $period->term_id !== (int) $payload['term_id']) {
            throw ValidationException::withMessages([
                'term_id' => ['Le trimestre/semestre ne correspond pas à la période.'],
            ]);
        }

        // Locking: period closed => forbid changes (handled in controller where needed)

        $score = (float) $payload['score'];
        $max = (float) $payload['max_score'];
        if ($score > $max) {
            throw ValidationException::withMessages([
                'score' => ['La note ne peut pas dépasser la note maximale.'],
            ]);
        }
    }
}

