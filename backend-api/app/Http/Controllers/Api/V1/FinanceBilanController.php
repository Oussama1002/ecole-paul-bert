<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Finance\BilanFinanceRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Student;
use App\Support\ReportCardTemplate;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinanceBilanController extends Controller
{
    public function show(BilanFinanceRequest $request)
    {
        $payload = $this->buildBilanPayload($request->validated());
        return ApiResponse::success($payload, 'Bilan financier généré.');
    }

    public function pdf(BilanFinanceRequest $request): Response
    {
        $payload = $this->buildBilanPayload($request->validated());
        $school = ReportCardTemplate::get()['school'] ?? [];

        $pdf = Pdf::loadView('finance.bilan_report', [
            'school' => $school,
            'generated_at' => now()->format('d/m/Y H:i'),
            'bilan' => $payload,
        ])->setPaper('a4');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="bilan_financier_'.date('Y-m-d_His').'.pdf"',
        ]);
    }

    public function exportExcel(BilanFinanceRequest $request): StreamedResponse
    {
        $bilan = $this->buildBilanPayload($request->validated());
        $sheet = new Spreadsheet();

        $summary = $sheet->getActiveSheet();
        $summary->setTitle('Summary');
        $summary->fromArray(['Indicateur', 'Valeur'], null, 'A1');
        $summaryRows = [
            ['Période', $bilan['period']['label']],
            ['Revenus totaux', $bilan['summary']['total_income']],
            ['Dépenses totales', $bilan['summary']['total_expenses']],
            ['Solde net', $bilan['summary']['net_balance']],
            ['Revenus inscriptions', $bilan['summary']['registrations_revenue']],
            ['Revenus mensualités', $bilan['summary']['monthly_fees_revenue']],
            ['Autres revenus', $bilan['summary']['other_income_revenue']],
            ['Factures impayées', $bilan['summary']['unpaid_invoices_total']],
            ['Paiements partiels', $bilan['summary']['partial_payments_total']],
            ['Élèves inscrits', $bilan['summary']['registered_students_count']],
            ['Nouvelles inscriptions', $bilan['summary']['new_registrations_count']],
            ['Départs élèves', $bilan['summary']['students_left_count']],
        ];
        $summary->fromArray($summaryRows, null, 'A2');

        $incomeSheet = $sheet->createSheet();
        $incomeSheet->setTitle('Income');
        $incomeSheet->fromArray(['Catégorie', 'Montant total', 'Nombre entrées'], null, 'A1');
        $incomeRows = [];
        foreach ($bilan['income_breakdown'] as $item) {
            $incomeRows[] = [$item['label'], $item['total_amount'], $item['entries_count']];
        }
        if (! empty($incomeRows)) {
            $incomeSheet->fromArray($incomeRows, null, 'A2');
        }

        $expenseSheet = $sheet->createSheet();
        $expenseSheet->setTitle('Expenses');
        $expenseSheet->fromArray(['Type coût', 'Catégorie', 'Montant total', 'Nombre entrées'], null, 'A1');
        $expenseRows = [];
        foreach ($bilan['expense_breakdown'] as $item) {
            $expenseRows[] = [$item['cost_group'], $item['label'], $item['total_amount'], $item['entries_count']];
        }
        if (! empty($expenseRows)) {
            $expenseSheet->fromArray($expenseRows, null, 'A2');
        }

        $monthlySheet = $sheet->createSheet();
        $monthlySheet->setTitle('Monthly Evolution');
        $monthlySheet->fromArray(['Mois', 'Revenus', 'Dépenses', 'Net'], null, 'A1');
        $monthlyRows = [];
        foreach ($bilan['monthly_evolution'] as $item) {
            $monthlyRows[] = [$item['month_label'], $item['income'], $item['expenses'], $item['net_balance']];
        }
        $monthlySheet->fromArray($monthlyRows, null, 'A2');

        return response()->streamDownload(function () use ($sheet) {
            (new Xlsx($sheet))->save('php://output');
        }, 'bilan_financier_'.date('Y-m-d_His').'.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function buildBilanPayload(array $filters): array
    {
        [$dateFrom, $dateTo, $periodType] = $this->resolvePeriod($filters);
        $schoolYearId = isset($filters['school_year_id']) ? (int) $filters['school_year_id'] : null;

        $paymentsQuery = Payment::query()
            ->where('status', 'confirmed')
            ->whereBetween('payment_date', [$dateFrom->toDateString(), $dateTo->toDateString()]);
        $expensesQuery = Expense::query()
            ->where('status', 'active')
            ->whereBetween('expense_date', [$dateFrom->toDateString(), $dateTo->toDateString()]);
        $invoicesQuery = Invoice::query()
            ->where('status', '!=', 'cancelled')
            ->whereBetween('issue_date', [$dateFrom->toDateString(), $dateTo->toDateString()]);

        if ($schoolYearId) {
            $paymentsQuery->where('school_year_id', $schoolYearId);
            $expensesQuery->where('school_year_id', $schoolYearId);
            $invoicesQuery->where('school_year_id', $schoolYearId);
        }

        $incomeTotal = (float) (clone $paymentsQuery)->sum('amount');
        $expensesTotal = (float) (clone $expensesQuery)->sum('amount');

        $unpaidInvoicesTotal = (float) (clone $invoicesQuery)
            ->whereIn('status', ['issued', 'partial'])
            ->where('amount_due', '>', 0)
            ->sum('amount_due');

        $partialPaymentsTotal = (float) (clone $invoicesQuery)
            ->where('status', 'partial')
            ->sum('amount_paid');

        $incomeBreakdown = $this->computeIncomeBreakdown($dateFrom, $dateTo, $schoolYearId);
        $expenseBreakdown = $this->computeExpenseBreakdown($dateFrom, $dateTo, $schoolYearId);
        $monthlyEvolution = $this->computeMonthlyEvolution((int) $dateFrom->year, $schoolYearId);
        $monthlyCategoryBreakdown = $this->computeMonthlyCategoryBreakdown((int) $dateFrom->year, $schoolYearId);

        $studentsBase = Student::query();
        if ($schoolYearId) {
            $studentsBase->whereHas('enrollments', fn ($q) => $q->where('school_year_id', $schoolYearId));
        }

        $registeredStudentsCount = (clone $studentsBase)->whereNull('deleted_at')->count();
        $newRegistrationsCount = (clone $studentsBase)
            ->whereBetween('registration_date', [$dateFrom->toDateString(), $dateTo->toDateString()])
            ->count();
        $studentsLeftCount = Student::query()
            ->where(function ($q) use ($dateFrom, $dateTo) {
                $q->whereBetween('deleted_at', [$dateFrom->toDateString(), $dateTo->toDateString()])
                    ->orWhere(function ($q2) use ($dateFrom, $dateTo) {
                        $q2->whereIn('status', ['left', 'inactive', 'transferred', 'dropped'])
                            ->whereBetween('updated_at', [$dateFrom->toDateString(), $dateTo->toDateString()]);
                    });
            })
            ->when($schoolYearId, function ($q) use ($schoolYearId) {
                $q->whereHas('enrollments', fn ($e) => $e->where('school_year_id', $schoolYearId));
            })
            ->count();

        return [
            'period' => [
                'type' => $periodType,
                'date_from' => $dateFrom->toDateString(),
                'date_to' => $dateTo->toDateString(),
                'school_year_id' => $schoolYearId,
                'label' => $dateFrom->format('d/m/Y').' - '.$dateTo->format('d/m/Y'),
            ],
            'summary' => [
                'total_income' => round($incomeTotal, 2),
                'total_expenses' => round($expensesTotal, 2),
                'net_balance' => round($incomeTotal - $expensesTotal, 2),
                'registrations_revenue' => $incomeBreakdown['inscriptions']['total_amount'],
                'monthly_fees_revenue' => $incomeBreakdown['mensualites']['total_amount'],
                'other_income_revenue' => round(
                    $incomeBreakdown['transport']['total_amount']
                    + $incomeBreakdown['activites']['total_amount']
                    + $incomeBreakdown['autres_revenus']['total_amount'],
                    2
                ),
                'unpaid_invoices_total' => round($unpaidInvoicesTotal, 2),
                'partial_payments_total' => round($partialPaymentsTotal, 2),
                'registered_students_count' => (int) $registeredStudentsCount,
                'new_registrations_count' => (int) $newRegistrationsCount,
                'students_left_count' => (int) $studentsLeftCount,
            ],
            'income_breakdown' => array_values($incomeBreakdown),
            'expense_breakdown' => array_values($expenseBreakdown),
            'monthly_evolution' => $monthlyEvolution,
            'monthly_category_breakdown' => $monthlyCategoryBreakdown,
        ];
    }

    private function resolvePeriod(array $filters): array
    {
        $periodType = $filters['period_type'] ?? 'monthly';
        $today = Carbon::today();

        if ($periodType === 'custom') {
            $from = isset($filters['date_from']) ? Carbon::parse($filters['date_from'])->startOfDay() : $today->copy()->startOfMonth();
            $to = isset($filters['date_to']) ? Carbon::parse($filters['date_to'])->endOfDay() : $today->copy()->endOfMonth();
            return [$from, $to, $periodType];
        }
        if ($periodType === 'yearly') {
            $yearRef = isset($filters['date_from']) ? Carbon::parse($filters['date_from']) : $today;
            return [$yearRef->copy()->startOfYear(), $yearRef->copy()->endOfYear(), $periodType];
        }

        $monthRef = isset($filters['date_from']) ? Carbon::parse($filters['date_from']) : $today;
        return [$monthRef->copy()->startOfMonth(), $monthRef->copy()->endOfMonth(), 'monthly'];
    }

    private function computeIncomeBreakdown(Carbon $dateFrom, Carbon $dateTo, ?int $schoolYearId): array
    {
        $rows = Payment::query()
            ->leftJoin('invoices', 'invoices.id', '=', 'payments.invoice_id')
            ->leftJoin('fee_assignments', 'fee_assignments.id', '=', 'payments.fee_assignment_id')
            ->leftJoin('fee_types', 'fee_types.id', '=', 'fee_assignments.fee_type_id')
            ->where('payments.status', 'confirmed')
            ->whereBetween('payments.payment_date', [$dateFrom->toDateString(), $dateTo->toDateString()])
            ->when($schoolYearId, fn ($q) => $q->where('payments.school_year_id', $schoolYearId))
            ->selectRaw('payments.amount, invoices.invoice_type, fee_types.code as fee_code, fee_types.name as fee_name')
            ->get();

        $seed = [
            'inscriptions' => ['category' => 'inscriptions', 'label' => 'Inscriptions', 'total_amount' => 0.0, 'entries_count' => 0],
            'mensualites' => ['category' => 'mensualites', 'label' => 'Mensualités', 'total_amount' => 0.0, 'entries_count' => 0],
            'transport' => ['category' => 'transport', 'label' => 'Transport', 'total_amount' => 0.0, 'entries_count' => 0],
            'activites' => ['category' => 'activites', 'label' => 'Activités', 'total_amount' => 0.0, 'entries_count' => 0],
            'autres_revenus' => ['category' => 'autres_revenus', 'label' => 'Autres revenus', 'total_amount' => 0.0, 'entries_count' => 0],
        ];

        foreach ($rows as $row) {
            $key = $this->mapIncomeCategory((string) ($row->fee_code ?? ''), (string) ($row->fee_name ?? ''), (string) ($row->invoice_type ?? ''));
            $seed[$key]['total_amount'] += (float) $row->amount;
            $seed[$key]['entries_count']++;
        }

        foreach ($seed as $key => $item) {
            $seed[$key]['total_amount'] = round($item['total_amount'], 2);
        }

        return $seed;
    }

    private function mapIncomeCategory(string $feeCode, string $feeName, string $invoiceType): string
    {
        $text = mb_strtolower($feeCode.' '.$feeName.' '.$invoiceType);
        if (str_contains($text, 'inscription') || str_contains($text, 'registration')) return 'inscriptions';
        if (str_contains($text, 'mensual') || str_contains($text, 'month')) return 'mensualites';
        if (str_contains($text, 'transport')) return 'transport';
        if (str_contains($text, 'activit')) return 'activites';
        return 'autres_revenus';
    }

    private function computeExpenseBreakdown(Carbon $dateFrom, Carbon $dateTo, ?int $schoolYearId): array
    {
        $rows = Expense::query()
            ->leftJoin('expense_categories', 'expense_categories.id', '=', 'expenses.expense_category_id')
            ->where('expenses.status', 'active')
            ->whereBetween('expenses.expense_date', [$dateFrom->toDateString(), $dateTo->toDateString()])
            ->when($schoolYearId, fn ($q) => $q->where('expenses.school_year_id', $schoolYearId))
            ->selectRaw('expenses.amount, expenses.cost_type, expense_categories.name as category_name')
            ->get();

        $seed = [
            'salaries' => ['category' => 'salaries', 'label' => 'Salaires', 'cost_group' => 'fixed', 'total_amount' => 0.0, 'entries_count' => 0],
            'transport' => ['category' => 'transport', 'label' => 'Transport', 'cost_group' => 'fixed', 'total_amount' => 0.0, 'entries_count' => 0],
            'fuel' => ['category' => 'fuel', 'label' => 'Carburant / Gazole', 'cost_group' => 'fixed', 'total_amount' => 0.0, 'entries_count' => 0],
            'recurring_charges' => ['category' => 'recurring_charges', 'label' => 'Charges récurrentes', 'cost_group' => 'fixed', 'total_amount' => 0.0, 'entries_count' => 0],
            'insurance' => ['category' => 'insurance', 'label' => 'Assurance', 'cost_group' => 'variable', 'total_amount' => 0.0, 'entries_count' => 0],
            'accounting' => ['category' => 'accounting', 'label' => 'Comptabilité', 'cost_group' => 'variable', 'total_amount' => 0.0, 'entries_count' => 0],
            'invoices' => ['category' => 'invoices', 'label' => 'Factures', 'cost_group' => 'variable', 'total_amount' => 0.0, 'entries_count' => 0],
            'supplies' => ['category' => 'supplies', 'label' => 'Fournitures', 'cost_group' => 'variable', 'total_amount' => 0.0, 'entries_count' => 0],
            'repairs' => ['category' => 'repairs', 'label' => 'Réparations', 'cost_group' => 'variable', 'total_amount' => 0.0, 'entries_count' => 0],
            'other' => ['category' => 'other', 'label' => 'Autres', 'cost_group' => 'variable', 'total_amount' => 0.0, 'entries_count' => 0],
        ];

        foreach ($rows as $row) {
            $costType = ($row->cost_type === 'fixed') ? 'fixed' : 'variable';
            $key = $this->mapExpenseCategory((string) ($row->category_name ?? ''), $costType);
            $seed[$key]['total_amount'] += (float) $row->amount;
            $seed[$key]['entries_count']++;
        }

        foreach ($seed as $key => $item) {
            $seed[$key]['total_amount'] = round($item['total_amount'], 2);
        }

        return $seed;
    }

    private function mapExpenseCategory(string $name, string $costType): string
    {
        $text = mb_strtolower($name);
        if ($costType === 'fixed') {
            if (str_contains($text, 'salaire') || str_contains($text, 'salary')) return 'salaries';
            if (str_contains($text, 'transport')) return 'transport';
            if (str_contains($text, 'gazole') || str_contains($text, 'fuel') || str_contains($text, 'carbur')) return 'fuel';
            return 'recurring_charges';
        }

        if (str_contains($text, 'assurance') || str_contains($text, 'insurance')) return 'insurance';
        if (str_contains($text, 'compta') || str_contains($text, 'account')) return 'accounting';
        if (str_contains($text, 'facture') || str_contains($text, 'invoice')) return 'invoices';
        if (str_contains($text, 'fourniture') || str_contains($text, 'supply')) return 'supplies';
        if (str_contains($text, 'reparation') || str_contains($text, 'repair')) return 'repairs';
        return 'other';
    }

    private function computeMonthlyEvolution(int $year, ?int $schoolYearId): array
    {
        $payments = Payment::query()
            ->where('status', 'confirmed')
            ->whereYear('payment_date', $year)
            ->when($schoolYearId, fn ($q) => $q->where('school_year_id', $schoolYearId))
            ->selectRaw("MONTH(payment_date) as month_num, SUM(amount) as total")
            ->groupBy('month_num')
            ->pluck('total', 'month_num');

        $expenses = Expense::query()
            ->where('status', 'active')
            ->whereYear('expense_date', $year)
            ->when($schoolYearId, fn ($q) => $q->where('school_year_id', $schoolYearId))
            ->selectRaw("MONTH(expense_date) as month_num, SUM(amount) as total")
            ->groupBy('month_num')
            ->pluck('total', 'month_num');

        $months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        $result = [];
        for ($i = 1; $i <= 12; $i++) {
            $income = (float) ($payments[$i] ?? 0);
            $expense = (float) ($expenses[$i] ?? 0);
            $result[] = [
                'month' => $i,
                'month_label' => $months[$i - 1],
                'income' => round($income, 2),
                'expenses' => round($expense, 2),
                'net_balance' => round($income - $expense, 2),
            ];
        }
        return $result;
    }

    private function computeMonthlyCategoryBreakdown(int $year, ?int $schoolYearId): array
    {
        $incomeRows = Payment::query()
            ->leftJoin('invoices', 'invoices.id', '=', 'payments.invoice_id')
            ->leftJoin('fee_assignments', 'fee_assignments.id', '=', 'payments.fee_assignment_id')
            ->leftJoin('fee_types', 'fee_types.id', '=', 'fee_assignments.fee_type_id')
            ->where('payments.status', 'confirmed')
            ->whereYear('payments.payment_date', $year)
            ->when($schoolYearId, fn ($q) => $q->where('payments.school_year_id', $schoolYearId))
            ->selectRaw('MONTH(payments.payment_date) as month_num, payments.amount, invoices.invoice_type, fee_types.code as fee_code, fee_types.name as fee_name')
            ->get();

        $expenseRows = Expense::query()
            ->leftJoin('expense_categories', 'expense_categories.id', '=', 'expenses.expense_category_id')
            ->where('expenses.status', 'active')
            ->whereYear('expenses.expense_date', $year)
            ->when($schoolYearId, fn ($q) => $q->where('expenses.school_year_id', $schoolYearId))
            ->selectRaw('MONTH(expenses.expense_date) as month_num, expenses.amount, expenses.cost_type, expense_categories.name as category_name')
            ->get();

        $months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        $incomeLabels = [
            'inscriptions' => 'Inscriptions',
            'mensualites' => 'Mensualités',
            'transport' => 'Transport',
            'activites' => 'Activités',
            'autres_revenus' => 'Autres revenus',
        ];
        $expenseLabels = [
            'salaries' => 'Salaires',
            'transport' => 'Transport',
            'fuel' => 'Carburant / Gazole',
            'recurring_charges' => 'Charges récurrentes',
            'insurance' => 'Assurance',
            'accounting' => 'Comptabilité',
            'invoices' => 'Factures',
            'supplies' => 'Fournitures',
            'repairs' => 'Réparations',
            'other' => 'Autres',
        ];

        $monthBuckets = [];
        for ($m = 1; $m <= 12; $m++) {
            $monthBuckets[$m] = [];
            foreach ($incomeLabels as $code => $label) {
                $monthBuckets[$m]["income:$code"] = [
                    'category' => $label,
                    'income' => 0.0,
                    'expenses' => 0.0,
                ];
            }
            foreach ($expenseLabels as $code => $label) {
                $monthBuckets[$m]["expense:$code"] = [
                    'category' => $label,
                    'income' => 0.0,
                    'expenses' => 0.0,
                ];
            }
        }

        foreach ($incomeRows as $row) {
            $month = (int) $row->month_num;
            if ($month < 1 || $month > 12) {
                continue;
            }
            $cat = $this->mapIncomeCategory((string) ($row->fee_code ?? ''), (string) ($row->fee_name ?? ''), (string) ($row->invoice_type ?? ''));
            $monthBuckets[$month]["income:$cat"]['income'] += (float) $row->amount;
        }

        foreach ($expenseRows as $row) {
            $month = (int) $row->month_num;
            if ($month < 1 || $month > 12) {
                continue;
            }
            $costType = ($row->cost_type === 'fixed') ? 'fixed' : 'variable';
            $cat = $this->mapExpenseCategory((string) ($row->category_name ?? ''), $costType);
            $monthBuckets[$month]["expense:$cat"]['expenses'] += (float) $row->amount;
        }

        $result = [];
        for ($m = 1; $m <= 12; $m++) {
            $rows = [];
            foreach ($monthBuckets[$m] as $bucket) {
                $income = round((float) $bucket['income'], 2);
                $expense = round((float) $bucket['expenses'], 2);
                if ($income === 0.0 && $expense === 0.0) {
                    continue;
                }
                $rows[] = [
                    'category' => $bucket['category'],
                    'income' => $income,
                    'expenses' => $expense,
                    'net_balance' => round($income - $expense, 2),
                ];
            }

            $result[] = [
                'month' => $m,
                'month_label' => $months[$m - 1],
                'rows' => $rows,
            ];
        }

        return $result;
    }
}

