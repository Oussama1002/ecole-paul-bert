<?php

namespace App\Support;

use App\Models\AppSetting;

/**
 * Configurable bulletin template.
 *
 * The template lives as a single JSON blob in `app_settings` under the key
 * `report_card_template`. It is intentionally small: a fixed set of section
 * keys the Blade view knows how to render, with per-section `enabled` + `label`
 * and — when applicable — a list of nested `fields` / `columns`.
 *
 * Rationale: we keep the real computation (averages, rank, attendance, PDF
 * engine) untouched. The template only controls which blocks are rendered,
 * their order, their labels, and a handful of school-branding strings.
 */
final class ReportCardTemplate
{
    public const SETTING_KEY = 'report_card_template';

    /**
     * All section keys recognised by the Blade view.
     * Unknown keys coming from a saved template are silently ignored.
     *
     * @var list<string>
     */
    public const KNOWN_SECTIONS = [
        'header',
        'student_info',
        'kpis',
        'subjects_table',
        'appreciation',
        'signature',
        'footer',
    ];

    /**
     * Shape of the default template. Returned whenever the setting is empty
     * or malformed; also used to `reset` the saved template.
     *
     * @return array<string, mixed>
     */
    public static function default(): array
    {
        return [
            'school' => [
                'name' => 'École Paul Bert',
                'address' => '',
                'city' => '',
                'phone' => '',
                'email' => '',
                'logo_path' => null,
            ],
            'title' => 'Bulletin de notes',
            'simple_options' => [
                'show_attendance' => true,
                'show_ranking' => true,
                'principal_comment' => '',
                'teacher_comment' => '',
            ],
            'sections' => [
                [
                    'key' => 'header',
                    'enabled' => true,
                    'label' => 'En-tête',
                ],
                [
                    'key' => 'student_info',
                    'enabled' => true,
                    'label' => 'Informations de l’élève',
                    'fields' => [
                        ['key' => 'student_name', 'label' => 'Élève', 'enabled' => true],
                        ['key' => 'student_code', 'label' => 'Matricule', 'enabled' => true],
                        ['key' => 'class', 'label' => 'Classe', 'enabled' => true],
                        ['key' => 'period', 'label' => 'Période', 'enabled' => true],
                        ['key' => 'date_of_birth', 'label' => 'Date de naissance', 'enabled' => false],
                    ],
                ],
                [
                    'key' => 'kpis',
                    'enabled' => true,
                    'label' => 'Résultats synthétiques',
                    'fields' => [
                        ['key' => 'period_average', 'label' => 'Moyenne période', 'enabled' => true],
                        ['key' => 'rank', 'label' => 'Rang', 'enabled' => true],
                        ['key' => 'absent_count', 'label' => 'Absences', 'enabled' => true],
                        ['key' => 'late_count', 'label' => 'Retards', 'enabled' => true],
                    ],
                ],
                [
                    'key' => 'subjects_table',
                    'enabled' => true,
                    'label' => 'Moyennes par matière',
                    'columns' => [
                        ['key' => 'subject', 'label' => 'Matière', 'enabled' => true],
                        ['key' => 'average', 'label' => 'Moyenne /20', 'enabled' => true],
                        ['key' => 'appreciation', 'label' => 'Appréciation', 'enabled' => false],
                    ],
                ],
                [
                    'key' => 'appreciation',
                    'enabled' => false,
                    'label' => 'Appréciation du conseil',
                    'text' => '',
                ],
                [
                    'key' => 'signature',
                    'enabled' => true,
                    'label' => 'Signature',
                    'text' => 'Le directeur',
                ],
                [
                    'key' => 'footer',
                    'enabled' => true,
                    'label' => 'Pied de page',
                    'text' => 'École Paul Bert — Bulletin',
                ],
            ],
        ];
    }

    /**
     * Read the currently saved template, merged on top of defaults so new
     * sections introduced by the code are always present.
     *
     * @return array<string, mixed>
     */
    public static function get(): array
    {
        $raw = AppSetting::get(self::SETTING_KEY);

        if (! is_array($raw)) {
            return self::default();
        }

        return self::sanitize($raw);
    }

    /**
     * Persist a validated template. `$userId` is recorded on the setting row
     * for audit purposes.
     *
     * @param  array<string, mixed>  $template
     * @return array<string, mixed>
     */
    public static function save(array $template, ?int $userId = null): array
    {
        $clean = self::sanitize($template);
        AppSetting::set(self::SETTING_KEY, $clean, $userId, 'json');

        return $clean;
    }

    public static function reset(?int $userId = null): array
    {
        return self::save(self::default(), $userId);
    }

    /**
     * Normalise a template coming from the client: merge with defaults, drop
     * unknown section keys, coerce all toggles to booleans, guarantee
     * label/text strings exist. This is also the single source of truth used
     * by the Blade view, so any shape bug dies here.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function sanitize(array $input): array
    {
        $default = self::default();

        $school = is_array($input['school'] ?? null) ? $input['school'] : [];
        $cleanSchool = [
            'name' => self::asTrimmedString($school['name'] ?? $default['school']['name']),
            'address' => self::asTrimmedString($school['address'] ?? ''),
            'city' => self::asTrimmedString($school['city'] ?? ''),
            'phone' => self::asTrimmedString($school['phone'] ?? ''),
            'email' => self::asTrimmedString($school['email'] ?? ''),
            'logo_path' => isset($school['logo_path']) && is_string($school['logo_path']) && $school['logo_path'] !== ''
                ? $school['logo_path']
                : null,
        ];

        $title = self::asTrimmedString($input['title'] ?? $default['title']);
        $simple = is_array($input['simple_options'] ?? null) ? $input['simple_options'] : [];
        $simpleDefault = $default['simple_options'];
        $cleanSimple = [
            'show_attendance' => self::asBool($simple['show_attendance'] ?? $simpleDefault['show_attendance']),
            'show_ranking' => self::asBool($simple['show_ranking'] ?? $simpleDefault['show_ranking']),
            'principal_comment' => self::asTrimmedString($simple['principal_comment'] ?? $simpleDefault['principal_comment']),
            'teacher_comment' => self::asTrimmedString($simple['teacher_comment'] ?? $simpleDefault['teacher_comment']),
        ];

        $sectionDefaults = [];
        foreach ($default['sections'] as $s) {
            $sectionDefaults[$s['key']] = $s;
        }

        $incomingSections = is_array($input['sections'] ?? null) ? $input['sections'] : [];

        $sanitizedSections = [];
        $seen = [];

        // Preserve the client-provided order for recognised sections.
        foreach ($incomingSections as $section) {
            if (! is_array($section)) {
                continue;
            }
            $key = $section['key'] ?? null;
            if (! is_string($key) || ! in_array($key, self::KNOWN_SECTIONS, true)) {
                continue;
            }
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;

            $sanitizedSections[] = self::sanitizeSection($sectionDefaults[$key], $section);
        }

        // Append any known section the client omitted (defaults, disabled if the
        // user chose to remove it via toggle rather than reorder). This keeps
        // new code-side sections visible after a release.
        foreach (self::KNOWN_SECTIONS as $key) {
            if (! isset($seen[$key])) {
                $sanitizedSections[] = $sectionDefaults[$key];
            }
        }

        return [
            'school' => $cleanSchool,
            'title' => $title !== '' ? $title : $default['title'],
            'simple_options' => $cleanSimple,
            'sections' => $sanitizedSections,
        ];
    }

    /**
     * Merge identity + bulletin basics from the simple-mode settings screen (no section reorder).
     *
     * @param  array<string, mixed>  $schoolPatch  name, address, city, phone, email, logo_path
     * @param  array<string, mixed>  $bulletinPatch  title, signature_line, footer_line
     * @return array<string, mixed>  Saved full template
     */
    public static function patchFromSimpleSettings(array $schoolPatch, array $bulletinPatch, ?int $userId = null): array
    {
        $tpl = self::get();
        $default = self::default();

        $school = array_merge($default['school'], $tpl['school']);
        $allowedSchool = ['name', 'address', 'city', 'phone', 'email', 'logo_path'];
        foreach ($allowedSchool as $key) {
            if (! array_key_exists($key, $schoolPatch)) {
                continue;
            }
            $v = $schoolPatch[$key];
            if ($key === 'logo_path') {
                $school[$key] = is_string($v) && $v !== '' ? $v : null;
            } else {
                $school[$key] = self::asTrimmedString(is_string($v) ? $v : '');
            }
        }
        if (($school['name'] ?? '') === '') {
            $school['name'] = $default['school']['name'];
        }
        $tpl['school'] = $school;

        if (array_key_exists('title', $bulletinPatch)) {
            $t = self::asTrimmedString(is_string($bulletinPatch['title']) ? $bulletinPatch['title'] : '');
            $tpl['title'] = $t !== '' ? $t : $default['title'];
        }
        $simple = array_merge(
            $default['simple_options'] ?? [],
            is_array($tpl['simple_options'] ?? null) ? $tpl['simple_options'] : []
        );
        if (array_key_exists('show_attendance', $bulletinPatch)) {
            $simple['show_attendance'] = self::asBool($bulletinPatch['show_attendance']);
        }
        if (array_key_exists('show_ranking', $bulletinPatch)) {
            $simple['show_ranking'] = self::asBool($bulletinPatch['show_ranking']);
        }
        if (array_key_exists('principal_comment', $bulletinPatch) && is_string($bulletinPatch['principal_comment'])) {
            $simple['principal_comment'] = self::asTrimmedString($bulletinPatch['principal_comment']);
        }
        if (array_key_exists('teacher_comment', $bulletinPatch) && is_string($bulletinPatch['teacher_comment'])) {
            $simple['teacher_comment'] = self::asTrimmedString($bulletinPatch['teacher_comment']);
        }
        $tpl['simple_options'] = $simple;

        $textBySection = [
            'signature' => isset($bulletinPatch['signature_line']) && is_string($bulletinPatch['signature_line'])
                ? self::asTrimmedString($bulletinPatch['signature_line'])
                : null,
            'footer' => isset($bulletinPatch['footer_line']) && is_string($bulletinPatch['footer_line'])
                ? self::asTrimmedString($bulletinPatch['footer_line'])
                : null,
        ];

        foreach ($tpl['sections'] as $i => $section) {
            $key = $section['key'] ?? null;
            if (! is_string($key)) {
                continue;
            }
            if ($key === 'signature' && $textBySection['signature'] !== null) {
                $tpl['sections'][$i]['text'] = $textBySection['signature'];
            }
            if ($key === 'footer' && $textBySection['footer'] !== null) {
                $tpl['sections'][$i]['text'] = $textBySection['footer'];
            }
        }

        return self::save($tpl, $userId);
    }

    /**
     * @param  array<string, mixed>  $defaultSection
     * @param  array<string, mixed>  $given
     * @return array<string, mixed>
     */
    private static function sanitizeSection(array $defaultSection, array $given): array
    {
        $out = [
            'key' => $defaultSection['key'],
            'enabled' => self::asBool($given['enabled'] ?? $defaultSection['enabled'] ?? true),
            'label' => self::asTrimmedString($given['label'] ?? $defaultSection['label'] ?? ''),
        ];

        if (array_key_exists('text', $defaultSection)) {
            $out['text'] = self::asTrimmedString($given['text'] ?? $defaultSection['text'] ?? '');
        }

        foreach (['fields', 'columns'] as $listKey) {
            if (! array_key_exists($listKey, $defaultSection)) {
                continue;
            }

            $defaultList = $defaultSection[$listKey];
            $defaultByKey = [];
            foreach ($defaultList as $item) {
                $defaultByKey[$item['key']] = $item;
            }

            $incoming = is_array($given[$listKey] ?? null) ? $given[$listKey] : [];

            $sanitized = [];
            $innerSeen = [];

            foreach ($incoming as $item) {
                if (! is_array($item)) {
                    continue;
                }
                $k = $item['key'] ?? null;
                if (! is_string($k) || ! isset($defaultByKey[$k])) {
                    continue;
                }
                if (isset($innerSeen[$k])) {
                    continue;
                }
                $innerSeen[$k] = true;

                $sanitized[] = [
                    'key' => $k,
                    'label' => self::asTrimmedString($item['label'] ?? $defaultByKey[$k]['label']),
                    'enabled' => self::asBool($item['enabled'] ?? $defaultByKey[$k]['enabled']),
                ];
            }

            foreach ($defaultList as $item) {
                if (! isset($innerSeen[$item['key']])) {
                    $sanitized[] = $item;
                }
            }

            $out[$listKey] = $sanitized;
        }

        return $out;
    }

    private static function asBool(mixed $v): bool
    {
        if (is_bool($v)) {
            return $v;
        }
        if (is_numeric($v)) {
            return (int) $v === 1;
        }
        if (is_string($v)) {
            return in_array(strtolower($v), ['1', 'true', 'yes', 'on'], true);
        }

        return false;
    }

    private static function asTrimmedString(mixed $v): string
    {
        if (! is_string($v)) {
            return '';
        }

        return trim($v);
    }
}
