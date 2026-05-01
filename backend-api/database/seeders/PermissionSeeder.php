<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PermissionSeeder extends Seeder
{
    /**
     * @return list<array{name: string, code: string, module_name: string, action_name: string}>
     */
    private static function definitions(): array
    {
        return [
        ['name' => 'Voir les utilisateurs', 'code' => 'users.view', 'module_name' => 'users', 'action_name' => 'view'],
        ['name' => 'Créer des utilisateurs', 'code' => 'users.create', 'module_name' => 'users', 'action_name' => 'create'],
        ['name' => 'Modifier des utilisateurs', 'code' => 'users.edit', 'module_name' => 'users', 'action_name' => 'edit'],
        ['name' => 'Désactiver des utilisateurs', 'code' => 'users.deactivate', 'module_name' => 'users', 'action_name' => 'deactivate'],
        ['name' => 'Tableau de bord', 'code' => 'dashboard.view', 'module_name' => 'dashboard', 'action_name' => 'view'],
        ['name' => 'Voir les années scolaires', 'code' => 'school_years.view', 'module_name' => 'school_years', 'action_name' => 'view'],
        ['name' => 'Gérer les années scolaires', 'code' => 'school_years.manage', 'module_name' => 'school_years', 'action_name' => 'manage'],
        ['name' => 'Voir les niveaux', 'code' => 'levels.view', 'module_name' => 'levels', 'action_name' => 'view'],
        ['name' => 'Gérer les niveaux', 'code' => 'levels.manage', 'module_name' => 'levels', 'action_name' => 'manage'],
        ['name' => 'Voir les classes', 'code' => 'classes.view', 'module_name' => 'classes', 'action_name' => 'view'],
        ['name' => 'Gérer les classes', 'code' => 'classes.manage', 'module_name' => 'classes', 'action_name' => 'manage'],
        ['name' => 'Voir les matières', 'code' => 'subjects.view', 'module_name' => 'subjects', 'action_name' => 'view'],
        ['name' => 'Gérer les matières', 'code' => 'subjects.manage', 'module_name' => 'subjects', 'action_name' => 'manage'],
        ['name' => 'Voir les trimestres / semestres', 'code' => 'academic_terms.view', 'module_name' => 'academic_terms', 'action_name' => 'view'],
        ['name' => 'Gérer les trimestres / semestres', 'code' => 'academic_terms.manage', 'module_name' => 'academic_terms', 'action_name' => 'manage'],
        ['name' => 'Voir les périodes d’évaluation', 'code' => 'evaluation_periods.view', 'module_name' => 'evaluation_periods', 'action_name' => 'view'],
        ['name' => 'Gérer les périodes d’évaluation', 'code' => 'evaluation_periods.manage', 'module_name' => 'evaluation_periods', 'action_name' => 'manage'],
        ['name' => 'Voir les salles', 'code' => 'rooms.view', 'module_name' => 'rooms', 'action_name' => 'view'],
        ['name' => 'Gérer les salles', 'code' => 'rooms.manage', 'module_name' => 'rooms', 'action_name' => 'manage'],
        ['name' => 'Voir les élèves', 'code' => 'students.view', 'module_name' => 'students', 'action_name' => 'view'],
        ['name' => 'Gérer les élèves', 'code' => 'students.manage', 'module_name' => 'students', 'action_name' => 'manage'],
        ['name' => 'Importer des élèves', 'code' => 'students.import', 'module_name' => 'students', 'action_name' => 'import'],
        ['name' => 'Exporter les élèves', 'code' => 'students.export', 'module_name' => 'students', 'action_name' => 'export'],
        ['name' => 'Voir les tuteurs', 'code' => 'guardians.view', 'module_name' => 'guardians', 'action_name' => 'view'],
        ['name' => 'Gérer les tuteurs', 'code' => 'guardians.manage', 'module_name' => 'guardians', 'action_name' => 'manage'],
        ['name' => 'Voir les inscriptions', 'code' => 'enrollments.view', 'module_name' => 'enrollments', 'action_name' => 'view'],
        ['name' => 'Gérer les inscriptions', 'code' => 'enrollments.manage', 'module_name' => 'enrollments', 'action_name' => 'manage'],
        ['name' => 'Voir les enseignants', 'code' => 'teachers.view', 'module_name' => 'teachers', 'action_name' => 'view'],
        ['name' => 'Gérer les enseignants', 'code' => 'teachers.manage', 'module_name' => 'teachers', 'action_name' => 'manage'],
        ['name' => 'Voir l’emploi du temps', 'code' => 'schedule.view', 'module_name' => 'schedule', 'action_name' => 'view'],
        ['name' => 'Gérer l’emploi du temps', 'code' => 'schedule.manage', 'module_name' => 'schedule', 'action_name' => 'manage'],

        ['name' => 'Voir les absences et retards', 'code' => 'attendance.view', 'module_name' => 'attendance', 'action_name' => 'view'],
        ['name' => 'Gérer les absences et retards', 'code' => 'attendance.manage', 'module_name' => 'attendance', 'action_name' => 'manage'],
        ['name' => 'Justifier des absences', 'code' => 'attendance.justify', 'module_name' => 'attendance', 'action_name' => 'justify'],

        ['name' => 'Voir les notes', 'code' => 'grades.view', 'module_name' => 'grades', 'action_name' => 'view'],
        ['name' => 'Gérer les notes', 'code' => 'grades.manage', 'module_name' => 'grades', 'action_name' => 'manage'],
        ['name' => 'Override verrouillage période (notes)', 'code' => 'grades.override_lock', 'module_name' => 'grades', 'action_name' => 'override_lock'],
        ['name' => 'Voir les bulletins', 'code' => 'report_cards.view', 'module_name' => 'report_cards', 'action_name' => 'view'],
        ['name' => 'Gérer les bulletins', 'code' => 'report_cards.manage', 'module_name' => 'report_cards', 'action_name' => 'manage'],
        ['name' => 'Publier des bulletins', 'code' => 'report_cards.publish', 'module_name' => 'report_cards', 'action_name' => 'publish'],

        ['name' => 'Voir la finance', 'code' => 'finance.view', 'module_name' => 'finance', 'action_name' => 'view'],
        ['name' => 'Gérer la finance', 'code' => 'finance.manage', 'module_name' => 'finance', 'action_name' => 'manage'],

        ['name' => 'Voir les documents', 'code' => 'documents.view', 'module_name' => 'documents', 'action_name' => 'view'],
        ['name' => 'Gérer les documents', 'code' => 'documents.manage', 'module_name' => 'documents', 'action_name' => 'manage'],

        ['name' => 'Voir les annonces', 'code' => 'announcements.view', 'module_name' => 'announcements', 'action_name' => 'view'],
        ['name' => 'Gérer les annonces', 'code' => 'announcements.manage', 'module_name' => 'announcements', 'action_name' => 'manage'],
        ['name' => 'Voir les notifications internes', 'code' => 'notifications.view', 'module_name' => 'notifications', 'action_name' => 'view'],
        ['name' => 'Voir le journal d’audit', 'code' => 'audit_logs.view', 'module_name' => 'audit_logs', 'action_name' => 'view'],
        ];
    }

    /**
     * Codes connus par l’application (ex. super-admin si table `permissions` vide).
     *
     * @return list<string>
     */
    public static function allCodes(): array
    {
        return array_values(array_column(self::definitions(), 'code'));
    }

    public function run(): void
    {
        $ids = [];
        $nextId = (int) Permission::query()->max('id') + 1;

        foreach (self::definitions() as $def) {
            $p = Permission::query()->where('code', $def['code'])->first();
            if (! $p) {
                $p = new Permission();
                // Some legacy schemas require explicit IDs (no auto-increment).
                $p->id = $nextId;
                $nextId++;
                $p->code = $def['code'];
            }

            $p->name = $def['name'];
            $p->module_name = $def['module_name'];
            $p->action_name = $def['action_name'];
            $p->save();
            $ids[$def['code']] = $p->id;
        }

        $allIds = array_values($ids);

        $dashboardOnly = [$ids['dashboard.view']];

        $paramView = [
            'school_years.view', 'levels.view', 'classes.view', 'subjects.view',
            'academic_terms.view', 'evaluation_periods.view', 'rooms.view',
        ];
        $paramManagePedago = [
            'levels.manage', 'classes.manage', 'subjects.manage',
            'academic_terms.manage', 'evaluation_periods.manage',
            'schedule.manage',
        ];
        $paramManageAdmin = array_merge(
            ['school_years.manage', 'rooms.manage'],
            $paramManagePedago
        );

        $studentPedago = [
            'students.view', 'students.manage', 'students.export',
            'guardians.view', 'guardians.manage', 'enrollments.view', 'enrollments.manage',
            'teachers.view', 'teachers.manage', 'schedule.view', 'schedule.manage',
            'attendance.view', 'attendance.manage', 'attendance.justify',
            'grades.view', 'grades.manage',
            'report_cards.view', 'report_cards.manage', 'report_cards.publish',
            'finance.view', 'finance.manage',
            'documents.view', 'documents.manage',
            'announcements.view', 'notifications.view',
        ];
        $studentOffice = array_merge($studentPedago, [
            'students.import',
            'announcements.manage',
            'audit_logs.view',
        ]);

        $pick = static fn (array $codes) => array_values(array_intersect_key($ids, array_flip($codes)));

        $assign = [
            1 => $allIds,
            2 => $allIds,
            3 => array_merge(
                $pick(['users.view', 'users.edit', 'dashboard.view']),
                $pick($paramView),
                $pick($paramManagePedago),
                $pick($studentPedago)
            ),
            4 => array_merge(
                $pick(['users.view', 'dashboard.view']),
                $pick($paramView),
                $pick($paramManagePedago),
                $pick($studentPedago)
            ),
            5 => array_merge(
                $pick(['users.view', 'users.create', 'users.edit', 'users.deactivate', 'dashboard.view']),
                $pick(array_merge($paramView, $paramManageAdmin)),
                $pick($studentOffice)
            ),
            6 => array_merge($dashboardOnly, $pick(['notifications.view', 'announcements.view', 'students.view', 'teachers.view', 'schedule.view'])),
            7 => array_merge($dashboardOnly, $pick(['notifications.view', 'announcements.view', 'finance.view', 'finance.manage'])),
            8 => $pick(['users.view', 'dashboard.view', 'notifications.view', 'announcements.view']),
            9 => array_merge($dashboardOnly, $pick(['notifications.view', 'announcements.view'])),
            10 => array_merge($dashboardOnly, $pick(['notifications.view', 'announcements.view'])),
        ];

        foreach ($assign as $roleId => $permissionIds) {
            // Some legacy schemas use an explicit PK on the pivot table (no auto-increment).
            DB::table('role_permissions')->where('role_id', $roleId)->delete();

            $nextPivotId = (int) DB::table('role_permissions')->max('id') + 1;
            $rows = [];
            foreach (array_values(array_unique($permissionIds)) as $permissionId) {
                $rows[] = [
                    'id' => $nextPivotId++,
                    'role_id' => $roleId,
                    'permission_id' => (int) $permissionId,
                ];
            }
            if ($rows !== []) {
                DB::table('role_permissions')->insert($rows);
            }
        }
    }
}
