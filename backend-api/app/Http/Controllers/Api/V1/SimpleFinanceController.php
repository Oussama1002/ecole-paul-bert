<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SimpleFinance\ExportSimpleFinanceCsvRequest;
use App\Http\Requests\Api\V1\SimpleFinance\IndexSimpleFinanceJournalRequest;
use App\Http\Requests\Api\V1\SimpleFinance\SimpleFinanceSummaryRequest;
use App\Http\Requests\Api\V1\SimpleFinance\StoreSimpleFinanceEntryRequest;
use App\Http\Requests\Api\V1\SimpleFinance\UpdateSimpleFinanceEntryRequest;
use App\Http\Responses\ApiResponse;
use App\Models\FinanceJournalEntry;
use App\Models\Invoice;
use App\Services\AuditLogger;
use App\Services\DocumentStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Simple finance journal — a daily ledger of income/expense rows.
 *
 * Exists alongside the advanced finance module (payments, expenses, fee
 * assignments, invoices). It does NOT write to those tables and is not
 * aggregated in advanced reports. The director uses this like a notebook.
 */
class SimpleFinanceController extends Controller
{
    public function __construct(
        private AuditLogger $audit,
        private DocumentStorageService $docStorage,
    ) {}

    public function index(IndexSimpleFinanceJournalRequest $request): JsonResponse
    {
        $data = $request->validated();

        $q = FinanceJournalEntry::query()->orderByDesc('entry_date')->orderByDesc('id');

        if (! empty($data['include_deleted'])) {
            $q->withTrashed();
        }

        if (! empty($data['month'])) {
            [$y, $m] = explode('-', $data['month']);
            $start = Carbon::create((int) $y, (int) $m, 1)->startOfMonth();
            $end = (clone $start)->endOfMonth();
            $q->whereBetween('entry_date', [$start->toDateString(), $end->toDateString()]);
        } else {
            if (! empty($data['from'])) $q->whereDate('entry_date', '>=', $data['from']);
            if (! empty($data['to'])) $q->whereDate('entry_date', '<=', $data['to']);
        }

        if (! empty($data['entry_type'])) $q->where('entry_type', $data['entry_type']);
        if (! empty($data['cost_type'])) $q->where('cost_type', $data['cost_type']);

        $paginated = $q->paginate($data['per_page'] ?? 50);
        $hasCategory = $this->supportsCategoryColumn();
        $hasAttachment = $this->supportsAttachmentColumns();

        return ApiResponse::success([
            'items' => collect($paginated->items())->map(fn (FinanceJournalEntry $e) => [
                'id' => $e->id,
                'entry_date' => $e->entry_date?->format('Y-m-d'),
                'entry_type' => $e->entry_type,
                'cost_type' => $e->cost_type,
                'category' => $hasCategory ? $e->category : null,
                'label' => $e->label,
                'amount' => (string) $e->amount,
                'note' => $e->note,
                'attachment_name' => $hasAttachment ? $e->attachment_name : null,
                'has_attachment' => $hasAttachment ? ! empty($e->attachment_path) : false,
                'created_by' => $e->created_by,
                'deleted_at' => $e->deleted_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ], 'Journal financier.');
    }

    public function store(StoreSimpleFinanceEntryRequest $request): JsonResponse
    {
        $data = $request->validated();
        $payload = [
            'entry_date' => $data['entry_date'],
            'entry_type' => $data['entry_type'],
            'cost_type' => $data['entry_type'] === 'expense' ? ($data['cost_type'] ?? null) : null,
            'label' => $data['label'],
            'amount' => $data['amount'],
            'note' => $data['note'] ?? null,
            'created_by' => $request->user()?->id,
        ];
        if ($this->supportsCategoryColumn()) {
            $payload['category'] = $data['category'] ?? null;
        }

        $entry = FinanceJournalEntry::create($payload);
        $this->replaceAttachmentFromRequest($request, $entry);

        $this->audit->log(
            $request->user(),
            'simple_finance.entry.created',
            $entry,
            null,
            $entry->only(['entry_date', 'entry_type', 'cost_type', 'category', 'label', 'amount'])
        );

        return ApiResponse::success($entry, 'Écriture ajoutée.');
    }

    public function update(UpdateSimpleFinanceEntryRequest $request, FinanceJournalEntry $entry): JsonResponse
    {
        $data = $request->validated();

        if (isset($data['entry_type']) && $data['entry_type'] === 'income') {
            $data['cost_type'] = null;
        }
        if (! $this->supportsCategoryColumn()) {
            unset($data['category']);
        }

        $before = $entry->only(['entry_date', 'entry_type', 'cost_type', 'label', 'amount', 'note']);
        $entry->update($data);
        $this->replaceAttachmentFromRequest($request, $entry);

        $this->audit->log(
            $request->user(),
            'simple_finance.entry.updated',
            $entry,
            $before,
            $entry->only(['entry_date', 'entry_type', 'cost_type', 'category', 'label', 'amount', 'note'])
        );

        return ApiResponse::success($entry->fresh(), 'Écriture mise à jour.');
    }

    public function destroy(Request $request, FinanceJournalEntry $entry): JsonResponse
    {
        $entry->delete();

        $this->audit->log(
            $request->user(),
            'simple_finance.entry.deleted',
            $entry,
            $entry->only(['entry_date', 'entry_type', 'label', 'amount']),
            null
        );

        return ApiResponse::success(null, 'Écriture supprimée.');
    }

    public function downloadAttachment(FinanceJournalEntry $entry): StreamedResponse|JsonResponse
    {
        if (! $this->supportsAttachmentColumns()) {
            return ApiResponse::error('Pièces jointes non disponibles sur ce schéma.', [], 422);
        }
        if (empty($entry->attachment_path) || ! Storage::disk('local')->exists($entry->attachment_path)) {
            return ApiResponse::error('Aucune pièce jointe sur cette écriture.', [], 404);
        }

        return Storage::disk('local')->download(
            $entry->attachment_path,
            $entry->attachment_name ?: basename($entry->attachment_path)
        );
    }

    /**
     * Monthly + global totals.
     * GET /v1/simple/finance/summary?month=YYYY-MM
     */
    public function summary(SimpleFinanceSummaryRequest $request): JsonResponse
    {
        $data = $request->validated();

        $month = $data['month'] ?? Carbon::now()->format('Y-m');
        [$y, $m] = explode('-', $month);
        $start = Carbon::create((int) $y, (int) $m, 1)->startOfMonth();
        $end = (clone $start)->endOfMonth();

        $monthRows = FinanceJournalEntry::query()
            ->whereBetween('entry_date', [$start->toDateString(), $end->toDateString()])
            ->get(['entry_type', 'cost_type', 'amount']);

        $monthTotals = $this->bucketize($monthRows);

        $yearStart = Carbon::create((int) $y, 1, 1)->startOfYear();
        $yearEnd = (clone $yearStart)->endOfYear();
        $yearRows = FinanceJournalEntry::query()
            ->whereBetween('entry_date', [$yearStart->toDateString(), $yearEnd->toDateString()])
            ->get(['entry_type', 'cost_type', 'amount']);
        $yearTotals = $this->bucketize($yearRows);

        $globalRows = FinanceJournalEntry::query()
            ->get(['entry_type', 'cost_type', 'amount']);

        $globalTotals = $this->bucketize($globalRows);
        $unpaidQuery = Invoice::query()
            ->whereIn('status', ['issued', 'partial'])
            ->whereRaw('total_amount > amount_paid');
        $unpaidInvoiceCount = (clone $unpaidQuery)->count();
        $unpaidAmount = (float) (clone $unpaidQuery)->selectRaw('COALESCE(SUM(total_amount - amount_paid), 0) as due')->value('due');

        return ApiResponse::success([
            'month' => $month,
            'month_totals' => $monthTotals,
            'year' => (int) $y,
            'year_totals' => $yearTotals,
            'global_totals' => $globalTotals,
            'invoice_unpaid' => [
                'count' => (int) $unpaidInvoiceCount,
                'amount' => round($unpaidAmount, 2),
            ],
        ], 'Totaux du journal.');
    }

    /**
     * Bilan simplifié depuis le journal — totaux revenus/dépenses pour une période.
     * GET /v1/simple/finance/bilan?period_type=monthly|yearly|custom&date_from=&date_to=
     */
    public function bilan(Request $request): JsonResponse
    {
        $periodType = $request->input('period_type', 'monthly');
        $today = Carbon::today();

        if ($periodType === 'yearly') {
            $ref = $request->filled('date_from') ? Carbon::parse($request->input('date_from')) : $today;
            $dateFrom = $ref->copy()->startOfYear();
            $dateTo = $ref->copy()->endOfYear();
        } elseif ($periodType === 'custom') {
            $dateFrom = $request->filled('date_from') ? Carbon::parse($request->input('date_from'))->startOfDay() : $today->copy()->startOfMonth();
            $dateTo = $request->filled('date_to') ? Carbon::parse($request->input('date_to'))->endOfDay() : $today->copy()->endOfMonth();
        } else {
            $ref = $request->filled('date_from') ? Carbon::parse($request->input('date_from')) : $today;
            $dateFrom = $ref->copy()->startOfMonth();
            $dateTo = $ref->copy()->endOfMonth();
        }

        $rows = FinanceJournalEntry::query()
            ->whereBetween('entry_date', [$dateFrom->toDateString(), $dateTo->toDateString()])
            ->get(['entry_type', 'cost_type', 'category', 'label', 'amount']);

        $totals = $this->bucketize($rows);

        $year = (int) $dateFrom->year;
        $monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

        $monthlyIncome = FinanceJournalEntry::query()
            ->where('entry_type', 'income')
            ->whereYear('entry_date', $year)
            ->selectRaw('MONTH(entry_date) as m, SUM(amount) as total')
            ->groupBy('m')
            ->pluck('total', 'm');

        $monthlyExpense = FinanceJournalEntry::query()
            ->where('entry_type', 'expense')
            ->whereYear('entry_date', $year)
            ->selectRaw('MONTH(entry_date) as m, SUM(amount) as total')
            ->groupBy('m')
            ->pluck('total', 'm');

        $monthlyEvolution = [];
        for ($i = 1; $i <= 12; $i++) {
            $inc = (float) ($monthlyIncome[$i] ?? 0);
            $exp = (float) ($monthlyExpense[$i] ?? 0);
            $monthlyEvolution[] = [
                'month' => $i,
                'month_label' => $monthNames[$i - 1],
                'income' => round($inc, 2),
                'expenses' => round($exp, 2),
                'net_balance' => round($inc - $exp, 2),
            ];
        }

        return ApiResponse::success([
            'source' => 'journal',
            'period' => [
                'type' => $periodType,
                'date_from' => $dateFrom->toDateString(),
                'date_to' => $dateTo->toDateString(),
                'label' => $dateFrom->format('d/m/Y').' - '.$dateTo->format('d/m/Y'),
            ],
            'summary' => [
                'total_income' => $totals['income'],
                'total_expenses' => $totals['total_expense'],
                'net_balance' => $totals['net'],
                'fixed_expense' => $totals['fixed_expense'],
                'variable_expense' => $totals['variable_expense'],
            ],
            'monthly_evolution' => $monthlyEvolution,
        ], 'Bilan du journal financier.');
    }

    public function exportCsv(ExportSimpleFinanceCsvRequest $request): StreamedResponse
    {
        $data = $request->validated();

        $q = FinanceJournalEntry::query()->orderByDesc('entry_date')->orderByDesc('id');
        if (! empty($data['month'])) {
            [$y, $m] = explode('-', $data['month']);
            $start = Carbon::create((int) $y, (int) $m, 1)->startOfMonth();
            $end = (clone $start)->endOfMonth();
            $q->whereBetween('entry_date', [$start->toDateString(), $end->toDateString()]);
        } else {
            if (! empty($data['from'])) $q->whereDate('entry_date', '>=', $data['from']);
            if (! empty($data['to'])) $q->whereDate('entry_date', '<=', $data['to']);
        }
        if (! empty($data['entry_type'])) $q->where('entry_type', $data['entry_type']);
        if (! empty($data['cost_type'])) $q->where('cost_type', $data['cost_type']);

        $columns = ['entry_date', 'entry_type', 'cost_type', 'label', 'amount', 'note'];
        if ($this->supportsCategoryColumn()) {
            $columns[] = 'category';
        }
        if ($this->supportsAttachmentColumns()) {
            $columns[] = 'attachment_name';
        }
        $rows = $q->get($columns);
        $filename = 'journal_finance_'.Carbon::now()->format('Ymd_His').'.csv';

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            // UTF-8 BOM for Excel-friendly accents (é, è, à, ç).
            fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($out, ['date', 'type', 'cout', 'categorie', 'libelle', 'montant', 'description', 'piece_jointe'], ';');
            foreach ($rows as $row) {
                fputcsv($out, [
                    $row->entry_date?->format('d/m/Y'),
                    $row->entry_type,
                    $row->cost_type ?? '',
                    $row->category ?? '',
                    $row->label,
                    (string) $row->amount,
                    $row->note ?? '',
                    $row->attachment_name ?? '',
                ], ';');
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** @param \Illuminate\Support\Collection<int, FinanceJournalEntry> $rows */
    private function bucketize($rows): array
    {
        $income = 0.0;
        $fixed = 0.0;
        $variable = 0.0;
        $otherExpense = 0.0;

        foreach ($rows as $r) {
            $amt = (float) $r->amount;
            if ($r->entry_type === 'income') {
                $income += $amt;
            } else {
                if ($r->cost_type === 'fixed') $fixed += $amt;
                elseif ($r->cost_type === 'variable') $variable += $amt;
                else $otherExpense += $amt;
            }
        }

        $totalExpense = $fixed + $variable + $otherExpense;
        return [
            'income' => round($income, 2),
            'fixed_expense' => round($fixed, 2),
            'variable_expense' => round($variable, 2),
            'other_expense' => round($otherExpense, 2),
            'total_expense' => round($totalExpense, 2),
            'net' => round($income - $totalExpense, 2),
        ];
    }

    private function replaceAttachmentFromRequest(Request $request, FinanceJournalEntry $entry): void
    {
        if (! $this->supportsAttachmentColumns()) {
            return;
        }
        if (! $request->hasFile('attachment')) {
            return;
        }

        $file = $request->file('attachment');
        if (! $file) {
            return;
        }

        $this->docStorage->validateFile($file);

        if (! empty($entry->attachment_path) && Storage::disk('local')->exists($entry->attachment_path)) {
            Storage::disk('local')->delete($entry->attachment_path);
        }

        $storedPath = $file->store('finance-journal-attachments', 'local');
        $entry->attachment_path = $storedPath;
        $entry->attachment_name = $file->getClientOriginalName();
        $entry->attachment_mime = $file->getMimeType();
        $entry->attachment_size = $file->getSize();
        $entry->save();
    }

    private function supportsCategoryColumn(): bool
    {
        return Schema::hasColumn('finance_journal_entries', 'category');
    }

    private function supportsAttachmentColumns(): bool
    {
        return Schema::hasColumn('finance_journal_entries', 'attachment_path')
            && Schema::hasColumn('finance_journal_entries', 'attachment_name');
    }
}
