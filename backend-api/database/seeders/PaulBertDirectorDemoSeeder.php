<?php

namespace Database\Seeders;

use App\Models\AttendanceRecord;
use App\Models\FeeAssignment;
use App\Models\FeeType;
use App\Models\FinanceJournalEntry;
use App\Models\Grade;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\SchoolYear;
use App\Models\Teacher;
use App\Models\TeacherObservation;
use App\Models\User;
use App\Services\ReportCardService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class PaulBertDirectorDemoSeeder extends Seeder
{
    private const PASSWORD = 'DevPaulBert2026!';

    public function run(): void
    {
        $now = now();
        $teacherRoleId = (int) (DB::table('roles')->where('code', 'teacher')->value('id') ?? 6);
        $adminUserId = (int) (DB::table('users')->where('email', 'admin@paulbert.local')->value('id') ?? 0);

        $schoolYearId = $this->upsertManual(
            'school_years',
            ['name' => '2026-2027'],
            [
                'start_date' => '2026-09-01',
                'end_date' => '2027-06-30',
                'is_current' => 1,
                'status' => 'active',
                'updated_at' => $now,
            ]
        );
        DB::table('school_years')->where('id', '!=', $schoolYearId)->update(['is_current' => 0, 'updated_at' => $now]);

        $cpId = $this->upsertManual('levels', ['code' => 'CP'], [
            'name' => 'Cours préparatoire',
            'description' => 'Niveau CP',
            'sort_order' => 1,
            'updated_at' => $now,
        ]);
        $ce1Id = $this->upsertManual('levels', ['code' => 'CE1'], [
            'name' => 'Cours élémentaire 1',
            'description' => 'Niveau CE1',
            'sort_order' => 2,
            'updated_at' => $now,
        ]);
        $cm1Id = $this->upsertManual('levels', ['code' => 'CM1'], [
            'name' => 'Cours moyen 1',
            'description' => 'Niveau CM1',
            'sort_order' => 3,
            'updated_at' => $now,
        ]);

        $teacherUsers = [
            ['email' => 'm.fall@paulbert.local', 'username' => 'mfall', 'first_name' => 'Mamadou', 'last_name' => 'Fall'],
            ['email' => 's.traore@paulbert.local', 'username' => 'straore', 'first_name' => 'Sophie', 'last_name' => 'Traoré'],
            ['email' => 'a.kone@paulbert.local', 'username' => 'akone', 'first_name' => 'Aïcha', 'last_name' => 'Koné'],
        ];

        $teacherIds = [];
        foreach ($teacherUsers as $idx => $u) {
            $user = User::query()->where('email', $u['email'])->first();
            $payload = [
                'role_id' => $teacherRoleId,
                'first_name' => $u['first_name'],
                'last_name' => $u['last_name'],
                'username' => $u['username'],
                'password_hash' => Hash::make(self::PASSWORD),
                'status' => 'active',
                'updated_at' => $now,
            ];
            if ($user) {
                $user->fill($payload);
                $user->save();
                $userId = (int) $user->id;
            } else {
                $userId = $this->upsertManual('users', ['email' => $u['email']], array_merge($payload, ['created_at' => $now]));
            }

            $teacher = Teacher::query()->updateOrCreate(
                ['employee_code' => sprintf('ENS-PB-%03d', $idx + 1)],
                [
                    'user_id' => $userId,
                    'first_name' => $u['first_name'],
                    'last_name' => $u['last_name'],
                    'email' => $u['email'],
                    'phone' => '06'.(string) (70000000 + ($idx * 111111)),
                    'employment_type' => 'full_time',
                    'status' => 'active',
                    'hire_date' => '2024-09-01',
                ]
            );
            $teacherIds[] = (int) $teacher->id;
        }

        $classIds = [];
        $classIds['CP A'] = $this->upsertManual('classes', ['code' => 'CPA-PB'], [
            'level_id' => $cpId,
            'school_year_id' => $schoolYearId,
            'name' => 'CP A',
            'section' => 'Primaire',
            'max_students' => 30,
            'room_label' => 'Salle 1',
            'main_teacher_id' => $teacherIds[0] ?? null,
            'status' => 'active',
            'updated_at' => $now,
        ]);
        $classIds['CE1 A'] = $this->upsertManual('classes', ['code' => 'CE1A-PB'], [
            'level_id' => $ce1Id,
            'school_year_id' => $schoolYearId,
            'name' => 'CE1 A',
            'section' => 'Primaire',
            'max_students' => 30,
            'room_label' => 'Salle 2',
            'main_teacher_id' => $teacherIds[1] ?? null,
            'status' => 'active',
            'updated_at' => $now,
        ]);
        $classIds['CM1 A'] = $this->upsertManual('classes', ['code' => 'CM1A-PB'], [
            'level_id' => $cm1Id,
            'school_year_id' => $schoolYearId,
            'name' => 'CM1 A',
            'section' => 'Primaire',
            'max_students' => 30,
            'room_label' => 'Salle 3',
            'main_teacher_id' => $teacherIds[2] ?? null,
            'status' => 'active',
            'updated_at' => $now,
        ]);

        $subjects = [
            ['name' => 'Français', 'code' => 'FR-PB', 'coefficient' => 2],
            ['name' => 'Mathématiques', 'code' => 'MATH-PB', 'coefficient' => 2],
            ['name' => 'Sciences', 'code' => 'SCI-PB', 'coefficient' => 1],
            ['name' => 'Histoire-Géographie', 'code' => 'HG-PB', 'coefficient' => 1],
            ['name' => 'Anglais', 'code' => 'ANG-PB', 'coefficient' => 1],
            ['name' => 'EPS', 'code' => 'EPS-PB', 'coefficient' => 1],
        ];
        foreach ($subjects as $s) {
            $this->upsertManual('subjects', ['code' => $s['code']], [
                'level_id' => null,
                'name' => $s['name'],
                'description' => null,
                'coefficient' => $s['coefficient'],
                'is_optional' => 0,
                'status' => 'active',
                'updated_at' => $now,
            ]);
        }

        $termId = $this->upsertManual('academic_terms', ['code' => 'T1-PB', 'school_year_id' => $schoolYearId], [
            'name' => '1er trimestre',
            'start_date' => '2026-09-01',
            'end_date' => '2026-12-20',
            'sort_order' => 1,
            'is_active' => 1,
            'updated_at' => $now,
        ]);
        $periodId = $this->upsertManual('evaluation_periods', ['code' => 'EP1-PB', 'school_year_id' => $schoolYearId], [
            'term_id' => $termId,
            'name' => 'Évaluation 1',
            'start_date' => '2026-09-15',
            'end_date' => '2026-10-15',
            'is_closed' => 0,
            'sort_order' => 1,
            'updated_at' => $now,
        ]);

        $students = [
            ['code' => 'EPB-DEMO-001', 'first' => 'Aminata', 'last' => 'Diallo', 'class' => 'CP A'],
            ['code' => 'EPB-DEMO-002', 'first' => 'Ibrahim', 'last' => 'Sy', 'class' => 'CP A'],
            ['code' => 'EPB-DEMO-003', 'first' => 'Fatou', 'last' => 'Ndiaye', 'class' => 'CP A'],
            ['code' => 'EPB-DEMO-004', 'first' => 'Oumar', 'last' => 'Ba', 'class' => 'CE1 A'],
            ['code' => 'EPB-DEMO-005', 'first' => 'Mariama', 'last' => 'Sow', 'class' => 'CE1 A'],
            ['code' => 'EPB-DEMO-006', 'first' => 'Yacine', 'last' => 'Kane', 'class' => 'CE1 A'],
            ['code' => 'EPB-DEMO-007', 'first' => 'Nora', 'last' => 'Ben Ahmed', 'class' => 'CM1 A'],
            ['code' => 'EPB-DEMO-008', 'first' => 'Moussa', 'last' => 'Touré', 'class' => 'CM1 A'],
            ['code' => 'EPB-DEMO-009', 'first' => 'Salma', 'last' => 'El Idrissi', 'class' => 'CM1 A'],
            ['code' => 'EPB-DEMO-010', 'first' => 'Karim', 'last' => 'Bensalem', 'class' => 'CM1 A'],
        ];

        $studentIds = [];
        foreach ($students as $i => $s) {
            $birth = Carbon::create(2015 + intdiv($i, 3), 3 + ($i % 8), 10 + ($i % 10))->format('Y-m-d');
            $studentId = $this->upsertManual('students', ['student_code' => $s['code']], [
                'first_name' => $s['first'],
                'last_name' => $s['last'],
                'date_of_birth' => $birth,
                'city' => 'Casablanca',
                'address' => 'Quartier Paul Bert, Casablanca',
                'status' => 'active',
                'parent_phone_1' => '06'.(string) (50000000 + $i * 12345),
                'parent_phone_2' => '06'.(string) (70000000 + $i * 12345),
                'updated_at' => $now,
            ]);
            $studentIds[$s['code']] = $studentId;

            $this->upsertManual('enrollments', [
                'student_id' => $studentId,
                'school_year_id' => $schoolYearId,
                'class_id' => $classIds[$s['class']],
            ], [
                'enrollment_number' => 'INS-PB-'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
                'enrollment_date' => '2026-09-05',
                'academic_status' => 'enrolled',
                'admission_type' => 'new',
                'registration_status' => 'validated',
                'remarks' => 'Inscription démo Paul Bert',
                'created_by' => $adminUserId > 0 ? $adminUserId : null,
                'updated_at' => $now,
            ]);
        }

        $attendanceSamples = [
            ['student' => 'EPB-DEMO-001', 'class' => 'CP A', 'status' => 'present', 'late' => null, 'remarks' => 'Présent'],
            ['student' => 'EPB-DEMO-002', 'class' => 'CP A', 'status' => 'late', 'late' => 12, 'remarks' => 'Retard transport'],
            ['student' => 'EPB-DEMO-004', 'class' => 'CE1 A', 'status' => 'absent', 'late' => null, 'remarks' => 'Absence non justifiée'],
            ['student' => 'EPB-DEMO-007', 'class' => 'CM1 A', 'status' => 'present', 'late' => null, 'remarks' => 'Présente'],
            ['student' => 'EPB-DEMO-009', 'class' => 'CM1 A', 'status' => 'late', 'late' => 8, 'remarks' => 'Retard léger'],
        ];
        foreach ($attendanceSamples as $row) {
            AttendanceRecord::query()->updateOrCreate(
                [
                    'student_id' => $studentIds[$row['student']],
                    'class_id' => $classIds[$row['class']],
                    'attendance_date' => '2026-10-02',
                    'schedule_entry_id' => null,
                ],
                [
                    'school_year_id' => $schoolYearId,
                    'term_id' => $termId,
                    'subject_id' => null,
                    'teacher_id' => null,
                    'attendance_status' => $row['status'],
                    'minutes_late' => $row['late'],
                    'is_justified' => false,
                    'remarks' => $row['remarks'],
                ]
            );
        }

        $observationTexts = [
            'Très bonne gestion de classe et communication avec les familles.',
            'Ponctualité irréprochable et excellent suivi des cahiers.',
            'Initiatives pédagogiques appréciées lors des ateliers de lecture.',
        ];
        foreach ($teacherIds as $idx => $teacherId) {
            TeacherObservation::query()->updateOrCreate(
                [
                    'teacher_id' => $teacherId,
                    'type' => 'observation',
                    'comment' => $observationTexts[$idx] ?? 'Observation positive.',
                ],
                ['created_by' => $adminUserId > 0 ? $adminUserId : null]
            );
        }

        $financeRows = [
            ['date' => '2026-09-10', 'type' => 'income', 'cost' => null, 'label' => 'Paiement cantine - septembre', 'amount' => 45000, 'note' => 'Encaissement collectif cantine'],
            ['date' => '2026-09-12', 'type' => 'expense', 'cost' => 'fixed', 'label' => 'Salaires personnel - septembre', 'amount' => 320000, 'note' => 'Virement mensuel'],
            ['date' => '2026-09-18', 'type' => 'expense', 'cost' => 'variable', 'label' => 'Achat fournitures classes', 'amount' => 38500, 'note' => 'Cahiers, feutres, papier'],
            ['date' => '2026-09-25', 'type' => 'income', 'cost' => null, 'label' => 'Recettes étude surveillée', 'amount' => 22000, 'note' => 'Mois de septembre'],
            ['date' => '2026-10-03', 'type' => 'expense', 'cost' => 'variable', 'label' => 'Petites réparations sanitaires', 'amount' => 17500, 'note' => 'Intervention plombier'],
        ];
        foreach ($financeRows as $row) {
            FinanceJournalEntry::query()->updateOrCreate(
                ['entry_date' => $row['date'], 'label' => $row['label']],
                [
                    'entry_type' => $row['type'],
                    'cost_type' => $row['cost'],
                    'amount' => $row['amount'],
                    'note' => $row['note'],
                    'created_by' => $adminUserId > 0 ? $adminUserId : null,
                ]
            );
        }

        $registrationFee = FeeType::query()->updateOrCreate(
            ['code' => 'INSCRIPTION-PB'],
            [
                'name' => 'Frais d’inscription',
                'frequency' => 'once',
                'default_amount' => 35000,
                'is_active' => true,
                'description' => 'Frais annuels d’inscription',
            ]
        );

        $studentFinanceId = $studentIds['EPB-DEMO-001'];
        $assignment = FeeAssignment::query()->updateOrCreate(
            [
                'student_id' => $studentFinanceId,
                'school_year_id' => $schoolYearId,
                'fee_type_id' => $registrationFee->id,
            ],
            [
                'amount_due' => 35000,
                'discount_amount' => 0,
                'scholarship_amount' => 0,
                'amount_paid' => 20000,
                'balance' => 15000,
                'due_date' => '2026-10-31',
                'status' => 'partial',
                'notes' => 'Paiement échelonné',
                'created_by' => $adminUserId > 0 ? $adminUserId : null,
            ]
        );

        $invoice = Invoice::query()->updateOrCreate(
            ['invoice_number' => 'FAC-PB-DEMO-001'],
            [
                'student_id' => $studentFinanceId,
                'enrollment_id' => (int) DB::table('enrollments')
                    ->where('student_id', $studentFinanceId)
                    ->where('school_year_id', $schoolYearId)
                    ->value('id'),
                'school_year_id' => $schoolYearId,
                'invoice_type' => 'fees',
                'issue_date' => '2026-10-01',
                'due_date' => '2026-10-31',
                'subtotal' => 35000,
                'discount_amount' => 0,
                'tax_amount' => 0,
                'total_amount' => 35000,
                'amount_paid' => 20000,
                'amount_due' => 15000,
                'status' => 'partial',
                'notes' => 'Facture de frais d’inscription',
                'created_by' => $adminUserId > 0 ? $adminUserId : null,
            ]
        );
        InvoiceItem::query()->updateOrCreate(
            ['invoice_id' => $invoice->id, 'label' => 'Frais d’inscription 2026-2027'],
            ['amount' => 35000, 'fee_assignment_id' => $assignment->id]
        );

        Payment::query()->updateOrCreate(
            ['payment_reference' => 'PAI-PB-DEMO-001'],
            [
                'student_id' => $studentFinanceId,
                'invoice_id' => $invoice->id,
                'fee_assignment_id' => $assignment->id,
                'school_year_id' => $schoolYearId,
                'payment_date' => '2026-10-04',
                'amount' => 20000,
                'payment_method' => 'cash',
                'status' => 'confirmed',
                'transaction_reference' => null,
                'note' => 'Versement initial',
                'received_by' => $adminUserId > 0 ? $adminUserId : null,
            ]
        );

        $subjectCodesForBulletin = ['FR-PB', 'MATH-PB', 'SCI-PB'];
        $subjectIdsForBulletin = DB::table('subjects')->whereIn('code', $subjectCodesForBulletin)->pluck('id')->all();
        foreach ($subjectIdsForBulletin as $sId) {
            Grade::query()->updateOrCreate(
                [
                    'evaluation_period_id' => $periodId,
                    'class_id' => $classIds['CP A'],
                    'student_id' => $studentFinanceId,
                    'subject_id' => (int) $sId,
                ],
                [
                    'school_year_id' => $schoolYearId,
                    'term_id' => $termId,
                    'evaluation_type_id' => null,
                    'teacher_id' => null,
                    'score' => 14 + ($sId % 4),
                    'max_score' => 20,
                    'coefficient' => 1,
                    'weighted_score' => 14 + ($sId % 4),
                    'appreciation' => 'Bon travail, continue ainsi.',
                    'is_validated' => false,
                    'entered_by' => $adminUserId > 0 ? $adminUserId : null,
                ]
            );
        }

        app(ReportCardService::class)->generateForClassPeriod(
            $schoolYearId,
            $classIds['CP A'],
            $periodId,
            $adminUserId > 0 ? $adminUserId : null
        );

        $this->command?->info('Jeu de données directeur Paul Bert prêt : 10 élèves, 3 enseignants, 3 classes, finance, et bulletin généré.');
    }

    private function upsertManual(string $table, array $unique, array $values): int
    {
        $existing = DB::table($table)->where($unique)->first();
        if ($existing) {
            DB::table($table)->where('id', $existing->id)->update($values);

            return (int) $existing->id;
        }

        $id = (int) DB::table($table)->max('id') + 1;
        DB::table($table)->insert(array_merge(['id' => $id, 'created_at' => now()], $unique, $values));

        return $id;
    }
}

