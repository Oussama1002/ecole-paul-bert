<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Invoice;
use App\Models\Payment;
use App\Support\ReportCardTemplate;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinanceReportController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $request->validate([
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $sy = $request->filled('school_year_id') ? (int) $request->input('school_year_id') : null;
        $from = $request->filled('from') ? (string) $request->input('from') : null;
        $to = $request->filled('to') ? (string) $request->input('to') : null;

        $paymentsQ = Payment::query()->where('status', 'confirmed');
        $expensesQ = Expense::query()->where('status', 'active');
        $invoicesQ = Invoice::query()->where('status', '!=', 'cancelled');

        if ($sy) {
            $paymentsQ->where('school_year_id', $sy);
            $expensesQ->where('school_year_id', $sy);
            $invoicesQ->where('school_year_id', $sy);
        }
        if ($from) {
            $paymentsQ->whereDate('payment_date', '>=', $from);
            $expensesQ->whereDate('expense_date', '>=', $from);
            $invoicesQ->whereDate('issue_date', '>=', $from);
        }
        if ($to) {
            $paymentsQ->whereDate('payment_date', '<=', $to);
            $expensesQ->whereDate('expense_date', '<=', $to);
            $invoicesQ->whereDate('issue_date', '<=', $to);
        }

        $revenue = (float) $paymentsQ->sum('amount');
        $expenses = (float) $expensesQ->sum('amount');
        $unpaid = (float) $invoicesQ->sum('amount_due');

        return ApiResponse::success([
            'revenue_total' => round($revenue, 2),
            'expenses_total' => round($expenses, 2),
            'net_total' => round($revenue - $expenses, 2),
            'unpaid_total' => round($unpaid, 2),
        ], 'Dashboard finance.');
    }

    public function paymentsByPeriod(Request $request): JsonResponse
    {
        $request->validate([
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'from' => ['required', 'date'],
            'to' => ['required', 'date'],
            'group_by' => ['nullable', 'in:day,month'],
        ]);

        $sy = $request->filled('school_year_id') ? (int) $request->input('school_year_id') : null;
        $from = Carbon::parse((string) $request->input('from'))->startOfDay();
        $to = Carbon::parse((string) $request->input('to'))->endOfDay();
        $groupBy = (string) ($request->input('group_by') ?? 'day');

        $q = Payment::query()
            ->where('status', 'confirmed')
            ->whereBetween('payment_date', [$from->toDateString(), $to->toDateString()]);

        if ($sy) {
            $q->where('school_year_id', $sy);
        }

        $fmt = $groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';
        $rows = $q->selectRaw("DATE_FORMAT(payment_date, '{$fmt}') as period, SUM(amount) as total")
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        return ApiResponse::success([
            'group_by' => $groupBy,
            'items' => $rows->map(fn ($r) => [
                'period' => $r->period,
                'total' => (float) $r->total,
            ]),
        ], 'Paiements par période.');
    }

    public function expensesByCategory(Request $request): JsonResponse
    {
        $request->validate([
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $sy = $request->filled('school_year_id') ? (int) $request->input('school_year_id') : null;
        $from = $request->filled('from') ? (string) $request->input('from') : null;
        $to = $request->filled('to') ? (string) $request->input('to') : null;

        $q = Expense::query()->where('status', 'active');
        if ($sy) {
            $q->where('school_year_id', $sy);
        }
        if ($from) {
            $q->whereDate('expense_date', '>=', $from);
        }
        if ($to) {
            $q->whereDate('expense_date', '<=', $to);
        }

        $rows = $q->selectRaw('expense_category_id, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('expense_category_id')
            ->orderByDesc('total')
            ->get();

        $catIds = $rows->pluck('expense_category_id')->all();
        $names = ExpenseCategory::query()->whereIn('id', $catIds)->pluck('name', 'id');

        return ApiResponse::success([
            'items' => $rows->map(fn ($r) => [
                'expense_category_id' => (int) $r->expense_category_id,
                'name' => $names[$r->expense_category_id] ?? '—',
                'total' => (float) $r->total,
                'count' => (int) $r->count,
            ]),
        ], 'Dépenses par catégorie.');
    }

    public function expensesByCostType(Request $request): JsonResponse
    {
        $request->validate([
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $sy = $request->filled('school_year_id') ? (int) $request->input('school_year_id') : null;
        $from = $request->filled('from') ? (string) $request->input('from') : null;
        $to = $request->filled('to') ? (string) $request->input('to') : null;

        $q = Expense::query()->where('status', 'active');
        if ($sy) {
            $q->where('school_year_id', $sy);
        }
        if ($from) {
            $q->whereDate('expense_date', '>=', $from);
        }
        if ($to) {
            $q->whereDate('expense_date', '<=', $to);
        }

        $rows = $q->selectRaw('cost_type, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('cost_type')
            ->get()
            ->keyBy('cost_type');

        $fixed = $rows->get('fixed');
        $variable = $rows->get('variable');

        return ApiResponse::success([
            'fixed_total' => (float) ($fixed->total ?? 0),
            'fixed_count' => (int) ($fixed->count ?? 0),
            'variable_total' => (float) ($variable->total ?? 0),
            'variable_count' => (int) ($variable->count ?? 0),
        ], 'Dépenses fixes vs variables.');
    }

    public function overdueInvoices(Request $request): JsonResponse
    {
        $request->validate([
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'as_of' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $sy = $request->filled('school_year_id') ? (int) $request->input('school_year_id') : null;
        $asOf = $request->filled('as_of') ? Carbon::parse((string) $request->input('as_of')) : Carbon::today();

        $q = Invoice::query()
            ->with(['student:id,first_name,last_name,student_code'])
            ->whereIn('status', ['issued', 'partial'])
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', $asOf->toDateString())
            ->where('amount_due', '>', 0)
            ->orderBy('due_date');

        if ($sy) {
            $q->where('school_year_id', $sy);
        }

        $totalOverdue = (float) (clone $q)->sum('amount_due');
        $countOverdue = (clone $q)->count();

        $perPage = (int) ($request->input('per_page') ?? 50);
        $p = $q->paginate(min($perPage, 200))->withQueryString();

        return ApiResponse::success([
            'total_overdue' => round($totalOverdue, 2),
            'count_overdue' => $countOverdue,
            'as_of' => $asOf->toDateString(),
            'items' => $p->getCollection()->map(function (Invoice $inv) use ($asOf) {
                $studentName = $inv->student
                    ? trim(($inv->student->last_name ?? '').' '.($inv->student->first_name ?? ''))
                    : '';

                return [
                    'id' => $inv->id,
                    'invoice_number' => $inv->invoice_number,
                    'student_id' => (int) $inv->student_id,
                    'student_name' => $studentName !== '' ? $studentName : null,
                    'issue_date' => $inv->issue_date?->format('Y-m-d'),
                    'due_date' => $inv->due_date?->format('Y-m-d'),
                    'days_overdue' => $inv->due_date
                        ? (int) Carbon::parse($inv->due_date)->diffInDays($asOf)
                        : null,
                    'total_amount' => (string) $inv->total_amount,
                    'amount_paid' => (string) $inv->amount_paid,
                    'amount_due' => (string) $inv->amount_due,
                    'status' => $inv->status,
                ];
            }),
            'meta' => [
                'current_page' => $p->currentPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
                'last_page' => $p->lastPage(),
            ],
        ], 'Factures en retard.');
    }

    public function monthlyEvolution(Request $request): JsonResponse
    {
        $request->validate([
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ]);

        $sy = $request->filled('school_year_id') ? (int) $request->input('school_year_id') : null;
        $year = (int) ($request->input('year') ?? date('Y'));

        $payQ = Payment::query()
            ->where('status', 'confirmed')
            ->whereYear('payment_date', $year);
        $expQ = Expense::query()
            ->where('status', 'active')
            ->whereYear('expense_date', $year);

        if ($sy) {
            $payQ->where('school_year_id', $sy);
            $expQ->where('school_year_id', $sy);
        }

        $pay = $payQ->selectRaw("DATE_FORMAT(payment_date, '%Y-%m') as period, SUM(amount) as total")
            ->groupBy('period')
            ->pluck('total', 'period');
        $exp = $expQ->selectRaw("DATE_FORMAT(expense_date, '%Y-%m') as period, SUM(amount) as total")
            ->groupBy('period')
            ->pluck('total', 'period');

        $items = [];
        for ($m = 1; $m <= 12; $m++) {
            $key = sprintf('%04d-%02d', $year, $m);
            $items[] = [
                'period' => $key,
                'month' => $m,
                'revenue' => (float) ($pay[$key] ?? 0),
                'expenses' => (float) ($exp[$key] ?? 0),
                'net' => (float) ($pay[$key] ?? 0) - (float) ($exp[$key] ?? 0),
            ];
        }

        return ApiResponse::success([
            'year' => $year,
            'items' => $items,
        ], 'Évolution mensuelle.');
    }

    public function exportPaymentsExcel(Request $request): StreamedResponse
    {
        $request->validate([
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $sy = $request->filled('school_year_id') ? (int) $request->input('school_year_id') : null;
        $from = $request->filled('from') ? (string) $request->input('from') : null;
        $to = $request->filled('to') ? (string) $request->input('to') : null;

        $q = Payment::query()->where('status', 'confirmed')->orderByDesc('payment_date');
        if ($sy) {
            $q->where('school_year_id', $sy);
        }
        if ($from) {
            $q->whereDate('payment_date', '>=', $from);
        }
        if ($to) {
            $q->whereDate('payment_date', '<=', $to);
        }

        $items = $q->limit(5000)->get();

        $sheet = new Spreadsheet();
        $ws = $sheet->getActiveSheet();
        $ws->fromArray(['id', 'reference', 'date', 'amount', 'method', 'student_id', 'invoice_id', 'status'], null, 'A1');

        $row = 2;
        foreach ($items as $p) {
            $ws->fromArray([
                $p->id,
                $p->payment_reference,
                $p->payment_date?->format('Y-m-d'),
                (string) $p->amount,
                $p->payment_method,
                $p->student_id,
                $p->invoice_id,
                $p->status,
            ], null, 'A'.$row);
            $row++;
        }

        $filename = 'paiements_'.date('Y-m-d_His').'.xlsx';

        return response()->streamDownload(function () use ($sheet) {
            $writer = new Xlsx($sheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function exportExpensesExcel(Request $request): StreamedResponse
    {
        $request->validate([
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $sy = $request->filled('school_year_id') ? (int) $request->input('school_year_id') : null;
        $from = $request->filled('from') ? (string) $request->input('from') : null;
        $to = $request->filled('to') ? (string) $request->input('to') : null;

        $q = Expense::query()->where('status', 'active')->orderByDesc('expense_date');
        if ($sy) {
            $q->where('school_year_id', $sy);
        }
        if ($from) {
            $q->whereDate('expense_date', '>=', $from);
        }
        if ($to) {
            $q->whereDate('expense_date', '<=', $to);
        }

        $items = $q->limit(5000)->get();

        $sheet = new Spreadsheet();
        $ws = $sheet->getActiveSheet();
        $ws->fromArray(['id', 'date', 'montant', 'fournisseur', 'reference', 'description', 'annee_id', 'statut'], null, 'A1');

        $row = 2;
        foreach ($items as $e) {
            $ws->fromArray([
                $e->id,
                $e->expense_date?->format('Y-m-d'),
                (string) $e->amount,
                $e->vendor,
                $e->reference,
                $e->description,
                $e->school_year_id,
                $e->status,
            ], null, 'A'.$row);
            $row++;
        }

        $filename = 'depenses_'.date('Y-m-d_His').'.xlsx';

        return response()->streamDownload(function () use ($sheet) {
            (new Xlsx($sheet))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function downloadSummaryPdf(Request $request): Response
    {
        $request->validate([
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $sy = $request->filled('school_year_id') ? (int) $request->input('school_year_id') : null;
        $from = $request->filled('from') ? (string) $request->input('from') : null;
        $to = $request->filled('to') ? (string) $request->input('to') : null;

        $paymentsQ = Payment::query()->where('status', 'confirmed');
        $expensesQ = Expense::query()->where('status', 'active');
        $invoicesQ = Invoice::query()->where('status', '!=', 'cancelled');

        if ($sy) {
            $paymentsQ->where('school_year_id', $sy);
            $expensesQ->where('school_year_id', $sy);
            $invoicesQ->where('school_year_id', $sy);
        }
        if ($from) {
            $paymentsQ->whereDate('payment_date', '>=', $from);
            $expensesQ->whereDate('expense_date', '>=', $from);
            $invoicesQ->whereDate('issue_date', '>=', $from);
        }
        if ($to) {
            $paymentsQ->whereDate('payment_date', '<=', $to);
            $expensesQ->whereDate('expense_date', '<=', $to);
            $invoicesQ->whereDate('issue_date', '<=', $to);
        }

        $revenue = (float) $paymentsQ->sum('amount');
        $expenses = (float) $expensesQ->sum('amount');
        $unpaid = (float) $invoicesQ->sum('amount_due');

        $pdf = Pdf::loadView('finance.summary_report', [
            'revenue' => $revenue,
            'expenses' => $expenses,
            'net' => $revenue - $expenses,
            'unpaid' => $unpaid,
            'school' => ReportCardTemplate::get()['school'] ?? [],
            'school_year_id' => $sy,
            'from' => $from,
            'to' => $to,
            'generated_at' => now()->format('d/m/Y H:i'),
        ])->setPaper('a4');

        $name = 'rapport_finance_'.date('Y-m-d_His').'.pdf';

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$name.'"',
        ]);
    }
}

