<?php

namespace App\Http\Requests\Api\V1\ReportCards;

use App\Http\Requests\Api\V1\BaseApiFormRequest;

class UpdateReportCardTemplateRequest extends BaseApiFormRequest
{
    public function rules(): array
    {
        return [
            'school' => ['sometimes', 'array'],
            'school.name' => ['nullable', 'string', 'max:150'],
            'school.address' => ['nullable', 'string', 'max:255'],
            'school.city' => ['nullable', 'string', 'max:100'],
            'school.phone' => ['nullable', 'string', 'max:50'],
            'school.email' => ['nullable', 'string', 'max:150'],
            'school.logo_path' => ['nullable', 'string', 'max:255'],

            'title' => ['nullable', 'string', 'max:150'],
            'simple_options' => ['sometimes', 'array'],
            'simple_options.show_attendance' => ['sometimes', 'boolean'],
            'simple_options.show_ranking' => ['sometimes', 'boolean'],
            'simple_options.principal_comment' => ['nullable', 'string', 'max:2000'],
            'simple_options.teacher_comment' => ['nullable', 'string', 'max:2000'],

            'sections' => ['required', 'array'],
            'sections.*.key' => ['required', 'string', 'max:50'],
            'sections.*.enabled' => ['sometimes', 'boolean'],
            'sections.*.label' => ['nullable', 'string', 'max:150'],
            'sections.*.text' => ['nullable', 'string', 'max:2000'],

            'sections.*.fields' => ['sometimes', 'array'],
            'sections.*.fields.*.key' => ['required_with:sections.*.fields', 'string', 'max:50'],
            'sections.*.fields.*.label' => ['nullable', 'string', 'max:150'],
            'sections.*.fields.*.enabled' => ['sometimes', 'boolean'],

            'sections.*.columns' => ['sometimes', 'array'],
            'sections.*.columns.*.key' => ['required_with:sections.*.columns', 'string', 'max:50'],
            'sections.*.columns.*.label' => ['nullable', 'string', 'max:150'],
            'sections.*.columns.*.enabled' => ['sometimes', 'boolean'],
        ];
    }
}
