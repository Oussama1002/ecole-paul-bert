<?php

namespace App\Support\Qa;

use App\Models\AttendanceRecord;
use App\Models\Enrollment;
use App\Models\EvaluationPeriod;
use App\Models\FinanceJournalEntry;
use App\Models\Grade;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeacherObservation;
use App\Models\User;
use App\Services\ReceiptService;
use App\Services\ReportCardService;
use App\Services\SimpleDashboardService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;
use Throwable;

class ClientFlowRunner
{
    /**
     * @return array{status:string,steps:list<array<string,mixed>>,bugs:list<array<string,mixed>>,limitations:list<string>}
     */
    public function run(): array
    {
        $steps = [];
        $bugs = [];
        $limitations = [];
        $ctx = [];

        $this->step($steps, $bugs, '1. Create student with quick form', function () use (&$ctx): array {
            $studentCode = 'QA-'.Carbon::now()->format('YmdHis');
            $student = Student::query()->create([
                'student_code' => $studentCode,
                'first_name' => 'Amina',
                'last_name' => 'Benali Long Name QA Validation',
                'date_of_birth' => Carbon::now()->subYears(10)->format('Y-m-d'),
                'address' => 'Quartier Centre, Rue des Ecoles, Bloc B',
                'parent_phone_1' => '0600112233',
                'parent_phone_2' => '0600445566',
                'status' => 'pending',
            ]);

            $ctx['student'] = $student;

            return [
                'student_id' => $student->id,
                'student_code' => $student->student_code,
            ];
        });

        $this->step($steps, $bugs, '2. Assign/enroll student', function () use (&$ctx): array {
            $student = $ctx['student'] ?? null;
            if (! $student instanceof Student) {
                throw new \RuntimeException('Student context missing.');
            }

            $year = SchoolYear::query()
                ->where('is_current', true)
                ->first() ?? SchoolYear::query()->orderByDesc('id')->first();
            if (! $year instanceof SchoolYear) {
                throw new \RuntimeException('No school year found.');
            }

            $class = SchoolClass::query()
                ->where('school_year_id', $year->id)
                ->orderBy('id')
                ->first();
            if (! $class instanceof SchoolClass) {
                throw new \RuntimeException('No class found for selected school year.');
            }

            $enrollment = Enrollment::query()->create([
                'student_id' => $student->id,
                'school_year_id' => $year->id,
                'class_id' => $class->id,
                'enrollment_number' => 'QA-ENR-'.Carbon::now()->format('YmdHis'),
                'enrollment_date' => Carbon::today()->format('Y-m-d'),
                'academic_status' => 'enrolled',
                'admission_type' => 'new',
                'registration_status' => 'validated',
            ]);

            $ctx['school_year'] = $year;
            $ctx['class'] = $class;
            $ctx['enrollment'] = $enrollment;

            return [
                'enrollment_id' => $enrollment->id,
                'school_year_id' => $year->id,
                'class_id' => $class->id,
            ];
        });

        $this->step($steps, $bugs, '3. Mark attendance for class', function () use (&$ctx): array {
            $student = $ctx['student'] ?? null;
            $year = $ctx['school_year'] ?? null;
            $class = $ctx['class'] ?? null;
            if (! $student instanceof Student || ! $year instanceof SchoolYear || ! $class instanceof SchoolClass) {
                throw new \RuntimeException('Missing enrollment context.');
            }

            $existing = AttendanceRecord::query()
                ->where('student_id', $student->id)
                ->where('class_id', $class->id)
                ->whereDate('attendance_date', Carbon::today()->format('Y-m-d'))
                ->orderByDesc('id')
                ->first();

            if ($existing instanceof AttendanceRecord) {
                $ctx['attendance'] = $existing;

                return ['attendance_id' => $existing->id, 'mode' => 'reused_existing'];
            }

            $record = AttendanceRecord::query()->create([
                'school_year_id' => $year->id,
                'class_id' => $class->id,
                'student_id' => $student->id,
                'attendance_date' => Carbon::today()->format('Y-m-d'),
                'attendance_status' => 'present',
                'is_justified' => false,
                'remarks' => 'Marquage QA e2e',
            ]);

            $ctx['attendance'] = $record;

            return ['attendance_id' => $record->id, 'mode' => 'created'];
        });

        $this->step($steps, $bugs, '4. Add teacher observation', function () use (&$ctx): array {
            $teacher = Teacher::query()->orderBy('id')->first();
            if (! $teacher instanceof Teacher) {
                throw new \RuntimeException('No teacher found.');
            }

            $actor = $this->actorUser();
            $obs = TeacherObservation::query()->create([
                'teacher_id' => $teacher->id,
                'type' => 'observation',
                'comment' => 'Observation QA: bonne communication avec les parents.',
                'created_by' => $actor?->id,
            ]);

            $ctx['teacher'] = $teacher;
            $ctx['teacher_observation'] = $obs;

            return ['teacher_id' => $teacher->id, 'observation_id' => $obs->id];
        });

        $this->step($steps, $bugs, '5. Add finance journal entry', function () use (&$ctx): array {
            $actor = $this->actorUser();
            $payload = [
                'entry_date' => Carbon::today()->format('Y-m-d'),
                'entry_type' => 'income',
                'cost_type' => null,
                'label' => 'Encaissement QA',
                'amount' => 15000,
                'note' => 'Entrée test flux client',
                'created_by' => $actor?->id,
            ];
            if (Schema::hasColumn('finance_journal_entries', 'category')) {
                $payload['category'] = 'Scolarité';
            }
            $entry = FinanceJournalEntry::query()->create($payload);

            $ctx['finance_entry'] = $entry;

            return ['entry_id' => $entry->id, 'amount' => (string) $entry->amount];
        });

        $this->step($steps, $bugs, '6. Create or record payment', function () use (&$ctx): array {
            $student = $ctx['student'] ?? null;
            $year = $ctx['school_year'] ?? null;
            $enrollment = $ctx['enrollment'] ?? null;
            if (! $student instanceof Student || ! $year instanceof SchoolYear || ! $enrollment instanceof Enrollment) {
                throw new \RuntimeException('Missing finance context.');
            }

            $actor = $this->actorUser();
            $invoice = Invoice::query()->create([
                'student_id' => $student->id,
                'enrollment_id' => $enrollment->id,
                'school_year_id' => $year->id,
                'invoice_number' => 'QA-INV-'.Carbon::now()->format('YmdHis'),
                'invoice_type' => 'manual',
                'issue_date' => Carbon::today()->format('Y-m-d'),
                'due_date' => Carbon::today()->addDays(15)->format('Y-m-d'),
                'subtotal' => 12000,
                'discount_amount' => 0,
                'tax_amount' => 0,
                'total_amount' => 12000,
                'amount_paid' => 6000,
                'amount_due' => 6000,
                'status' => 'partial',
                'notes' => 'Facture QA',
                'created_by' => $actor?->id,
            ]);
            InvoiceItem::query()->create([
                'invoice_id' => $invoice->id,
                'label' => 'Scolarité mensuelle',
                'amount' => 12000,
            ]);

            $payment = Payment::query()->create([
                'student_id' => $student->id,
                'invoice_id' => $invoice->id,
                'school_year_id' => $year->id,
                'payment_reference' => 'QA-PAY-'.Carbon::now()->format('YmdHis'),
                'payment_date' => Carbon::today()->format('Y-m-d'),
                'amount' => 6000,
                'payment_method' => 'cash',
                'status' => 'confirmed',
                'note' => 'Paiement QA',
                'received_by' => $actor?->id,
            ]);

            $ctx['invoice'] = $invoice;
            $ctx['payment'] = $payment;

            return [
                'invoice_id' => $invoice->id,
                'payment_id' => $payment->id,
                'amount' => (string) $payment->amount,
            ];
        });

        $this->step($steps, $bugs, '7. Generate receipt', function () use (&$ctx): array {
            $payment = $ctx['payment'] ?? null;
            if (! $payment instanceof Payment) {
                throw new \RuntimeException('Payment context missing.');
            }

            app(ReceiptService::class)->generatePaymentReceiptPdf($payment);
            $payment = $payment->fresh();
            if (! $payment?->receipt_pdf_path || ! Storage::disk('local')->exists($payment->receipt_pdf_path)) {
                throw new \RuntimeException('Receipt PDF was not generated on disk.');
            }

            $ctx['payment'] = $payment;

            return ['receipt_pdf_path' => $payment->receipt_pdf_path];
        });

        $this->step($steps, $bugs, '8. Enter grades', function () use (&$ctx): array {
            $student = $ctx['student'] ?? null;
            $year = $ctx['school_year'] ?? null;
            $class = $ctx['class'] ?? null;
            if (! $student instanceof Student || ! $year instanceof SchoolYear || ! $class instanceof SchoolClass) {
                throw new \RuntimeException('Missing academic context.');
            }

            $period = EvaluationPeriod::query()
                ->where('school_year_id', $year->id)
                ->orderBy('id')
                ->first();
            if (! $period instanceof EvaluationPeriod) {
                throw new \RuntimeException('No evaluation period found for school year.');
            }

            $subject = Subject::query()->orderBy('id')->first();
            if (! $subject instanceof Subject) {
                throw new \RuntimeException('No subject found.');
            }

            $actor = $this->actorUser();
            $grade = Grade::query()->updateOrCreate(
                [
                    'evaluation_period_id' => $period->id,
                    'class_id' => $class->id,
                    'student_id' => $student->id,
                    'subject_id' => $subject->id,
                ],
                [
                    'school_year_id' => $year->id,
                    'term_id' => $period->term_id,
                    'evaluation_type_id' => null,
                    'teacher_id' => null,
                    'score' => 15.5,
                    'max_score' => 20,
                    'coefficient' => 1,
                    'weighted_score' => 15.5,
                    'appreciation' => 'Bon travail.',
                    'is_validated' => false,
                    'entered_by' => $actor?->id,
                ]
            );

            $ctx['evaluation_period'] = $period;
            $ctx['subject'] = $subject;
            $ctx['grade'] = $grade;

            return [
                'grade_id' => $grade->id,
                'evaluation_period_id' => $period->id,
                'subject_id' => $subject->id,
            ];
        });

        $this->step($steps, $bugs, '9. Generate bulletin PDF', function () use (&$ctx): array {
            $year = $ctx['school_year'] ?? null;
            $class = $ctx['class'] ?? null;
            $period = $ctx['evaluation_period'] ?? null;
            $student = $ctx['student'] ?? null;
            if (! $year instanceof SchoolYear || ! $class instanceof SchoolClass || ! $period instanceof EvaluationPeriod || ! $student instanceof Student) {
                throw new \RuntimeException('Missing report-card context.');
            }

            $actor = $this->actorUser();
            app(ReportCardService::class)->generateForClassPeriod($year->id, $class->id, $period->id, $actor?->id);

            $reportCard = \App\Models\ReportCard::query()
                ->where('evaluation_period_id', $period->id)
                ->where('class_id', $class->id)
                ->where('student_id', $student->id)
                ->first();
            if (! $reportCard) {
                throw new \RuntimeException('Report card record was not generated.');
            }
            if (! $reportCard->pdf_path || ! Storage::disk('local')->exists($reportCard->pdf_path)) {
                throw new \RuntimeException('Report card PDF file missing on disk.');
            }

            $ctx['report_card'] = $reportCard;

            return ['report_card_id' => $reportCard->id, 'pdf_path' => $reportCard->pdf_path];
        });

        $this->step($steps, $bugs, '10. Check simple dashboard numbers', function () use (&$ctx): array {
            $year = $ctx['school_year'] ?? null;
            $payment = $ctx['payment'] ?? null;
            if (! $year instanceof SchoolYear || ! $payment instanceof Payment) {
                throw new \RuntimeException('Missing dashboard context.');
            }

            $dashboard = app(SimpleDashboardService::class)->build($year->id);
            $kpis = $dashboard['kpis'] ?? null;
            if (! is_array($kpis)) {
                throw new \RuntimeException('Dashboard payload is invalid.');
            }

            $globalRevenue = (float) ($kpis['global_revenue'] ?? 0);
            if ($globalRevenue <= 0) {
                throw new \RuntimeException('Global revenue is not updated after payment.');
            }

            return [
                'total_students' => $kpis['total_students'] ?? null,
                'monthly_revenue' => $kpis['monthly_revenue'] ?? null,
                'global_revenue' => $kpis['global_revenue'] ?? null,
            ];
        });

        if ($bugs === []) {
            $limitations[] = 'Run currently focuses on backend flow integrity; frontend rendering/UX assertions remain manual.';
            $limitations[] = 'The scenario creates QA records in the active database and does not auto-cleanup for traceability.';
        }

        return [
            'status' => $bugs === [] ? 'passed' : 'failed',
            'steps' => $steps,
            'bugs' => $bugs,
            'limitations' => $limitations,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $steps
     * @param  array<int, array<string, mixed>>  $bugs
     * @param  callable():array<string,mixed>  $fn
     */
    private function step(array &$steps, array &$bugs, string $name, callable $fn): void
    {
        try {
            $meta = $fn();
            $steps[] = [
                'flow' => $name,
                'result' => 'pass',
                'details' => $meta,
            ];
        } catch (Throwable $e) {
            $steps[] = [
                'flow' => $name,
                'result' => 'fail',
                'details' => ['error' => $e->getMessage()],
            ];
            $bugs[] = [
                'severity' => 'P1',
                'flow' => $name,
                'error' => $e->getMessage(),
            ];
        }
    }

    private function actorUser(): ?User
    {
        return User::query()
            ->where('email', 'superadmin@paulbert.local')
            ->first() ?? User::query()->orderBy('id')->first();
    }
}

