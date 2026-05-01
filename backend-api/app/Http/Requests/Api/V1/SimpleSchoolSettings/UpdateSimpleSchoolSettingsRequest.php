<?php

namespace App\Http\Requests\Api\V1\SimpleSchoolSettings;

use App\Http\Requests\Api\V1\BaseApiFormRequest;

class UpdateSimpleSchoolSettingsRequest extends BaseApiFormRequest
{
    public function rules(): array
    {
        return [
            'school' => ['sometimes', 'array'],
            'school.name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'school.address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'school.city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'school.phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'school.email' => ['sometimes', 'nullable', 'string', 'max:150'],

            'bulletin' => ['sometimes', 'array'],
            'bulletin.title' => ['sometimes', 'nullable', 'string', 'max:150'],
            'bulletin.signature_line' => ['sometimes', 'nullable', 'string', 'max:500'],
            'bulletin.footer_line' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'bulletin.show_attendance' => ['sometimes', 'boolean'],
            'bulletin.show_ranking' => ['sometimes', 'boolean'],
            'bulletin.principal_comment' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'bulletin.teacher_comment' => ['sometimes', 'nullable', 'string', 'max:2000'],

            'attendance_alerts' => ['sometimes', 'array'],
            'attendance_alerts.window_days' => ['sometimes', 'integer', 'min:7', 'max:120'],
            'attendance_alerts.unjustified_absences' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'attendance_alerts.late_count' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'current_school_year_id' => ['sometimes', 'nullable', 'integer', 'exists:school_years,id'],

            'finance_journal' => ['sometimes', 'array'],
            'finance_journal.income_labels' => ['sometimes', 'array', 'max:20'],
            'finance_journal.income_labels.*' => ['string', 'max:60'],
            'finance_journal.expense_labels' => ['sometimes', 'array', 'max:20'],
            'finance_journal.expense_labels.*' => ['string', 'max:60'],
        ];
    }
}
