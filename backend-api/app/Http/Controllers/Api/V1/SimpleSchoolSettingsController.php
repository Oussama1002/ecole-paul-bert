<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SimpleSchoolSettings\UpdateSimpleSchoolSettingsRequest;
use App\Http\Requests\Api\V1\SimpleSchoolSettings\UploadSimpleSchoolLogoRequest;
use App\Http\Responses\ApiResponse;
use App\Models\AppSetting;
use App\Models\SchoolYear;
use App\Models\User;
use App\Services\AuditLogger;
use App\Support\ReportCardTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Aggregated “simple mode” school settings: identity, bulletin basics on PDF,
 * attendance alert thresholds, journal label suggestions — no enterprise modules.
 */
class SimpleSchoolSettingsController extends Controller
{
    public function __construct(
        private AuditLogger $audit
    ) {}

    private const KEY_ATT_WINDOW = 'attendance_alert_window_days';

    private const KEY_ATT_ABSENCES = 'attendance_alert_unjustified_absences';

    private const KEY_ATT_LATES = 'attendance_alert_late_count';

    private const KEY_FIN_INCOME = 'finance_journal_income_labels';

    private const KEY_FIN_EXPENSE = 'finance_journal_expense_labels';

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $tpl = ReportCardTemplate::get();
        $school = $tpl['school'] ?? [];
        $currentYear = SchoolYear::query()
            ->where('is_current', true)
            ->first(['id', 'name']);
        $yearOptions = SchoolYear::query()
            ->orderByDesc('start_date')
            ->limit(50)
            ->get(['id', 'name', 'status', 'is_current']);

        $signature = collect($tpl['sections'] ?? [])->firstWhere('key', 'signature');
        $footer = collect($tpl['sections'] ?? [])->firstWhere('key', 'footer');
        $simpleOptions = is_array($tpl['simple_options'] ?? null) ? $tpl['simple_options'] : [];

        return ApiResponse::success([
            'school' => [
                'name' => (string) ($school['name'] ?? ''),
                'address' => (string) ($school['address'] ?? ''),
                'city' => (string) ($school['city'] ?? ''),
                'phone' => (string) ($school['phone'] ?? ''),
                'email' => (string) ($school['email'] ?? ''),
                'logo_path' => $school['logo_path'] ?? null,
                'logo_url' => $this->logoPublicUrl($school['logo_path'] ?? null),
            ],
            'current_school_year' => [
                'id' => $currentYear?->id ? (int) $currentYear->id : null,
                'name' => $currentYear?->name,
                'options' => $yearOptions->map(fn (SchoolYear $y) => [
                    'id' => (int) $y->id,
                    'name' => (string) $y->name,
                    'status' => (string) $y->status,
                    'is_current' => (bool) $y->is_current,
                ])->all(),
            ],
            'bulletin' => [
                'title' => (string) ($tpl['title'] ?? ''),
                'signature_line' => (string) ($signature['text'] ?? ''),
                'footer_line' => (string) ($footer['text'] ?? ''),
                'show_attendance' => (bool) ($simpleOptions['show_attendance'] ?? true),
                'show_ranking' => (bool) ($simpleOptions['show_ranking'] ?? true),
                'principal_comment' => (string) ($simpleOptions['principal_comment'] ?? ''),
                'teacher_comment' => (string) ($simpleOptions['teacher_comment'] ?? ''),
            ],
            'attendance_alerts' => [
                'window_days' => $this->intSetting(self::KEY_ATT_WINDOW, (int) config('attendance.alerts.window_days', 30)),
                'unjustified_absences' => $this->intSetting(self::KEY_ATT_ABSENCES, (int) config('attendance.alerts.unjustified_absences_threshold', 3)),
                'late_count' => $this->intSetting(self::KEY_ATT_LATES, (int) config('attendance.alerts.late_count_threshold', 5)),
            ],
            'finance_journal' => [
                'income_labels' => $this->labelListSetting(self::KEY_FIN_INCOME, $this->defaultIncomeLabels()),
                'expense_labels' => $this->labelListSetting(self::KEY_FIN_EXPENSE, $this->defaultExpenseLabels()),
            ],
            'meta' => [
                'can_edit' => $this->canEditSchoolBasics($user),
                'can_manage_structure' => $user?->hasPermission('classes.manage')
                    || $user?->hasPermission('levels.manage')
                    || $user?->hasPermission('subjects.manage'),
            ],
        ], 'Réglages école (mode simple).');
    }

    public function update(UpdateSimpleSchoolSettingsRequest $request): JsonResponse
    {
        $user = $request->user();
        if (! $this->canEditSchoolBasics($user)) {
            return ApiResponse::error('Accès refusé.', [], 403);
        }
        $before = $this->auditStateSnapshot();

        $data = $request->validated();

        if (isset($data['school'])) {
            $schoolPatch = array_filter([
                'name' => $data['school']['name'] ?? null,
                'address' => $data['school']['address'] ?? null,
                'city' => $data['school']['city'] ?? null,
                'phone' => $data['school']['phone'] ?? null,
                'email' => $data['school']['email'] ?? null,
            ], fn ($v) => $v !== null);
            $bulletinPatch = [];
            if (isset($data['bulletin'])) {
                $bulletinPatch = array_filter([
                    'title' => $data['bulletin']['title'] ?? null,
                    'signature_line' => $data['bulletin']['signature_line'] ?? null,
                    'footer_line' => $data['bulletin']['footer_line'] ?? null,
                ], fn ($v) => $v !== null);
            }
            if ($schoolPatch !== [] || $bulletinPatch !== []) {
                ReportCardTemplate::patchFromSimpleSettings($schoolPatch, $bulletinPatch, $user->id);
            }
        } elseif (isset($data['bulletin'])) {
            $bulletinPatch = array_filter([
                'title' => $data['bulletin']['title'] ?? null,
                'signature_line' => $data['bulletin']['signature_line'] ?? null,
                'footer_line' => $data['bulletin']['footer_line'] ?? null,
            ], fn ($v) => $v !== null);
            if ($bulletinPatch !== []) {
                ReportCardTemplate::patchFromSimpleSettings([], $bulletinPatch, $user->id);
            }
        }

        if (isset($data['attendance_alerts'])) {
            $a = $data['attendance_alerts'];
            if (array_key_exists('window_days', $a)) {
                AppSetting::set(self::KEY_ATT_WINDOW, (int) $a['window_days'], $user->id, 'int');
            }
            if (array_key_exists('unjustified_absences', $a)) {
                AppSetting::set(self::KEY_ATT_ABSENCES, (int) $a['unjustified_absences'], $user->id, 'int');
            }
            if (array_key_exists('late_count', $a)) {
                AppSetting::set(self::KEY_ATT_LATES, (int) $a['late_count'], $user->id, 'int');
            }
        }

        if (array_key_exists('current_school_year_id', $data) && $data['current_school_year_id']) {
            $targetYearId = (int) $data['current_school_year_id'];
            DB::transaction(function () use ($targetYearId): void {
                SchoolYear::query()->update(['is_current' => false]);
                SchoolYear::query()
                    ->where('id', $targetYearId)
                    ->update([
                        'is_current' => true,
                        'status' => DB::raw("CASE WHEN status = 'planned' THEN 'active' ELSE status END"),
                    ]);
            });
        }

        if (isset($data['finance_journal'])) {
            $fj = $data['finance_journal'];
            if (array_key_exists('income_labels', $fj)) {
                AppSetting::set(self::KEY_FIN_INCOME, $this->normalizeLabelList($fj['income_labels']), $user->id, 'json');
            }
            if (array_key_exists('expense_labels', $fj)) {
                AppSetting::set(self::KEY_FIN_EXPENSE, $this->normalizeLabelList($fj['expense_labels']), $user->id, 'json');
            }
        }
        $after = $this->auditStateSnapshot();
        if ($before !== $after) {
            $this->audit->log(
                $user,
                'settings.updated',
                null,
                $before,
                $after,
                $request
            );
        }

        return $this->show($request);
    }

    public function uploadLogo(UploadSimpleSchoolLogoRequest $request): JsonResponse
    {
        $user = $request->user();
        if (! $this->canEditSchoolBasics($user)) {
            return ApiResponse::error('Accès refusé.', [], 403);
        }

        $before = $this->auditStateSnapshot();
        $file = $request->file('logo');
        $stored = $file->store('school', 'public');
        $logoPath = 'public/'.$stored;

        ReportCardTemplate::patchFromSimpleSettings(['logo_path' => $logoPath], [], $user->id);
        $this->audit->log(
            $user,
            'settings.updated',
            null,
            $before,
            $this->auditStateSnapshot(),
            $request
        );

        return $this->show($request);
    }

    private function canEditSchoolBasics(?User $user): bool
    {
        if ($user === null) {
            return false;
        }
        if ($user->isSuperAdmin()) {
            return true;
        }
        $user->loadMissing('role');
        $code = $user->role?->code;

        return in_array($code, ['admin', 'director', 'pedagogical_manager'], true);
    }

    private function intSetting(string $key, int $default): int
    {
        $v = AppSetting::get($key);

        return is_numeric($v) ? (int) $v : $default;
    }

    /**
     * @return list<string>
     */
    private function labelListSetting(string $key, array $defaults): array
    {
        $v = AppSetting::get($key);
        if (is_array($v)) {
            return $this->normalizeLabelList($v) ?: $defaults;
        }

        return $defaults;
    }

    /**
     * @param  list<mixed>  $raw
     * @return list<string>
     */
    private function normalizeLabelList(array $raw): array
    {
        $out = [];
        foreach ($raw as $item) {
            if (! is_string($item)) {
                continue;
            }
            $s = trim($item);
            if ($s === '' || in_array($s, $out, true)) {
                continue;
            }
            $out[] = mb_substr($s, 0, 60);
            if (count($out) >= 20) {
                break;
            }
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    private function defaultIncomeLabels(): array
    {
        return ['Scolarité', 'Cantine', 'Autre recette'];
    }

    /**
     * @return list<string>
     */
    private function defaultExpenseLabels(): array
    {
        return ['Salaires', 'Énergie', 'Entretien', 'Fournitures', 'Autre dépense'];
    }

    private function logoPublicUrl(?string $logoPath): ?string
    {
        if ($logoPath === null || $logoPath === '') {
            return null;
        }
        $relative = str_starts_with($logoPath, 'public/')
            ? substr($logoPath, strlen('public/'))
            : $logoPath;
        if (! Storage::disk('public')->exists($relative)) {
            return null;
        }

        return Storage::disk('public')->url($relative);
    }

    /**
     * @return array<string, mixed>
     */
    private function auditStateSnapshot(): array
    {
        $tpl = ReportCardTemplate::get();
        $school = $tpl['school'] ?? [];
        $simpleOptions = is_array($tpl['simple_options'] ?? null) ? $tpl['simple_options'] : [];
        $signature = collect($tpl['sections'] ?? [])->firstWhere('key', 'signature');
        $footer = collect($tpl['sections'] ?? [])->firstWhere('key', 'footer');
        $currentYearId = SchoolYear::query()->where('is_current', true)->value('id');

        return [
            'school' => [
                'name' => (string) ($school['name'] ?? ''),
                'address' => (string) ($school['address'] ?? ''),
                'city' => (string) ($school['city'] ?? ''),
                'phone' => (string) ($school['phone'] ?? ''),
                'email' => (string) ($school['email'] ?? ''),
                'logo_path' => (string) ($school['logo_path'] ?? ''),
            ],
            'bulletin' => [
                'title' => (string) ($tpl['title'] ?? ''),
                'signature_line' => (string) ($signature['text'] ?? ''),
                'footer_line' => (string) ($footer['text'] ?? ''),
                'show_attendance' => (bool) ($simpleOptions['show_attendance'] ?? true),
                'show_ranking' => (bool) ($simpleOptions['show_ranking'] ?? true),
                'principal_comment' => (string) ($simpleOptions['principal_comment'] ?? ''),
                'teacher_comment' => (string) ($simpleOptions['teacher_comment'] ?? ''),
            ],
            'attendance_alerts' => [
                'window_days' => $this->intSetting(self::KEY_ATT_WINDOW, (int) config('attendance.alerts.window_days', 30)),
                'unjustified_absences' => $this->intSetting(self::KEY_ATT_ABSENCES, (int) config('attendance.alerts.unjustified_absences_threshold', 3)),
                'late_count' => $this->intSetting(self::KEY_ATT_LATES, (int) config('attendance.alerts.late_count_threshold', 5)),
            ],
            'current_school_year_id' => $currentYearId ? (int) $currentYearId : null,
            'finance_journal' => [
                'income_labels' => $this->labelListSetting(self::KEY_FIN_INCOME, $this->defaultIncomeLabels()),
                'expense_labels' => $this->labelListSetting(self::KEY_FIN_EXPENSE, $this->defaultExpenseLabels()),
            ],
        ];
    }
}
